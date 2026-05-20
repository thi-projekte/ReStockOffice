package de.restockoffice.mail;

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

    private static final Logger log = LoggerFactory.getLogger(sendDeliveryAnnouncementDelegate.class);

    @Value("${mailservice.base-url}")
    private String mailServiceBaseUrl;

    @Override
    public void execute(DelegateExecution execution) {
        log.info("Sending delivery announcement for order {}", execution.getVariable("orderNumber"));

        Map<String, Object> request = new HashMap<>();
        request.put("recipientEmail",      execution.getVariable("recipientEmail"));
        request.put("customerName",        execution.getVariable("customerName"));
        request.put("daysUntilDelivery",   execution.getVariable("daysUntilDelivery"));
        request.put("deliveryDate",        execution.getVariable("deliveryDate"));
        request.put("deliveryWindow",      execution.getVariable("deliveryWindow"));
        request.put("officeLocation",      execution.getVariable("officeLocation"));
        request.put("orderNumber",         execution.getVariable("orderNumber"));
        request.put("supplierName",        execution.getVariable("supplierName"));
        request.put("deliveryLocation",    execution.getVariable("deliveryLocation"));
        request.put("deskDetails",         execution.getVariable("deskDetails"));
        request.put("onSiteContact",       execution.getVariable("onSiteContact"));
        request.put("deliveryInstructions",execution.getVariable("deliveryInstructions"));
        request.put("deliveryDetailsUrl",  execution.getVariable("deliveryDetailsUrl"));
        request.put("deliveryItems", List.of(
                Map.of(
                        "name",          execution.getVariable("itemName"),
                        "articleNumber", execution.getVariable("itemArticleNumber"),
                        "quantity",      execution.getVariable("itemQuantity")
                )
        ));

        new RestTemplate().postForEntity(
                mailServiceBaseUrl + "/emails/delivery-announcement",
                request,
                String.class
        );

        log.info("Delivery announcement sent for {}", execution.getVariable("recipientEmail"));
    }
}