package de.restockoffice;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

@RegisterRestClient(configKey = "users-service")
@Produces(MediaType.APPLICATION_JSON)
public interface UserClient {

    @GET
    @Path("/customer")
    UserDto getUserById(
            @QueryParam("userId") String userId,
            @HeaderParam("Authorization") String authorizationHeader
    );
}
