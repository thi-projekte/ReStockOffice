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

@Component("sendDeliveryConfirmationDelegate")
public class SendDeliveryConfirmationDelegate implements JavaDelegate {

    private static final Logger log = LoggerFactory.getLogger(SendDeliveryConfirmationDelegate.class);

    @Value("${mailservice.base-url}")
    private String mailServiceBaseUrl;

    @Override
    public void execute(DelegateExecution execution) {
        log.info("Sending delivery confirmation for order {}", execution.getVariable("orderNumber"));

        Map<String, Object> request = new HashMap<>();
        request.put("recipientEmail",      execution.getVariable("recipientEmail"));
        request.put("customerName",        execution.getVariable("customerName"));
        request.put("deliveryDate",        execution.getVariable("deliveryDate"));
        request.put("deliveryWindow",      execution.getVariable("deliveryWindow"));
        request.put("orderNumber",         execution.getVariable("orderNumber"));
        request.put("supplierName",        execution.getVariable("supplierName"));
        request.put("deliveryDetailsUrl",  execution.getVariable("deliveryDetailsUrl"));
        request.put("deliveryItems", List.of(
                Map.of(
                        "name",          execution.getVariable("itemName"),
                        "articleNumber", execution.getVariable("itemArticleNumber"),
                        "quantity",      execution.getVariable("itemQuantity")
                )
        ));

        new RestTemplate().postForEntity(
                mailServiceBaseUrl + "/emails/delivery-confirmation",
                request,
                String.class
        );

        log.info("Delivery confirmation sent for {}", execution.getVariable("recipientEmail"));
    }
}
