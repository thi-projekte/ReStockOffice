package de.restockoffice;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

@RegisterRestClient(configKey = "articles-service")
@Path("/")
@Produces(MediaType.APPLICATION_JSON)
public interface ArticleClient {

    @GET
    @Path("/article")
    ArticleDto getArticleByProductId(@QueryParam("productId") String productId);
}
