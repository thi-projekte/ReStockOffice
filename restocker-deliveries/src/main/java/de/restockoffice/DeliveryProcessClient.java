package de.restockoffice;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class DeliveryProcessClient {

    private static final Logger log = LoggerFactory.getLogger(DeliveryProcessClient.class);

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Inject
    ObjectMapper objectMapper;

    @ConfigProperty(name = "processengine.base-url", defaultValue = "http://processengine:8080")
    String processEngineBaseUrl;

    public void correlateDeliveryConfirmed(UUID deliveryId) {
        try {
            Map<String, Object> payload = Map.of(
                    "messageName", "DeliveryConfirmed",
                    "localCorrelationKeys", Map.of(
                            "deliveryId", variable(deliveryId.toString())
                    ),
                    "processVariables", Map.of(
                            "deliveryId", variable(deliveryId.toString()),
                            "deliveredDeliveryId", variable(deliveryId.toString())
                    )
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(trimTrailingSlash(processEngineBaseUrl) + "/engine-rest/message"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 400 && response.body() != null && response.body().contains("Cannot correlate")) {
                log.info("No waiting DeliveryConfirmed subscription found for delivery {}; skipping duplicate confirmation", deliveryId);
                return;
            }
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException("ProcessEngine returned " + response.statusCode() + ": " + response.body());
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Delivery confirmation correlation was interrupted", exception);
        } catch (Exception exception) {
            throw new IllegalStateException("Could not correlate DeliveryConfirmed message", exception);
        }
    }

    private Map<String, Object> variable(String value) {
        return Map.of("value", value, "type", "String");
    }

    private String trimTrailingSlash(String value) {
        return value != null && value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
