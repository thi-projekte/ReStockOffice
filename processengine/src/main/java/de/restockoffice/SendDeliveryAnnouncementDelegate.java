package de.restockoffice;

import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.cibseven.bpm.engine.delegate.JavaDelegate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component("sendDeliveryAnnouncementDelegate")
public class SendDeliveryAnnouncementDelegate implements JavaDelegate {

    private static final Logger log = LoggerFactory.getLogger(SendDeliveryAnnouncementDelegate.class);

    private final MailDataEnrichmentService mailDataEnrichmentService;

    @Value("${mailservice.base-url}")
    private String mailServiceBaseUrl;

    public SendDeliveryAnnouncementDelegate(MailDataEnrichmentService mailDataEnrichmentService) {
        this.mailDataEnrichmentService = mailDataEnrichmentService;
    }

    @Override
    public void execute(DelegateExecution execution) {
        log.info("Sending delivery announcement for order {}", execution.getVariable("orderNumber"));
        mailDataEnrichmentService.enrichDeliveryAnnouncement(execution);

        Map<String, Object> request = new HashMap<>();
        request.put("recipientEmail", execution.getVariable("recipientEmail"));
        request.put("customerName", execution.getVariable("customerName"));
        request.put("daysUntilDelivery", execution.getVariable("daysUntilDelivery"));
        request.put("deliveryDay", execution.getVariable("deliveryDay"));
        request.put("deliveryDate", mailValue(execution, "deliveryDateLabel", "deliveryDate"));
        request.put("deliveryWindow", execution.getVariable("deliveryWindow"));
        request.put("orderNumber", execution.getVariable("orderNumber"));
        request.put("supplierName", execution.getVariable("supplierName"));
        request.put("deliveryLocation", execution.getVariable("deliveryLocation"));
        request.put("deliveryInstructions", execution.getVariable("deliveryInstructions"));
        request.put("deliveryDetailsUrl", execution.getVariable("deliveryDetailsUrl"));
        Map<String, Object> deliveryItem = new HashMap<>();
        deliveryItem.put("name", execution.getVariable("itemName"));
        deliveryItem.put("articleNumber", execution.getVariable("itemArticleNumber"));
        deliveryItem.put("quantity", execution.getVariable("itemQuantity"));
        request.put("deliveryItems", List.of(deliveryItem));

        new RestTemplate().postForEntity(
                mailServiceBaseUrl + "/emails/delivery-announcement",
                request,
                String.class
        );

        log.info("Delivery announcement sent for {}", execution.getVariable("recipientEmail"));
    }

    private Object mailValue(DelegateExecution execution, String preferredVariable, String fallbackVariable) {
        Object preferredValue = execution.getVariable(preferredVariable);
        return preferredValue != null ? preferredValue : execution.getVariable(fallbackVariable);
    }
}
