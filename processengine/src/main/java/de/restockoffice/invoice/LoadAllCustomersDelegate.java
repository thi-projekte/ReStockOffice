package de.restockoffice.invoice;

import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.cibseven.bpm.engine.delegate.JavaDelegate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component("loadAllCustomersDelegate")
public class LoadAllCustomersDelegate implements JavaDelegate {

    private final RestClient deliveryServiceClient;

    public LoadAllCustomersDelegate(RestClient.Builder restClientBuilder,
            @Value("${deliveriesservice.base-url}") String deliveriesServiceBaseUrl) {

        this.deliveryServiceClient = restClientBuilder.baseUrl(deliveriesServiceBaseUrl).build();
    }

    @Override
    public void execute(DelegateExecution execution) {
        // Für Deliveryservice zuerst letzten Monat berechnen
        LocalDate previousMonthDate = LocalDate.now().minusMonths(1);
        String formattedMonth = previousMonthDate.format(DateTimeFormatter.ofPattern("MM.yyyy"));

        DeliveryServiceResponse response = deliveryServiceClient.get()
                .uri(uriBuilder -> uriBuilder.path("/api/deliveries/customers") // Kombiniert die Base-URL mit dem
                                                                                // API-Pfad
                        .queryParam("month", formattedMonth).build())
                .retrieve().body(DeliveryServiceResponse.class);

        execution.setVariable("InvoiceForMonth", formattedMonth);

        if (response != null && response.customerIds() != null) {
            execution.setVariable("customerIdList", response.customerIds());
        } else {
            // Fallback, um nachfolgende NullPointer im Camunda-Prozess zu verhindern
            execution.setVariable("customerIdList", List.of());
        }
    }

    public record DeliveryServiceResponse(String month, List<String> customerIds) {
    }
}
