package de.restockoffice.abo;

import de.restockoffice.MailDataEnrichmentService;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.cibseven.bpm.engine.delegate.JavaDelegate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component("sendAboConfirmationDelegate")
public class SendAboConfirmationDelegate implements JavaDelegate {

    private static final Logger log = LoggerFactory.getLogger(SendAboConfirmationDelegate.class);

    private final MailDataEnrichmentService mailDataEnrichmentService;
    //necessary for tests
    private RestTemplate restTemplate = new RestTemplate();

    @Value("${mailservice.base-url}")
    private String mailServiceBaseUrl;

    public SendAboConfirmationDelegate(MailDataEnrichmentService mailDataEnrichmentService) {
        this.mailDataEnrichmentService = mailDataEnrichmentService;
    }

    @Override
    public void execute(DelegateExecution execution) {
        log.info("Sending abo confirmation for orders {}", execution.getVariable("orderIdsCsv"));
        mailDataEnrichmentService.enrichAboConfirmation(execution);

        Map<String, Object> request = new HashMap<>();
        request.put("recipientEmail", execution.getVariable("recipientEmail"));
        request.put("customerName", execution.getVariable("customerName"));
        request.put("orderNumber", execution.getVariable("orderNumber"));
        request.put("orderDate", execution.getVariable("orderDate"));
        request.put("deliveryWindow", execution.getVariable("deliveryWindow"));
        request.put("deliveryLocation", execution.getVariable("deliveryLocation"));
        request.put("changeDeadline", execution.getVariable("changeDeadline"));
        request.put("manageSubscriptionUrl", execution.getVariable("manageSubscriptionUrl"));

        Object orderItems = execution.getVariable("orderItems");
        if (orderItems instanceof List<?> list) {
            if (list.isEmpty()) {
                log.info(
                        "Skipping abo confirmation for {} because all changes were cancelled within the confirmation window",
                        execution.getVariable("recipientEmail")
                );
                return;
            }

            request.put("orderItems", list);
        } else {
            Map<String, Object> orderItem = new HashMap<>();
            orderItem.put("name", execution.getVariable("itemName"));
            orderItem.put("articleNumber", execution.getVariable("itemArticleNumber"));
            orderItem.put("quantity", execution.getVariable("itemQuantity"));
            orderItem.put("intervalDescription", execution.getVariable("itemIntervalDescription"));
            orderItem.put("nextDeliveryDate", execution.getVariable("itemNextDeliveryDate"));
            request.put("orderItems", List.of(orderItem));
        }

        restTemplate.postForEntity(
                mailServiceBaseUrl + "/emails/abo-confirmation",
                request,
                String.class
        );

        log.info("Abo confirmation sent for {}", execution.getVariable("recipientEmail"));
    }
}
