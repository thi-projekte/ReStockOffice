package de.restockoffice;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@ApplicationScoped
public class ResendMailClient {

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Inject
    MailSettings mailSettings;

    public void sendInvoiceMail(String recipientEmail, byte[] pdf) {
        String pdfBase64 = Base64.getEncoder().encodeToString(pdf);

        Map<String, Object> attachment = new LinkedHashMap<>();
        attachment.put("filename", "rechnung.pdf");
        attachment.put("content", pdfBase64);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("from", mailSettings.sender());
        payload.put("to", List.of(recipientEmail));
        payload.put("subject", "Ihre Rechnung von ReStockOffice");
        payload.put("html", loadMailTemplate());
        payload.put("attachments", List.of(attachment));
        if (!mailSettings.replyTo().isBlank()) {
            payload.put("reply_to", mailSettings.replyTo());
        }

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(mailSettings.resendBaseUrl() + "/emails"))
                .header("Authorization", "Bearer " + mailSettings.resendApiKey().orElseThrow())
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(toJson(payload)))
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new RuntimeException("Resend returned " + response.statusCode() + ": " + response.body());
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Resend-Aufruf unterbrochen", e);
        } catch (IOException e) {
            throw new RuntimeException("Resend nicht erreichbar: " + e.getMessage(), e);
        }
    }

    private String loadMailTemplate() {
        try (var stream = getClass().getResourceAsStream("/templates/invoice-mail.html")) {
            if (stream == null) return "Ihre Rechnung finden Sie im Anhang.";
            return new String(stream.readAllBytes());
        } catch (IOException e) {
            return "Ihre Rechnung finden Sie im Anhang.";
        }
    }

    private String toJson(Map<String, Object> payload) {
        StringBuilder builder = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, Object> entry : payload.entrySet()) {
            if (!first) builder.append(',');
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
            for (int i = 0; i < list.size(); i++) {
                if (i > 0) builder.append(',');
                builder.append(toJsonValue(list.get(i)));
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
