package de.restockoffice;

import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.cibseven.bpm.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import java.util.Map;

@Component("sendInvoiceMailDelegate")
public class SendInvoiceMailDelegate implements JavaDelegate {

    private final RestClient invoiceClient = RestClient.create("https://invoice.restockoffice.de");

    @Override
    public void execute(DelegateExecution execution) throws Exception {
        // Holt die temporär gemerkten Daten aus dem vorherigen Schritt
        Map<String, Object> invoiceRequest = (Map<String, Object>) execution.getVariable("tempInvoiceRequest");
        String invoiceNumber = (String) execution.getVariable("generatedInvoiceNumber");

        if (invoiceRequest == null || invoiceNumber == null) {
            throw new IllegalStateException("Rechnungsdaten für den E-Mail-Versand fehlen im Prozesskontext!");
        }

        // Von Quarkus generierte echte Rechnungsnummer in das Request-Objekt einsetzen
        invoiceRequest.put("invoiceNumber", invoiceNumber);

        // HTTP POST an InvoiceResource
        invoiceClient.post()
                .uri("/invoices/send-mail")
                .body(invoiceRequest)
                .retrieve()
                .toBodilessEntity();

        // Temporäre Variablen löschen
        execution.removeVariable("tempInvoiceRequest");
        execution.removeVariable("generatedInvoiceNumber");
    }
}
