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

@Component("sendArrivalConfirmationDelegate")
public class SendOrderConfirmationDelegate implements JavaDelegate {

    private static final Logger log = LoggerFactory.getLogger(SendArrivalConfirmationDelegate.class);

    @Value("${mailservice.base-url}")
    private String mailServiceBaseUrl;

    @Override
    public void execute(DelegateExecution execution) {
        log.info("Sending arrival confirmation for order {}", execution.getVariable("orderNumber"));

        Map<String, Object> request = new HashMap<>();
        request.put("recipientEmail",        execution.getVariable("recipientEmail"));
        request.put("customerName",          execution.getVariable("customerName"));
        request.put("orderNumber",           execution.getVariable("orderNumber"));
        request.put("orderDate",             execution.getVariable("orderDate"));
        request.put("orderedBy",             execution.getVariable("orderedBy"));
        request.put("deliveryWindow",        execution.getVariable("deliveryWindow"));
        request.put("officeLocation",        execution.getVariable("officeLocation"));
        request.put("deliveryLocation",      execution.getVariable("deliveryLocation"));
        request.put("deskDetails",           execution.getVariable("deskDetails"));
        request.put("onSiteContact",         execution.getVariable("onSiteContact"));
        request.put("changeDeadline",        execution.getVariable("changeDeadline"));
        request.put("manageSubscriptionUrl", execution.getVariable("manageSubscriptionUrl"));
        request.put("orderItems", List.of(
                Map.of(
                        "name",                execution.getVariable("itemName"),
                        "articleNumber",       execution.getVariable("itemArticleNumber"),
                        "quantity",            execution.getVariable("itemQuantity"),
                        "intervalDescription", execution.getVariable("itemIntervalDescription"),
                        "nextDeliveryDate",    execution.getVariable("itemNextDeliveryDate")
                )
        ));

        new RestTemplate().postForEntity(
                mailServiceBaseUrl + "/emails/arrival-confirmation",
                request,
                String.class
        );

        log.info("Arrival confirmation sent for {}", execution.getVariable("recipientEmail"));
    }
}