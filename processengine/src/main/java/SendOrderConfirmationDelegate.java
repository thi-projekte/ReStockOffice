package de.restockoffice;

import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.cibseven.bpm.engine.delegate.JavaDelegate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Component("sendOrderConfirmationDelegate")
public class SendOrderConfirmationDelegate implements JavaDelegate {

    private static final Logger log = LoggerFactory.getLogger(SendOrderConfirmationDelegate.class);

    @Value("${mailservice.base-url}")
    private String mailServiceBaseUrl;

    @Override
    public void execute(DelegateExecution execution) {
        log.info("Sending order confirmation for process instance {}", execution.getProcessInstanceId());

        var request = Map.of(
                "recipientEmail",  execution.getVariable("recipientEmail"),
                "customerName",    execution.getVariable("customerName"),
                "orderNumber",     execution.getVariable("orderId"),
                "orderDate",       execution.getVariable("orderDate"),
                "orderedBy",       execution.getVariable("orderedBy"),
                "deliveryWindow",  execution.getVariable("deliveryWindow"),
                "officeLocation",  execution.getVariable("officeLocation"),
                "deliveryLocation",execution.getVariable("deliveryLocation"),
                "deskDetails",     execution.getVariable("deskDetails"),
                "onSiteContact",   execution.getVariable("onSiteContact"),
                "changeDeadline",  execution.getVariable("changeDeadline"),
                "orderItems",      List.of(
                        Map.of(
                                "name", "Artikel",
                                "articleNumber", "ART-001",
                                "quantity", "1",
                                "intervalDescription", "Monatlich",
                                "nextDeliveryDate", execution.getVariable("deliveryWindow")
                        )
                )
        );

        new RestTemplate().postForEntity(
                mailServiceBaseUrl + "/emails/order-confirmation",
                request,
                String.class
        );

        log.info("Order confirmation sent for {}", execution.getVariable("recipientEmail"));
    }
}