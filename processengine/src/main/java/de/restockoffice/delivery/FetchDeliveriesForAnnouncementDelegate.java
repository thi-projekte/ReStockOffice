package de.restockoffice.delivery;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.cibseven.bpm.engine.delegate.JavaDelegate;
import org.springframework.beans.factory.annotation.Autowired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component("fetchDeliveriesForAnnouncementDelegate")
public class FetchDeliveriesForAnnouncementDelegate implements JavaDelegate {

    private static final Logger log = LoggerFactory.getLogger(FetchDeliveriesForAnnouncementDelegate.class);
    //necessary for tests
    private RestTemplate restTemplate = new RestTemplate();

    @Autowired(required = false)
    void setRestTemplate(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Value("${deliveriesservice.base-url:https://restocker-deliveries.restockoffice.de}")
    private String deliveriesServiceBaseUrl;

    @Value("${delivery-announcement.lead-days:0}")
    private int announcementLeadDays;

    @Override
    public void execute(DelegateExecution execution) {
        LocalDate announcementTargetDate = LocalDate.now().plusDays(announcementLeadDays);
        String url = trimTrailingSlash(deliveriesServiceBaseUrl) + "/api/deliveries/admin/all-deliveries";

        DeliveryDetailResponse[] response = restTemplate.getForObject(url, DeliveryDetailResponse[].class);
        List<DeliveryMonitoringItem> deliveries =
                Arrays.stream(response != null ? response : new DeliveryDetailResponse[0])
                        .filter(delivery -> announcementTargetDate.equals(parseDate(delivery.deliveryDate())))
                        .filter(this::isMonitorableDelivery)
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

    private boolean isMonitorableDelivery(DeliveryDetailResponse delivery) {
        return delivery.status() == null
                || delivery.status().isBlank()
                || "OPEN".equalsIgnoreCase(delivery.status())
                || "ACCEPTED".equalsIgnoreCase(delivery.status())
                || "COLLECTED".equalsIgnoreCase(delivery.status());
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    public record DeliveryDetailResponse(
            String id,
            String orderId,
            String userId,
            String deliveryDate,
            String status
    ) {
    }
}
