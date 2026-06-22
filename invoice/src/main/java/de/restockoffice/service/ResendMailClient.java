package de.restockoffice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.restockoffice.api.InvoiceRequest;
import de.restockoffice.domain.MailSettings;
import de.restockoffice.exception.MailServiceException;
import de.restockoffice.exception.ResendApiFailedException;
import de.restockoffice.exception.ResendApiUnavailableException;
import io.quarkus.qute.Template;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class ResendMailClient {

    @Inject
    HttpClient httpClient;

    @Inject
    MailSettings mailSettings;

    @Inject
    ObjectMapper objectMapper;

    @Inject
    Template invoiceMail;

    private static final Logger LOG = LoggerFactory.getLogger(ResendMailClient.class);

    public void sendInvoiceMail(String recipientEmail, byte[] pdf, InvoiceRequest data) {
        try {
            String pdfBase64 = Base64.getEncoder().encodeToString(pdf);
            String logoUrl = mailSettings.logoUrl();

            String renderedHtml = invoiceMail
                    .data("invoice", data)
                    .data("logoUrl", logoUrl)
                    .render();

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

            LOG.info("Sende E-Mail an: {}", recipientEmail);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(mailSettings.resendBaseUrl() + "/emails"))
                    .header("Authorization", "Bearer " + mailSettings.resendApiKey().orElseThrow())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResendApiFailedException("Resend API Fehler: " + response.body());
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new MailServiceException("Resend-Aufruf unterbrochen", e);
        } catch (IOException e) {
            throw new ResendApiUnavailableException("Resend nicht erreichbar: " + e.getMessage());
        } catch (Exception e) {
            throw new RuntimeException("Fehler beim E-Mail Versand via Resend", e);
        }
    }
}
