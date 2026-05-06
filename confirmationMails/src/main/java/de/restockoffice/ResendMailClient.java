package de.restockoffice;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class ResendMailClient {

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Inject
    ObjectMapper objectMapper;

    @Inject
    MailSettings mailSettings;

    public String send(String recipientEmail, String subject, String html) {
        String resendApiKey = mailSettings.resendApiKey()
                .filter(value -> !value.isBlank())
                .orElseThrow(() -> new MailValidationException("QUARKUS_MAILER_PASSWORD is missing"));

        validateInputs(recipientEmail, subject, html);

        Map<String, Object> payload = Map.of(
                "from", mailSettings.sender(),
                "to", List.of(recipientEmail),
                "subject", subject,
                "html", html
        );
        try{
            String jsonBody = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(mailSettings.resendBaseUrl() + "/emails"))
                    .header("Authorization", "Bearer " + resendApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new MailValidationException("Resend returned " + response.statusCode() + ": " + response.body());
            }

            return objectMapper.readTree(response.body()).get("id").asText();

        }catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            throw new MailValidationException("Fehler beim Resend-Aufruf: " + e.getMessage());
        }
    }

    private void validateInputs(String email, String sub, String body) {
        if (mailSettings.sender().isBlank()) throw new MailValidationException("RESTOCK_MAIL_SENDER missing");
        if(mailSettings.resendBaseUrl().isBlank()) throw new MailValidationException("RESTOCK_MAIL_RESEND_BASE_URL missing");
        if (email == null || email.isBlank()) throw new MailValidationException("recipientEmail missing");
        if (sub == null || sub.isBlank()) throw new MailValidationException("subject missing");
        if (body == null || body.isBlank()) throw new MailValidationException("html missing");
    }
}
