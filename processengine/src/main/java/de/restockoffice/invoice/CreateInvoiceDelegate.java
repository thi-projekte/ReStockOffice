package de.restockoffice.invoice;

import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.cibseven.bpm.engine.delegate.JavaDelegate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import java.time.LocalDate;
import java.util.*;

@Component("createInvoiceDelegate")
public class CreateInvoiceDelegate implements JavaDelegate {

    private final InvoiceDataService dataService;
    private final RestClient invoiceClient;

    public CreateInvoiceDelegate(InvoiceDataService dataService, RestClient invoiceClient) {
        this.dataService = dataService;
        this.invoiceClient = invoiceClient;
    }

    @Override
    public void execute(DelegateExecution execution) throws Exception {
        String customerId = (String) execution.getVariable("customerId");

        Optional<InvoicePreparationData> dataOpt = dataService.prepareInvoiceData(customerId);

        if (dataOpt.isEmpty()) {
            execution.setVariable("hasDeliveries", false);
            return;
        }

        InvoicePreparationData data = dataOpt.get();
        Map<String, Object> request = buildRequest(data);

        Map<String, String> response = invoiceClient.post()
                .uri("/invoices/create")
                .body(request)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});

        execution.setVariable("hasDeliveries", true);

        if (response == null || !response.containsKey("invoiceNumber")) {
            throw new IllegalStateException("Invoice-Service antwortete nicht mit einer Rechnungsnummer!");
        }

        execution.setVariable("generatedInvoiceNumber", response.get("invoiceNumber"));
        execution.setVariable("tempInvoiceRequest", request);
    }

    private Map<String, Object> buildRequest(InvoicePreparationData data) {
        Map<String, Object> req = new HashMap<>();
        req.put("userId", data.userId());
        req.put("recipientEmail", data.email());
        req.put("recipientName", data.companyName());
        req.put("recipientStreet", data.street());
        req.put("recipientZip", data.postalCode());
        req.put("recipientCity", data.city());
        req.put("issueDate", LocalDate.now().toString());
        req.put("dueDate", LocalDate.now().plusDays(14).toString());
        req.put("netAmount", data.totalNet());
        req.put("orderItems", data.orderItems());
        return req;
    }
}