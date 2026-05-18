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
import java.util.Map;
import jakarta.inject.Inject;
import io.quarkus.security.identity.SecurityIdentity;


@Path("/orders")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
//@RolesAllowed("camunda-admin") admin || user
@Authenticated
public class OrderResource {
    @Inject
    SecurityIdentity securityIdentity;

    @Context
    HttpHeaders headers;

    String customerId = (securityIdentity != null &&
            securityIdentity.getPrincipal() != null)
            ? securityIdentity.getPrincipal().getName()
            : "anonymous";

    @GET
    public List<Order> getAll() {
        if (securityIdentity == null || securityIdentity.isAnonymous() || !customerId.equals(securityIdentity.getPrincipal().getName())) {
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
        if (securityIdentity == null || securityIdentity.isAnonymous() || !customerId.equals(securityIdentity.getPrincipal().getName())) {
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
        return Order.list("customerId", customerId);
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
        order.quantity = input.quantity;
        order.interval = input.interval;
        order.updatedAt = LocalDateTime.now();

        // Camunda Prozess mit Token starten
        String authHeader = headers.getHeaderString("Authorization");
        Client client = ClientBuilder.newClient();
        String camundaUrl =
                "https://pe.restockoffice.de/engine-rest/process-definition/key/Process_0ltcqh0/start";

        Map<String, Object> body = Map.of(
                "businessKey", order.id.toString(),
                "variables", Map.of(
                        "orderId", Map.of("value", order.id, "type", "Long"),
                        "customerId", Map.of("value", order.customerId, "type", "String"),
                        "productId", Map.of("value", order.productId, "type", "String"),
                        "quantity", Map.of("value", order.quantity, "type", "Integer"),
                        "interval", Map.of("value", order.interval, "type", "Integer"),
                        "updatedAt", Map.of("value", order.updatedAt.toString(), "type", "String")
                )
        );

        client
                .target(camundaUrl)
                .request(MediaType.APPLICATION_JSON)
                //.header("Authorization", "Bearer " + accessToken)
                //ist optional, da service öffentlich erreichbar ist, falls Authentifizierung in Camunda aktiviert ist, wird dann benötigt
                .header("Authorization", authHeader)
                .post(Entity.json(body));

        client.close();

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
        String customerId = (securityIdentity != null &&
                securityIdentity.getPrincipal() != null)
                ? securityIdentity.getPrincipal().getName()
                : "anonymous";

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

        Client client = ClientBuilder.newClient();
        String camundaUrl =
                "https://pe.restockoffice.de/engine-rest/process-definition/key/Process_0ltcqh0/start";

        Map<String, Object> body = Map.of(
                "businessKey", order.id.toString(),
                "variables", Map.of(
                        "orderId", Map.of("value", order.id, "type", "Long"),
                        "customerId", Map.of("value", order.customerId, "type", "String"),
                        "productId", Map.of("value", order.productId, "type", "String"),
                        "quantity", Map.of("value", order.quantity, "type", "Integer"),
                        "interval", Map.of("value", order.interval, "type", "Integer")
                )
        );

        client
                .target(camundaUrl)
                .request(MediaType.APPLICATION_JSON)
                .header("Authorization", authHeader)
                .post(Entity.json(body));

        client.close();

        return order;
    }
}
