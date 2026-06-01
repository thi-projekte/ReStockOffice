package de.restockoffice;

import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.cibseven.bpm.engine.delegate.JavaDelegate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

@Component("fetchDeliveriesForAnnouncementDelegate")
public class FetchDeliveriesForAnnouncementDelegate implements JavaDelegate {

    private static final Logger log = LoggerFactory.getLogger(FetchDeliveriesForAnnouncementDelegate.class);
    private static final int ANNOUNCEMENT_LEAD_DAYS = 2;

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${deliveriesservice.base-url:https://restocker-deliveries.restockoffice.de}")
    private String deliveriesServiceBaseUrl;

    @Override
    public void execute(DelegateExecution execution) {
        LocalDate announcementTargetDate = LocalDate.now().plusDays(ANNOUNCEMENT_LEAD_DAYS);
        String url = trimTrailingSlash(deliveriesServiceBaseUrl) + "/api/deliveries/open";

        DeliveryDetailResponse[] response = restTemplate.getForObject(url, DeliveryDetailResponse[].class);
        List<DeliveryMonitoringItem> deliveries = Arrays.stream(response != null ? response : new DeliveryDetailResponse[0])
                .filter(delivery -> announcementTargetDate.equals(parseDate(delivery.deliveryDate())))
                .map(this::toMonitoringItem)
                .toList();

        execution.setVariable("deliveries", deliveries);
        execution.setVariable("announcementTargetDate", announcementTargetDate.toString());
        log.info("Loaded {} deliveries for announcement on {}", deliveries.size(), announcementTargetDate);
    }

    private DeliveryMonitoringItem toMonitoringItem(DeliveryDetailResponse response) {
        return new DeliveryMonitoringItem(
                response.id(),
                response.orderId(),
                response.userId(),
                parseDate(response.deliveryDate())
        );
    }

    private LocalDate parseDate(String value) {
        return value != null && !value.isBlank() ? LocalDate.parse(value) : null;
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private record DeliveryDetailResponse(
            String id,
            String orderId,
            String userId,
            String deliveryDate
    ) {
    }
}
