package de.restockoffice;

import io.quarkus.security.Authenticated;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaDelete;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.CriteriaUpdate;
import jakarta.persistence.criteria.Root;
import jakarta.transaction.Status;
import jakarta.transaction.Synchronization;
import jakarta.transaction.Transactional;
import jakarta.transaction.TransactionSynchronizationRegistry;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;

import java.util.List;

import jakarta.ws.rs.client.Client;
import jakarta.ws.rs.client.ClientBuilder;
import jakarta.ws.rs.client.Entity;
import jakarta.ws.rs.ProcessingException;
import jakarta.ws.rs.core.Response;

import java.util.LinkedHashMap;
import java.util.Map;

import jakarta.inject.Inject;
import io.quarkus.security.identity.SecurityIdentity;
import io.quarkus.runtime.annotations.RegisterForReflection;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.jboss.logging.Logger;


@Path("/orders")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class OrderResource {
    private static final Logger LOG = Logger.getLogger(OrderResource.class);
    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String CUSTOMER_ID = "customerId";
    private static final String OLD_CUSTOMER_ID = "oldCustomerId";
    private static final String NEW_CUSTOMER_ID = "newCustomerId";
    private static final String PROCESS_VARIABLE_VALUE = "value";
    private static final String PROCESS_VARIABLE_TYPE = "type";
    private static final String PROCESS_VARIABLE_STRING = "String";
    private static final String PROCESS_VARIABLE_LONG = "Long";
    private static final String PROCESS_VARIABLE_INTEGER = "Integer";
    private static final String ACTIVE_STATUS = "ACTIVE";

    private final SecurityIdentity securityIdentity;
    private final JsonWebToken jwt;
    private final EntityManager entityManager;

    @ConfigProperty(name = "processengine.abo-confirmation-start-url", defaultValue = "https://pe.restockoffice.de/api/abo-confirmation-process/change")
    String aboConfirmationProcessStartUrl;

    @ConfigProperty(name = "processengine.abo-confirmation-window-duration", defaultValue = "PT10M")
    String aboConfirmationWindowDuration;

    @ConfigProperty(name = "usersservice.base-url", defaultValue = "https://users.restockoffice.de")
    String usersServiceBaseUrl;

    @ConfigProperty(name = "deliveriesservice.base-url", defaultValue = "https://restocker-deliveries.restockoffice.de")
    String deliveriesServiceBaseUrl;

    private final TransactionSynchronizationRegistry transactionSynchronizationRegistry;

    @Context
    HttpHeaders headers;

    @Inject
    public OrderResource(
            SecurityIdentity securityIdentity,
            JsonWebToken jwt,
            EntityManager entityManager,
            TransactionSynchronizationRegistry transactionSynchronizationRegistry
    ) {
        this.securityIdentity = securityIdentity;
        this.jwt = jwt;
        this.entityManager = entityManager;
        this.transactionSynchronizationRegistry = transactionSynchronizationRegistry;
    }

    @GET
    public List<Order> getAll() {
        if (securityIdentity == null || securityIdentity.isAnonymous()) {
            throw new NotAuthorizedException("Nicht autorisiert");
        }

        return findAllOrders();
    }

    @GET
    @Path("/active")
    public List<Order> getActiveOrders() {
        return findOrdersByStatus(ACTIVE_STATUS);
    }

    @GET
    @Path("/delivery/{id}")
    public Order getByIdForDelivery(@PathParam("id") Long id) {
        Order order = findOrderById(id);
        if (order == null) {
            throw new NotFoundException("Order nicht gefunden: " + id);
        }

        return order;
    }

    //==== Get a certain order ==== //
    @GET
    @Path("/{id}")
    public Order getById(@PathParam("id") Long id) {
        if (securityIdentity == null || securityIdentity.isAnonymous()) {
            throw new NotAuthorizedException("Nicht autorisiert");
        } else {
            return findOrderById(id);
        }
    }

    //==== Get all orders from certain customer ==== //
    @GET
    @Path("/my")
    @Authenticated
    public List<Order> getMyOrders() {
        return findOrdersByCustomerId(resolveCustomerId());
    }

    private List<Order> findAllOrders() {
        CriteriaBuilder builder = entityManager.getCriteriaBuilder();
        CriteriaQuery<Order> query = builder.createQuery(Order.class);
        Root<Order> root = query.from(Order.class);
        query.select(root);
        return entityManager.createQuery(query).getResultList();
    }

    private List<Order> findOrdersByStatus(String status) {
        CriteriaBuilder builder = entityManager.getCriteriaBuilder();
        CriteriaQuery<Order> query = builder.createQuery(Order.class);
        Root<Order> root = query.from(Order.class);
        query.select(root).where(builder.equal(root.get("status"), status));
        return entityManager.createQuery(query).getResultList();
    }

    private List<Order> findOrdersByCustomerId(String customerId) {
        CriteriaBuilder builder = entityManager.getCriteriaBuilder();
        CriteriaQuery<Order> query = builder.createQuery(Order.class);
        Root<Order> root = query.from(Order.class);
        query.select(root).where(builder.equal(root.get(CUSTOMER_ID), customerId));
        return entityManager.createQuery(query).getResultList();
    }

    private Order findOrderById(Long id) {
        return entityManager.find(Order.class, id);
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Map<String, Object> deleteOrder(@PathParam("id") Long id) {
        Order order = findOrderById(id);
        if (order == null) {
            throw new NotFoundException("Order nicht gefunden: " + id);
        }

        entityManager.remove(order);

        return Map.of("id", id, "deleted", true);
    }

    @DELETE
    @Transactional
    public Map<String, Object> deleteAllOrders() {
        CriteriaBuilder builder = entityManager.getCriteriaBuilder();
        CriteriaDelete<Order> delete = builder.createCriteriaDelete(Order.class);
        delete.from(Order.class);
        long deleted = entityManager.createQuery(delete).executeUpdate();

        return Map.of("deleted", deleted);
    }

    @PUT
    @Path("/admin/customer-id")
    @Transactional
    public Map<String, Object> replaceCustomerId(Map<String, String> request) {
        String oldCustomerId = normalizeRequiredCustomerId(request.get(OLD_CUSTOMER_ID), OLD_CUSTOMER_ID);
        String newCustomerId = normalizeRequiredCustomerId(request.get(NEW_CUSTOMER_ID), NEW_CUSTOMER_ID);

        CriteriaBuilder builder = entityManager.getCriteriaBuilder();
        CriteriaUpdate<Order> update = builder.createCriteriaUpdate(Order.class);
        var root = update.from(Order.class);
        update.set(CUSTOMER_ID, newCustomerId);
        update.where(builder.equal(root.get(CUSTOMER_ID), oldCustomerId));
        long updated = entityManager.createQuery(update).executeUpdate();

        return Map.of(OLD_CUSTOMER_ID, oldCustomerId, NEW_CUSTOMER_ID, newCustomerId, "updated", updated);
    }


    //==== Update-Endpoint ==== //
    @PUT
    @Path("/{id}")
    @Transactional
    public Order updateOrder(@PathParam("id") Long id, Order input) {
        Order order = findOrderById(id);
        if (order == null) {
            throw new NotFoundException("Order nicht gefunden: " + id);
        }
        order.status = input.status != null && !input.status.isBlank() ? input.status : order.status;
        order.quantity = input.quantity;
        order.interval = input.interval;
        order.setUpdatedAt(Order.currentTimestamp());

        // Camunda Prozess mit Token starten
        String authHeader = headers.getHeaderString(AUTHORIZATION_HEADER);
        Map<String, Object> variables = processVariables(order, authHeader);
        variables.put("updatedAt", stringProcessVariable(order.getUpdatedAt().toString()));
        variables.put("changeType", stringProcessVariable("CANCELLED".equalsIgnoreCase(order.status) ? "CANCELLED" : "UPDATED"));

        startAboConfirmationProcess(order, authHeader, variables);
        scheduleCustomerDeliveryReplanAfterCommit(order.customerId, authHeader);

        return order;
    }

    @POST
    @Transactional
    public Order order(Order input) {
        String customerId = resolveCustomerId();
        LOG.infof("Creating order for customer %s", customerId);

        Order order = Order.order(
                customerId,
                input.productId,
                input.status,
                input.quantity,
                input.interval
        );
        order.persist();
        LOG.infof("Order persisted: id=%s", order.id);

        // Camunda Prozess mit Token starten
        String authHeader = headers.getHeaderString(AUTHORIZATION_HEADER);
        Map<String, Object> variables = processVariables(order, authHeader);
        variables.put("changeType", stringProcessVariable("CREATED"));
        startAboConfirmationProcess(order, authHeader, variables);
        scheduleCustomerDeliveryReplanAfterCommit(order.customerId, authHeader);

        return order;
    }

    private void scheduleCustomerDeliveryReplanAfterCommit(String customerId, String authHeader) {
        if (customerId == null || customerId.isBlank()) {
            return;
        }

        transactionSynchronizationRegistry.registerInterposedSynchronization(new Synchronization() {
            @Override
            public void beforeCompletion() {
                // Replanning must only run after a successful commit, so there is nothing to do before completion.
            }

            @Override
            public void afterCompletion(int status) {
                if (status == Status.STATUS_COMMITTED) {
                    triggerCustomerDeliveryReplan(customerId, authHeader);
                }
            }
        });
    }

    private void triggerCustomerDeliveryReplan(String customerId, String authHeader) {
        try (Client client = ClientBuilder.newClient()) {
            String url = trimTrailingSlash(deliveriesServiceBaseUrl)
                    + "/api/deliveries/customers/"
                    + java.net.URLEncoder.encode(customerId.trim(), java.nio.charset.StandardCharsets.UTF_8)
                    + "/replan";
            var request = client.target(url).request(MediaType.APPLICATION_JSON);
            if (authHeader != null && !authHeader.isBlank()) {
                request.header(AUTHORIZATION_HEADER, authHeader);
            }

            try (Response response = request.post(Entity.json(Map.of()))) {
                if (response.getStatusInfo().getFamily() != Response.Status.Family.SUCCESSFUL) {
                    String responseBody = response.hasEntity() ? response.readEntity(String.class) : "";
                    LOG.errorf("Delivery replan failed for customer %s: HTTP %s body=%s", customerId, response.getStatus(), responseBody);
                }
            }
        } catch (RuntimeException exception) {
            LOG.errorf(exception, "Delivery replan request failed for customer %s", customerId);
        }
    }

    private void startAboConfirmationProcess(Order order, String authHeader, Map<String, Object> variables) {
        try (Client client = ClientBuilder.newClient()) {
            String businessKey = processVariableString(variables, CUSTOMER_ID, order.customerId);
            Map<String, Object> body = Map.of("businessKey", businessKey, "variables", variables);

            LOG.infof("Starting abo confirmation process at %s", aboConfirmationProcessStartUrl);
            var request = client.target(aboConfirmationProcessStartUrl).request(MediaType.APPLICATION_JSON);
            if (authHeader != null && !authHeader.isBlank()) {
                request.header(AUTHORIZATION_HEADER, authHeader);
            }

            try (Response response = request.post(Entity.json(body))) {
                if (response.getStatusInfo().getFamily() != Response.Status.Family.SUCCESSFUL) {
                    String responseBody = response.hasEntity() ? response.readEntity(String.class) : "";
                    LOG.errorf("AboConfirmationProcess failed: HTTP %s from %s body=%s", response.getStatus(), aboConfirmationProcessStartUrl, responseBody);
                    throw new WebApplicationException("AboConfirmationProcess konnte nicht gestartet werden (HTTP " + response.getStatus() + ").", Response.Status.BAD_GATEWAY);
                }
            }
        } catch (ProcessingException exception) {
            LOG.errorf(exception, "AboConfirmationProcess request failed at %s", aboConfirmationProcessStartUrl);
            throw new WebApplicationException("AboConfirmationProcess konnte nicht erreicht werden.", exception, Response.Status.BAD_GATEWAY);
        }
    }

    private String normalizeRequiredCustomerId(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException(fieldName + " fehlt.");
        }

        return value.trim();
    }

    private Map<String, Object> processVariables(Order order, String authHeader) {
        Map<String, Object> variables = new LinkedHashMap<>();
        String customerId = resolveProcessCustomerId(order);

        addOrderProcessVariables(variables, order, customerId);
        addAuthorizationHeaderVariable(variables, authHeader);
        addCustomerProfileVariables(variables, customerId, authHeader);
        addTokenProfileVariables(variables, order);

        return variables;
    }

    private String resolveProcessCustomerId(Order order) {
        return firstNonBlank(tokenClaim("sub"), order.customerId);
    }

    private void addOrderProcessVariables(Map<String, Object> variables, Order order, String customerId) {
        variables.put("orderId", processVariable(order.id, PROCESS_VARIABLE_LONG));
        variables.put("orderIdsCsv", stringProcessVariable(String.valueOf(order.id)));
        variables.put("aboConfirmationWindowDuration", stringProcessVariable(aboConfirmationWindowDuration));
        variables.put(CUSTOMER_ID, stringProcessVariable(customerId));
        variables.put("productId", stringProcessVariable(order.productId));
        variables.put("status", stringProcessVariable(order.status));
        variables.put("quantity", processVariable(order.quantity, PROCESS_VARIABLE_INTEGER));
        variables.put("interval", processVariable(order.interval, PROCESS_VARIABLE_INTEGER));
    }

    private void addAuthorizationHeaderVariable(Map<String, Object> variables, String authHeader) {
        if (authHeader != null && !authHeader.isBlank()) {
            variables.put("authorizationHeader", stringProcessVariable(authHeader));
        }
    }

    private void addCustomerProfileVariables(
            Map<String, Object> variables,
            String customerId,
            String authHeader
    ) {
        CustomerMailProfile customer = loadCustomerProfile(customerId, authHeader);
        if (customer == null) {
            return;
        }

        putStringVariableIfPresent(
                variables,
                "deliveryDay",
                customer.getDeliveryDay()
        );
        putStringVariableIfPresent(
                variables,
                "deliveryWindow",
                formatDeliveryWindow(customer.getDeliveryTime())
        );
        putStringVariableIfPresent(
                variables,
                "deliveryLocation",
                formatDeliveryLocation(customer)
        );
    }

    private void addTokenProfileVariables(Map<String, Object> variables, Order order) {
        putStringVariableIfPresent(variables, "recipientEmail", tokenClaim("email"));
        putStringVariableIfPresent(
                variables,
                "customerName",
                firstNonBlank(tokenClaim("name"), tokenClaim("preferred_username"), order.customerId)
        );
    }

    private void putStringVariableIfPresent(
            Map<String, Object> variables,
            String name,
            String value
    ) {
        if (value != null) {
            variables.put(name, stringProcessVariable(value));
        }
    }

    private Map<String, Object> stringProcessVariable(Object value) {
        return processVariable(value, PROCESS_VARIABLE_STRING);
    }

    private Map<String, Object> processVariable(Object value, String type) {
        return Map.of(PROCESS_VARIABLE_VALUE, value, PROCESS_VARIABLE_TYPE, type);
    }

    private CustomerMailProfile loadCustomerProfile(String customerId, String authHeader) {
        if (customerId == null || customerId.isBlank() || authHeader == null || authHeader.isBlank()) {
            return null;
        }

        try (Client client = ClientBuilder.newClient()) {
            CustomerMailProfile customer = loadCustomerProfileFromPath(client, "customer", customerId, authHeader);
            if (customer == null) {
                customer = loadCustomerProfileFromPath(client, "customer/me", null, authHeader);
            }
            if (customer == null) {
                LOG.errorf("Customer profile enrichment failed for customer %s", customerId);
            }
            return customer;
        } catch (ProcessingException exception) {
            LOG.error("Customer profile enrichment request failed", exception);
            return null;
        }
    }

    private CustomerMailProfile loadCustomerProfileFromPath(
            Client client,
            String path,
            String customerId,
            String authHeader
    ) {
        var request = client.target(trimTrailingSlash(usersServiceBaseUrl))
                .path(path);
        if (customerId != null && !customerId.isBlank()) {
            request = request.queryParam("userId", customerId);
        }

        try (Response response = request
                .request(MediaType.APPLICATION_JSON)
                .header(AUTHORIZATION_HEADER, authHeader)
                .get()) {
            if (response.getStatusInfo().getFamily() != Response.Status.Family.SUCCESSFUL) {
                return null;
            }

            return response.readEntity(CustomerMailProfile.class);
        }
    }

    private String formatDeliveryWindow(Object deliveryTime) {
        if (deliveryTime == null || String.valueOf(deliveryTime).isBlank()) {
            return null;
        }

        String normalized = String.valueOf(deliveryTime).trim();
        if (normalized.toLowerCase().contains("uhr") || normalized.contains("-") || normalized.toLowerCase().contains("bis")) {
            return normalized;
        }

        if (normalized.matches("\\d{1,2}")) {
            return String.format("%02d:00 Uhr", Integer.parseInt(normalized));
        }

        if (normalized.matches("\\d{1,2}:\\d{2}")) {
            return normalized + " Uhr";
        }

        return normalized;
    }

    private String formatDeliveryLocation(CustomerMailProfile customer) {
        if (customer == null) {
            return null;
        }

        String streetLine = joinWithSpace(customer.getStreet(), customer.getHouseNumber());
        String cityLine = joinWithSpace(customer.getPostalCode(), customer.getCity());
        return firstNonBlank(joinWithComma(streetLine, cityLine), customer.getCompanyName());
    }

    private String joinWithSpace(String... values) {
        StringBuilder builder = new StringBuilder();
        for (String value : values) {
            if (value == null || value.isBlank()) {
                continue;
            }
            if (!builder.isEmpty()) {
                builder.append(' ');
            }
            builder.append(value.trim());
        }
        return builder.toString();
    }

    private String joinWithComma(String... values) {
        StringBuilder builder = new StringBuilder();
        for (String value : values) {
            if (value == null || value.isBlank()) {
                continue;
            }
            if (!builder.isEmpty()) {
                builder.append(", ");
            }
            builder.append(value.trim());
        }
        return builder.toString();
    }

    private String trimTrailingSlash(String value) {
        if (value == null || !value.endsWith("/")) {
            return value;
        }

        return value.substring(0, value.length() - 1);
    }

    private String processVariableString(Map<String, Object> variables, String variableName, String fallback) {
        Object variable = variables.get(variableName);
        if (variable instanceof Map<?, ?> typedVariable) {
            Object value = typedVariable.get(PROCESS_VARIABLE_VALUE);
            if (value != null && !String.valueOf(value).isBlank()) {
                return String.valueOf(value).trim();
            }
        }

        return fallback;
    }

    private String tokenClaim(String claimName) {
        if (jwt == null) {
            return null;
        }

        Object claim = jwt.getClaim(claimName);
        if (claim == null) {
            return null;
        }

        String value = String.valueOf(claim).trim();
        return value.isBlank() ? null : value;
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }

        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }

        return null;
    }

    private String resolveCustomerId() {
        String subjectClaim = tokenClaim("sub");
        if (subjectClaim != null) {
            return subjectClaim;
        }

        if (securityIdentity != null && securityIdentity.getPrincipal() != null) {
            return securityIdentity.getPrincipal().getName();
        }

        return "anonymous";
    }

    @RegisterForReflection
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CustomerMailProfile {
        private String postalCode;
        private String city;
        private String street;
        private String houseNumber;
        private String companyName;
        private String deliveryDay;
        private Object deliveryTime;

        public String getPostalCode() {
            return postalCode;
        }

        public void setPostalCode(String postalCode) {
            this.postalCode = postalCode;
        }

        public String getCity() {
            return city;
        }

        public void setCity(String city) {
            this.city = city;
        }

        public String getStreet() {
            return street;
        }

        public void setStreet(String street) {
            this.street = street;
        }

        public String getHouseNumber() {
            return houseNumber;
        }

        public void setHouseNumber(String houseNumber) {
            this.houseNumber = houseNumber;
        }

        public String getCompanyName() {
            return companyName;
        }

        public void setCompanyName(String companyName) {
            this.companyName = companyName;
        }

        public String getDeliveryDay() {
            return deliveryDay;
        }

        public void setDeliveryDay(String deliveryDay) {
            this.deliveryDay = deliveryDay;
        }

        public Object getDeliveryTime() {
            return deliveryTime;
        }

        public void setDeliveryTime(Object deliveryTime) {
            this.deliveryTime = deliveryTime;
        }
    }
}
