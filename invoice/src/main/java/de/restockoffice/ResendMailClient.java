package de.restockoffice;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.qute.Template;
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

@ApplicationScoped
public class ResendMailClient {

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Inject
    MailSettings mailSettings;

    @Inject
    ObjectMapper objectMapper;

    @Inject
    Template invoiceMail;

    public void sendInvoiceMail(String recipientEmail, byte[] pdf, InvoiceRequest data) {
        try{
            String pdfBase64 = Base64.getEncoder().encodeToString(pdf);

            String renderedHtml = invoiceMail.data("invoice", data).render();

            Map<String, Object> payload = Map.of(
                "from", mailSettings.sender(),
                "to", List.of(recipientEmail),
                "subject", "Ihre Rechnung von ReStockOffice",
                "html", renderedHtml,
                "attachments", List.of(
                        Map.of(
                                "filename", "rechnung.pdf",
                                "content", pdfBase64
                        )
                ),
                "reply_to", mailSettings.replyTo()
            );

            String jsonBody = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(mailSettings.resendBaseUrl() + "/emails"))
                    .header("Authorization", "Bearer " + mailSettings.resendApiKey().orElseThrow())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new RuntimeException("Resend API Fehler: " + response.body());
            }
        }catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Resend-Aufruf unterbrochen", e);
        }catch (IOException e) {
            throw new RuntimeException("Resend nicht erreichbar: " + e.getMessage(), e);
        }catch(Exception e){
            throw new RuntimeException("Fehler beim E-Mail Versand via Resend", e);
        }
    }
}
