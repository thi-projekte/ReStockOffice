package de.restockoffice.delivery;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.cibseven.bpm.engine.delegate.JavaDelegate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.OAuth2AuthorizeRequest;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientManager;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component("fetchDeliveriesForAnnouncementDelegate")
public class FetchDeliveriesForAnnouncementDelegate implements JavaDelegate {

    private static final Logger log = LoggerFactory.getLogger(FetchDeliveriesForAnnouncementDelegate.class);
    private static final String CLIENT_REGISTRATION_ID = "keycloak";
    private static final String SERVICE_PRINCIPAL = "CamundaTimerService";
    // necessary for tests
    private RestTemplate restTemplate = new RestTemplate();

    @Autowired(required = false)
    private OAuth2AuthorizedClientManager authorizedClientManager;

    @Value("${deliveriesservice.base-url:https://restocker-deliveries.restockoffice.de}")
    private String deliveriesServiceBaseUrl;

    @Value("${delivery-announcement.lead-days:0}")
    private int announcementLeadDays;

    @Override
    public void execute(DelegateExecution execution) {
        LocalDate announcementTargetDate = LocalDate.now().plusDays(announcementLeadDays);
        String url = trimTrailingSlash(deliveriesServiceBaseUrl) + "/api/deliveries/admin/all-deliveries";

        ResponseEntity<DeliveryDetailResponse[]> responseEntity = restTemplate.exchange(url, HttpMethod.GET,
                httpEntity(serviceAuthorizationHeader()), DeliveryDetailResponse[].class);
        DeliveryDetailResponse[] response = responseEntity.getBody();
        List<DeliveryMonitoringItem> deliveries = Arrays
                .stream(response != null ? response : new DeliveryDetailResponse[0])
                .filter(delivery -> announcementTargetDate.equals(parseDate(delivery.deliveryDate())))
                .filter(this::isMonitorableDelivery).map(this::toMonitoringItem).toList();

        execution.setVariable("deliveries", deliveries);
        execution.setVariable("announcementTargetDate", announcementTargetDate.toString());
        log.info("Loaded {} deliveries for announcement on {}", deliveries.size(), announcementTargetDate);
    }

    private DeliveryMonitoringItem toMonitoringItem(DeliveryDetailResponse response) {
        return new DeliveryMonitoringItem(response.id(), response.orderId(), response.userId(),
                parseDate(response.deliveryDate()));
    }

    private LocalDate parseDate(String value) {
        return value != null && !value.isBlank() ? LocalDate.parse(value) : null;
    }

    private boolean isMonitorableDelivery(DeliveryDetailResponse delivery) {
        return delivery.status() == null || delivery.status().isBlank() || "OPEN".equalsIgnoreCase(delivery.status())
                || "ACCEPTED".equalsIgnoreCase(delivery.status()) || "COLLECTED".equalsIgnoreCase(delivery.status());
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private HttpEntity<Void> httpEntity(String authorizationHeader) {
        HttpHeaders headers = new HttpHeaders();
        if (authorizationHeader != null && !authorizationHeader.isBlank()) {
            headers.set(HttpHeaders.AUTHORIZATION, authorizationHeader);
        }
        return new HttpEntity<>(headers);
    }

    private String serviceAuthorizationHeader() {
        if (authorizedClientManager == null) {
            return null;
        }

        try {
            OAuth2AuthorizeRequest authRequest = OAuth2AuthorizeRequest.withClientRegistrationId(CLIENT_REGISTRATION_ID)
                    .principal(SERVICE_PRINCIPAL).build();

            var authorizedClient = authorizedClientManager.authorize(authRequest);
            if (authorizedClient == null || authorizedClient.getAccessToken() == null) {
                return null;
            }

            return "Bearer " + authorizedClient.getAccessToken().getTokenValue();
        } catch (RuntimeException exception) {
            log.warn("Could not create service token for delivery announcement fetch", exception);
            return null;
        }
    }

    public record DeliveryDetailResponse(String id, String orderId, String userId, String deliveryDate, String status) {
    }
}
