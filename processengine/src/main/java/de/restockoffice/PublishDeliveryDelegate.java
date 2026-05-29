package de.restockoffice;

import org.cibseven.bpm.engine.RuntimeService;
import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.cibseven.bpm.engine.delegate.JavaDelegate;
import org.cibseven.bpm.engine.runtime.ProcessInstance;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;

@Component("publishDeliveryDelegate")
// Uses the restocker-deliveries Service to publish all upcoming deliveries  of the next 14 days
public class PublishDeliveryDelegate implements JavaDelegate {

    private static final Logger log = LoggerFactory.getLogger(PublishDeliveryDelegate.class);
    private static final String DELIVERY_PROCESS_KEY = "fourteenDaysDeliveryProcess";
    private static final String DELIVERY_PUBLISHED_MESSAGE = "DeliveryPublished";

    private final RuntimeService runtimeService;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${deliveriesservice.base-url:https://restocker-deliveries.restockoffice.de}")
    private String deliveriesServiceBaseUrl;

    public PublishDeliveryDelegate(RuntimeService runtimeService) {
        this.runtimeService = runtimeService;
    }

    @Override
    public void execute(DelegateExecution execution) {
        DeliveryPublicationItem delivery = (DeliveryPublicationItem) execution.getVariable("delivery");
        if (delivery == null || isBlank(delivery.deliveryId())) {
            throw new IllegalStateException("Multi-instance element variable 'delivery' is missing or invalid.");
        }

        String deliveryId = delivery.deliveryId();
        if (hasActiveDeliveryProcess(deliveryId)) {
            log.info("Delivery process for delivery {} is already active; marking as published only", deliveryId);
            markPublished(deliveryId);
            return;
        }

        Map<String, Object> variables = deliveryVariables(delivery);
        ProcessInstance processInstance = runtimeService
                .createMessageCorrelation(DELIVERY_PUBLISHED_MESSAGE)
                .processInstanceBusinessKey(deliveryId)
                .setVariables(variables)
                .correlateStartMessage();

        markPublished(deliveryId);
        log.info("Started delivery process {} for delivery {}", processInstance.getProcessInstanceId(), deliveryId);
    }

    private boolean hasActiveDeliveryProcess(String deliveryId) {
        return runtimeService
                .createProcessInstanceQuery()
                .processDefinitionKey(DELIVERY_PROCESS_KEY)
                .processInstanceBusinessKey(deliveryId)
                .active()
                .count() > 0;
    }

    private Map<String, Object> deliveryVariables(DeliveryPublicationItem delivery) {
        LocalDate deliveryDate = delivery.deliveryDate();
        Map<String, Object> variables = new HashMap<>();
        variables.put("deliveryId", delivery.deliveryId());
        variables.put("deliveredDeliveryId", delivery.deliveryId());
        variables.put("orderId", delivery.orderId());
        variables.put("customerId", delivery.customerId());
        variables.put("aboId", delivery.aboId());
        variables.put("deliveryDate", deliveryDate != null ? deliveryDate.atTime(LocalTime.of(8, 0)).toString() : null);
        variables.put("deliveryDateLabel", deliveryDate != null ? deliveryDate.toString() : null);
        variables.put("announcementDate", deliveryDate != null
                ? deliveryDate.minusDays(2).atTime(LocalTime.of(8, 0)).atZone(ZoneId.systemDefault()).toOffsetDateTime().toString()
                : null);
        return variables;
    }

    private void markPublished(String deliveryId) {
        String url = trimTrailingSlash(deliveriesServiceBaseUrl) + "/api/deliveries/" + deliveryId + "/published";
        restTemplate.postForEntity(url, null, String.class);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
