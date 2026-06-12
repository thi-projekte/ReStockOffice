package de.restockoffice.mails;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.restockoffice.validation.MailValidationException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class ResendMailClient {

    private static final Logger log = LoggerFactory.getLogger(ResendMailClient.class);
    private static final String INLINE_LOGO_CID = "restockoffice-logo";
    private static final String INLINE_LOGO_SRC = "cid:" + INLINE_LOGO_CID;
    private static final String LOGO_RESOURCE = "META-INF/resources/assets/logo_colored.png";

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Inject
    ObjectMapper objectMapper;

    @Inject
    MailSettings mailSettings;

    public String send(String recipientEmail, String subject, String html) {
        validateInputs(recipientEmail, subject, html);

        if (mailSettings.dryRun()) {
            log.info("Dry-run mail rendered for recipient={} subject={}", recipientEmail, subject);
            return "dry-run-message-id";
        }

        String resendApiKey = mailSettings.resendApiKey()
                .filter(value -> !value.isBlank())
                .orElseThrow(() -> new MailValidationException("QUARKUS_MAILER_PASSWORD is missing"));

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("from", mailSettings.sender());
        payload.put("to", List.of(recipientEmail));
        payload.put("subject", subject);
        payload.put("html", html);
        payload.put("reply_to", mailSettings.replyTo());

        if (html.contains(INLINE_LOGO_SRC)) {
            payload.put("attachments", List.of(buildInlineLogoAttachment()));
        }

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

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new MailValidationException("Fehler beim Resend-Aufruf: " + e.getMessage());
        } catch (IOException e) {
            throw new MailValidationException("Fehler beim Resend-Aufruf: " + e.getMessage());
        }
    }

    private Map<String, Object> buildInlineLogoAttachment() {
        try (InputStream input = Thread.currentThread()
                .getContextClassLoader()
                .getResourceAsStream(LOGO_RESOURCE)) {
            if (input == null) {
                throw new MailValidationException("Inline logo resource is missing: " + LOGO_RESOURCE);
            }

            return Map.of(
                    "content", Base64.getEncoder().encodeToString(input.readAllBytes()),
                    "filename", "restockoffice-logo.png",
                    "content_type", "image/png",
                    "content_id", INLINE_LOGO_CID
            );
        } catch (IOException e) {
            throw new MailValidationException("Inline logo resource could not be loaded: " + e.getMessage());
        }
    }

    private void validateInputs(String email, String sub, String body) {
        if (mailSettings.sender().isBlank()) throw new MailValidationException("RESTOCK_MAIL_SENDER missing");
        if (mailSettings.replyTo().isBlank()) throw new MailValidationException("RESTOCK_MAIL_REPLY_TO missing");
        if(mailSettings.resendBaseUrl().isBlank()) throw new MailValidationException("RESTOCK_MAIL_RESEND_BASE_URL missing");
        if (email == null || email.isBlank()) throw new MailValidationException("recipientEmail missing");
        if (sub == null || sub.isBlank()) throw new MailValidationException("subject missing");
        if (body == null || body.isBlank()) throw new MailValidationException("html missing");
    }
}
