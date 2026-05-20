package de.restockoffice;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

import java.util.List;

@RegisterRestClient(configKey = "orders-service")
@Path("/orders")
@Produces(MediaType.APPLICATION_JSON)
public interface OrderClient {

    @GET
    @Path("/delivery/{id}")
    OrderDto getOrderById(
            @PathParam("id") Long id,
            @HeaderParam("Authorization") String authorizationHeader
    );

    @GET
    @Path("/active")
    List<OrderDto> getActiveOrders(@HeaderParam("Authorization") String authorizationHeader);
}
