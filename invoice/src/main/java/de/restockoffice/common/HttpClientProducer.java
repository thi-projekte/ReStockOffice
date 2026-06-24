package de.restockoffice.common;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;
import java.net.http.HttpClient;

@ApplicationScoped
public class HttpClientProducer {

    @Produces
    @ApplicationScoped
    public HttpClient httpClient() {
        return HttpClient.newHttpClient();
    }
}
