package org.acme;

import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import java.util.List;
import jakarta.annotation.security.RolesAllowed;
import jakarta.ws.rs.client.Client;
import jakarta.ws.rs.client.ClientBuilder;
import jakarta.ws.rs.client.Entity;
import java.util.Map;
import jakarta.inject.Inject;
import io.quarkus.security.identity.SecurityIdentity;


@Path("/orders")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed("camunda-admin")

public class OrderResource {
    @Inject
    SecurityIdentity securityIdentity;
    @GET
    public List<Order> getAll() {
        return Order.listAll();
    }

    @GET
    @Path("/{id}")
    public Order getById(@PathParam("id") Long id) {
        return Order.findById(id);
    }

    @POST
    @Transactional
    public Order bestellen(Order input) {
        String username = securityIdentity.getPrincipal().getName();
        Order order = Order.bestellen(
                username,
                input.produktnummer,
                input.menge,
                input.frequency
        );
        order.persist();

/*
        // Erst Token von Keycloak holen
        Client authClient = ClientBuilder.newClient();
        String tokenResponse = authClient
                .target("http://keycloak:8080/realms/cib-seven/protocol/openid-connect/token")
                .request(MediaType.APPLICATION_FORM_URLENCODED)
                .post(Entity.form(new jakarta.ws.rs.core.Form()
                        .param("client_id", "cib-seven-local")
                        .param("client_secret", "cib-seven-secret")
                        .param("username", "demo")
                        .param("password", "demo")
                        .param("grant_type", "password")))
                .readEntity(String.class);
        authClient.close();

        // Token aus Response extrahieren
        String accessToken = tokenResponse
                .split("\"access_token\":\"")[1]
                .split("\"")[0];
        System.out.println("TOKEN RESPONSE: " + tokenResponse);*/



/*
        // Camunda Prozess mit Token starten
        Client client = ClientBuilder.newClient();
        String camundaUrl =
                "http://localhost:8080/engine-rest/process-definition/key/Process_0ltcqh0/start";

        Map<String, Object> body = Map.of(
                "businessKey", order.id.toString(),
                "variables", Map.of(
                        "orderId", Map.of("value", order.id, "type", "Long"),
                        "username", Map.of("value", order.username, "type", "String"),
                        "produktnummer", Map.of("value", order.produktnummer, "type", "Integer"),
                        "menge", Map.of("value", order.menge, "type", "Integer")
                )
        );

        client
                .target(camundaUrl)
                .request(MediaType.APPLICATION_JSON)
                //.header("Authorization", "Bearer " + accessToken)
                .post(Entity.json(body));

        client.close();

        /*
        //Camunda Prozess starten
        Client client = ClientBuilder.newClient();

        String camundaUrl =
                "http://localhost:8080/engine-rest/process-definition/key/Process_0ltcqh0/start";

        Map<String, Object> body = Map.of(
                "businessKey", order.id.toString(),
                "variables", Map.of(
                        "orderId", Map.of("value", order.id, "type", "Long"),
                        "kundenummer", Map.of("value", order.kundenummer, "type", "Integer"),
                        "produktnummer", Map.of("value", order.produktnummer, "type", "Integer"),
                        "menge", Map.of("value", order.menge, "type", "Integer")
                )
        );

        client
                .target(camundaUrl)
                .request(MediaType.APPLICATION_JSON)
                .post(Entity.json(body));

        client.close();*/


        return order;
    }
}