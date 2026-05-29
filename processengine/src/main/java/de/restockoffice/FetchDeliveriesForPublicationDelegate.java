package de.restockoffice;

import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.cibseven.bpm.engine.delegate.JavaDelegate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.List;

@Component("fetchDeliveriesForPublicationDelegate")
public class FetchDeliveriesForPublicationDelegate implements JavaDelegate {

    private static final Logger log = LoggerFactory.getLogger(FetchDeliveriesForPublicationDelegate.class);
    private static final int PUBLICATION_HORIZON_DAYS = 14;

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${deliveriesservice.base-url:https://restocker-deliveries.restockoffice.de}")
    private String deliveriesServiceBaseUrl;

    @Override
    public void execute(DelegateExecution execution) {
        String url = trimTrailingSlash(deliveriesServiceBaseUrl)
                + "/api/deliveries/publication-candidates?days=" + PUBLICATION_HORIZON_DAYS;

        DeliveryPublicationResponse[] response = restTemplate.getForObject(url, DeliveryPublicationResponse[].class);
        List<DeliveryPublicationItem> deliveries = Arrays.stream(response != null ? response : new DeliveryPublicationResponse[0])
                .map(this::toPublicationItem)
                .toList();

        execution.setVariable("deliveries", deliveries);
        log.info("Loaded {} deliveries for publication", deliveries.size());
    }

    private DeliveryPublicationItem toPublicationItem(DeliveryPublicationResponse response) {
        return new DeliveryPublicationItem(
                response.deliveryId(),
                response.orderId(),
                response.customerId(),
                response.aboId(),
                response.deliveryDate() != null ? java.time.LocalDate.parse(response.deliveryDate()) : null
        );
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private record DeliveryPublicationResponse(
            String deliveryId,
            String orderId,
            String customerId,
            String aboId,
            String deliveryDate
    ) {
    }
}
