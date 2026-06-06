package org.acme;

import io.quarkus.security.Authenticated;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import java.time.LocalDateTime;
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


@Path("/orders")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
//@RolesAllowed("camunda-admin") admin || user
@Authenticated
public class OrderResource {
    @Inject
    SecurityIdentity securityIdentity;

    @Inject
    JsonWebToken jwt;

    @ConfigProperty(
            name = "processengine.abo-confirmation-start-url",
            defaultValue = "https://pe.restockoffice.de/api/abo-confirmation-process/change"
    )
    String aboConfirmationProcessStartUrl;

    @ConfigProperty(name = "processengine.abo-confirmation-window-duration", defaultValue = "PT10M")
    String aboConfirmationWindowDuration;

    @ConfigProperty(name = "usersservice.base-url", defaultValue = "https://users.restockoffice.de")
    String usersServiceBaseUrl;

    @Context
    HttpHeaders headers;

    @GET
    public List<Order> getAll() {
        if (securityIdentity == null || securityIdentity.isAnonymous()) {
            throw new NotAuthorizedException("Nicht autorisiert");
        }else{
            System.out.println("👤 GET /orders REQUESTED BY: " + securityIdentity.getPrincipal().getName());
            return Order.listAll();
        }
    }

    @GET
    @Path("/active")
    public List<Order> getActiveOrders() {
        return Order.list("status", "ACTIVE");
    }

    @GET
    @Path("/delivery/{id}")
    public Order getByIdForDelivery(@PathParam("id") Long id) {
        Order order = Order.findById(id);
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
        }else{
            return Order.findById(id);
        }
    }
    //==== Get all orders from certain customer ==== //
    @GET
    @Path("/my")
    @Authenticated
    public List<Order> getMyOrders() {
        return Order.list("customerId", resolveCustomerId());
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Map<String, Object> deleteOrder(@PathParam("id") Long id) {
        boolean deleted = Order.deleteById(id);
        if (!deleted) {
            throw new NotFoundException("Order nicht gefunden: " + id);
        }

        return Map.of(
                "id", id,
                "deleted", true
        );
    }

    @DELETE
    @Transactional
    public Map<String, Object> deleteAllOrders() {
        long deleted = Order.deleteAll();

        return Map.of(
                "deleted", deleted
        );
    }

    @PUT
    @Path("/admin/customer-id")
    @Transactional
    public Map<String, Object> replaceCustomerId(Map<String, String> request) {
        String oldCustomerId = normalizeRequiredCustomerId(request.get("oldCustomerId"), "oldCustomerId");
        String newCustomerId = normalizeRequiredCustomerId(request.get("newCustomerId"), "newCustomerId");

        long updated = Order.update(
                "customerId = ?1 where customerId = ?2",
                newCustomerId,
                oldCustomerId
        );

        return Map.of(
                "oldCustomerId", oldCustomerId,
                "newCustomerId", newCustomerId,
                "updated", updated
        );
    }


    //==== Update-Endpoint ==== //
    @PUT
    @Path("/{id}")
    @Transactional
    public Order updateOrder(@PathParam("id") Long id, Order input) {
        Order order = Order.findById(id);
        if (order == null) {
            throw new NotFoundException("Order nicht gefunden: " + id);
        }
        order.status = input.status != null && !input.status.isBlank() ? input.status : order.status;
        order.quantity = input.quantity;
        order.interval = input.interval;
        order.updatedAt = LocalDateTime.now();

        // Camunda Prozess mit Token starten
        String authHeader = headers.getHeaderString("Authorization");
        Map<String, Object> variables = processVariables(order, authHeader);
        variables.put("updatedAt", Map.of("value", order.updatedAt.toString(), "type", "String"));
        variables.put("changeType", Map.of(
                "value",
                "CANCELLED".equalsIgnoreCase(order.status) ? "CANCELLED" : "UPDATED",
                "type",
                "String"
        ));

        startAboConfirmationProcess(order, authHeader, variables);

        return order;
    }

    @POST
    @Transactional
    public Order order(Order input) {
        System.out.println("🚪 POST /orders ENTERED RESOURCE");
        try {
            System.out.println("👤 customerId: " + securityIdentity.getPrincipal().getName());
        } catch (Exception e) {
            System.out.println("❌ NO SECURITY IDENTITY (token issue?)");
        }
        String customerId = resolveCustomerId();
        System.out.println("resolved customerId: " + customerId);

        //System.out.println(jwt.getName());

        Order order = Order.order(
                customerId,
                input.productId,
                input.status,
                input.quantity,
                input.interval
        );
        System.out.println("⚙️ ORDER CREATED IN RESOURCE");
        order.persist();
        System.out.println("💾 ORDER PERSISTED: ID = " + order.id);

        // Camunda Prozess mit Token starten
        String authHeader = headers.getHeaderString("Authorization");
        Map<String, Object> variables = processVariables(order, authHeader);
        variables.put("changeType", Map.of("value", "CREATED", "type", "String"));
        startAboConfirmationProcess(order, authHeader, variables);

        return order;
    }

    private void startAboConfirmationProcess(
            Order order,
            String authHeader,
            Map<String, Object> variables
    ) {
        try (Client client = ClientBuilder.newClient()) {
            String businessKey = processVariableString(variables, "customerId", order.customerId);
            Map<String, Object> body = Map.of(
                    "businessKey", businessKey,
                    "variables", variables
            );

            System.out.println("Starting abo confirmation process at " + aboConfirmationProcessStartUrl);
            var request = client
                    .target(aboConfirmationProcessStartUrl)
                    .request(MediaType.APPLICATION_JSON);
            if (authHeader != null && !authHeader.isBlank()) {
                request.header("Authorization", authHeader);
            }

            try (Response response = request.post(Entity.json(body))) {
                if (response.getStatusInfo().getFamily() != Response.Status.Family.SUCCESSFUL) {
                    String responseBody = response.hasEntity() ? response.readEntity(String.class) : "";
                    System.out.println(
                            "AboConfirmationProcess failed: HTTP "
                                    + response.getStatus()
                                    + " from "
                                    + aboConfirmationProcessStartUrl
                                    + " body="
                                    + responseBody
                    );
                    throw new WebApplicationException(
                            "AboConfirmationProcess konnte nicht gestartet werden (HTTP "
                                    + response.getStatus()
                                    + ").",
                            Response.Status.BAD_GATEWAY
                    );
                }
            }
        } catch (ProcessingException exception) {
            System.out.println(
                    "AboConfirmationProcess request failed at "
                            + aboConfirmationProcessStartUrl
                            + ": "
                            + exception.getMessage()
            );
            throw new WebApplicationException(
                    "AboConfirmationProcess konnte nicht erreicht werden.",
                    exception,
                    Response.Status.BAD_GATEWAY
            );
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
        String customerId = firstNonBlank(tokenClaim("sub"), order.customerId);
        variables.put("orderId", Map.of("value", order.id, "type", "Long"));
        variables.put("orderIdsCsv", Map.of("value", String.valueOf(order.id), "type", "String"));
        variables.put("aboConfirmationWindowDuration", Map.of("value", aboConfirmationWindowDuration, "type", "String"));
        variables.put("customerId", Map.of("value", customerId, "type", "String"));
        variables.put("productId", Map.of("value", order.productId, "type", "String"));
        variables.put("status", Map.of("value", order.status, "type", "String"));
        variables.put("quantity", Map.of("value", order.quantity, "type", "Integer"));
        variables.put("interval", Map.of("value", order.interval, "type", "Integer"));

        if (authHeader != null && !authHeader.isBlank()) {
            variables.put("authorizationHeader", Map.of("value", authHeader, "type", "String"));
        }

        CustomerMailProfile customer = loadCustomerProfile(customerId, authHeader);
        if (customer != null) {
            String deliveryWindow = formatDeliveryWindow(customer.deliveryTime);
            String deliveryLocation = formatDeliveryLocation(customer);
            if (deliveryWindow != null) {
                variables.put("deliveryWindow", Map.of("value", deliveryWindow, "type", "String"));
            }
            if (deliveryLocation != null) {
                variables.put("deliveryLocation", Map.of("value", deliveryLocation, "type", "String"));
            }
        }

        String recipientEmail = tokenClaim("email");
        if (recipientEmail != null) {
            variables.put("recipientEmail", Map.of("value", recipientEmail, "type", "String"));
        }

        String customerName = firstNonBlank(tokenClaim("name"), tokenClaim("preferred_username"), order.customerId);
        if (customerName != null) {
            variables.put("customerName", Map.of("value", customerName, "type", "String"));
        }

        return variables;
    }

    private CustomerMailProfile loadCustomerProfile(String customerId, String authHeader) {
        if (customerId == null || customerId.isBlank() || authHeader == null || authHeader.isBlank()) {
            return null;
        }

        try (Client client = ClientBuilder.newClient()) {
            try (Response response = client
                    .target(trimTrailingSlash(usersServiceBaseUrl))
                    .path("customer")
                    .queryParam("userId", customerId)
                    .request(MediaType.APPLICATION_JSON)
                    .header("Authorization", authHeader)
                    .get()) {
                if (response.getStatusInfo().getFamily() != Response.Status.Family.SUCCESSFUL) {
                    String responseBody = response.hasEntity() ? response.readEntity(String.class) : "";
                    System.out.println(
                            "Customer profile enrichment failed: HTTP "
                                    + response.getStatus()
                                    + " body="
                                    + responseBody
                    );
                    return null;
                }

                return response.readEntity(CustomerMailProfile.class);
            }
        } catch (ProcessingException exception) {
            System.out.println("Customer profile enrichment request failed: " + exception.getMessage());
            return null;
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

        String streetLine = joinWithSpace(customer.street, customer.houseNumber);
        String cityLine = joinWithSpace(customer.postalCode, customer.city);
        return firstNonBlank(joinWithComma(streetLine, cityLine), customer.companyName);
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
            Object value = typedVariable.get("value");
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
        public String postalCode;
        public String city;
        public String street;
        public String houseNumber;
        public String companyName;
        public Object deliveryTime;
    }
}
