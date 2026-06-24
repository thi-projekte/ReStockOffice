package de.restockoffice.invoice;

import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.cibseven.bpm.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import java.util.Map;

@Component("sendInvoiceMailDelegate")
public class SendInvoiceMailDelegate implements JavaDelegate {

    private final RestClient invoiceClient;

    public SendInvoiceMailDelegate(RestClient invoiceClient) {
        this.invoiceClient = invoiceClient;
    }

    @Override
    public void execute(DelegateExecution execution) throws Exception {
        Object rawData = execution.getVariable("tempInvoiceRequest");

        if (!(rawData instanceof Map<?, ?>)) {
            throw new IllegalStateException("Daten 'tempInvoiceRequest' sind keine Map!");
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> invoiceRequest = (Map<String, Object>) rawData;
        String invoiceNumber = (String) execution.getVariable("generatedInvoiceNumber");

        if (invoiceNumber == null) {
            throw new IllegalStateException("Rechnungsnummer fehlt im Prozesskontext!");
        }

        // Rechnungsnummer in die Map setzen
        invoiceRequest.put("invoiceNumber", invoiceNumber);

        // HTTP POST an InvoiceResource
        invoiceClient.post().uri("/invoices/send-mail").body(invoiceRequest).retrieve().toBodilessEntity();

        // Temporäre Variablen löschen
        execution.removeVariable("tempInvoiceRequest");
        execution.removeVariable("generatedInvoiceNumber");
    }
}
