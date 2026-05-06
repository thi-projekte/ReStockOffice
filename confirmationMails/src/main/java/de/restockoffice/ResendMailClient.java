package de.restockoffice;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@ApplicationScoped
public class ResendMailClient {

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Inject
    MailSettings mailSettings;

    public String send(String recipientEmail, String subject, String html) {
        String resendApiKey = mailSettings.resendApiKey()
                .filter(value -> !value.isBlank())
                .orElseThrow(() -> new MailValidationException("QUARKUS_MAILER_PASSWORD is missing"));

        if (mailSettings.sender().isBlank()) {
            throw new MailValidationException("RESTOCK_MAIL_SENDER is missing");
        }

        if (mailSettings.resendBaseUrl().isBlank()) {
            throw new MailValidationException("RESTOCK_MAIL_RESEND_BASE_URL is missing");
        }

        if (recipientEmail == null || recipientEmail.isBlank()) {
            throw new MailValidationException("recipientEmail must not be blank");
        }

        if (subject == null || subject.isBlank()) {
            throw new MailValidationException("subject must not be blank");
        }

        if (html == null || html.isBlank()) {
            throw new MailValidationException("html must not be blank");
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("from", mailSettings.sender());
        payload.put("to", List.of(recipientEmail));
        payload.put("subject", subject);
        payload.put("html", html);
        if (!mailSettings.replyTo().isBlank()) {
            payload.put("reply_to", mailSettings.replyTo());
        }

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(mailSettings.resendBaseUrl() + "/emails"))
                .header("Authorization", "Bearer " + resendApiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(toJson(payload)))
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new MailValidationException("Resend returned " + response.statusCode() + ": " + response.body());
            }
            return extractMessageId(response.body()).orElse("accepted");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new MailValidationException("Resend call was interrupted");
        } catch (IOException exception) {
            throw new MailValidationException("Could not reach Resend: " + exception.getMessage());
        }
    }

    private Optional<String> extractMessageId(String body) {
        String token = "\"id\":\"";
        int start = body.indexOf(token);
        if (start < 0) {
            return Optional.empty();
        }
        int valueStart = start + token.length();
        int end = body.indexOf('"', valueStart);
        if (end < 0) {
            return Optional.empty();
        }
        return Optional.of(body.substring(valueStart, end));
    }

    private String toJson(Map<String, Object> payload) {
        StringBuilder builder = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, Object> entry : payload.entrySet()) {
            if (!first) {
                builder.append(',');
            }
            first = false;
            builder.append('"').append(escapeJson(entry.getKey())).append('"').append(':');
            builder.append(toJsonValue(entry.getValue()));
        }
        builder.append('}');
        return builder.toString();
    }

    @SuppressWarnings("unchecked")
    private String toJsonValue(Object value) {
        if (value instanceof String string) {
            return "\"" + escapeJson(string) + "\"";
        }
        if (value instanceof List<?> list) {
            StringBuilder builder = new StringBuilder("[");
            for (int index = 0; index < list.size(); index++) {
                if (index > 0) {
                    builder.append(',');
                }
                builder.append(toJsonValue(list.get(index)));
            }
            builder.append(']');
            return builder.toString();
        }
        if (value instanceof Map<?, ?> map) {
            return toJson((Map<String, Object>) map);
        }
        return "\"" + escapeJson(String.valueOf(value)) + "\"";
    }

    private String escapeJson(String value) {
        return value.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n");
    }
}
