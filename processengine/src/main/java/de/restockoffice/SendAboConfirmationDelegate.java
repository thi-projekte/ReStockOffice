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

@Component("sendAboConfirmationDelegate")
public class SendAboConfirmationDelegate implements JavaDelegate {

    private static final Logger log = LoggerFactory.getLogger(SendAboConfirmationDelegate.class);

    private final MailDataEnrichmentService mailDataEnrichmentService;

    @Value("${mailservice.base-url}")
    private String mailServiceBaseUrl;

    public SendAboConfirmationDelegate(MailDataEnrichmentService mailDataEnrichmentService) {
        this.mailDataEnrichmentService = mailDataEnrichmentService;
    }

    @Override
    public void execute(DelegateExecution execution) {
        log.info("Sending abo confirmation for order {}", execution.getVariable("orderNumber"));
        mailDataEnrichmentService.enrichAboConfirmation(execution);

        Map<String, Object> request = new HashMap<>();
        request.put("recipientEmail",        execution.getVariable("recipientEmail"));
        request.put("customerName",          execution.getVariable("customerName"));
        request.put("orderNumber",           execution.getVariable("orderNumber"));
        request.put("orderDate",             execution.getVariable("orderDate"));
        request.put("deliveryWindow",        execution.getVariable("deliveryWindow"));
        request.put("deliveryLocation",      execution.getVariable("deliveryLocation"));
        request.put("changeDeadline",        execution.getVariable("changeDeadline"));
        request.put("manageSubscriptionUrl", execution.getVariable("manageSubscriptionUrl"));
        Map<String, Object> orderItem = new HashMap<>();
        orderItem.put("name",                execution.getVariable("itemName"));
        orderItem.put("articleNumber",       execution.getVariable("itemArticleNumber"));
        orderItem.put("quantity",            execution.getVariable("itemQuantity"));
        orderItem.put("intervalDescription", execution.getVariable("itemIntervalDescription"));
        orderItem.put("nextDeliveryDate",    execution.getVariable("itemNextDeliveryDate"));
        request.put("orderItems", List.of(orderItem));

        new RestTemplate().postForEntity(
                mailServiceBaseUrl + "/emails/abo-confirmation",
                request,
                String.class
        );

        log.info("Abo confirmation sent for {}", execution.getVariable("recipientEmail"));
    }
}
