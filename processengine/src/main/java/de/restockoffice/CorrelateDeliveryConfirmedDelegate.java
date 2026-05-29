package de.restockoffice;

import org.cibseven.bpm.engine.RuntimeService;
import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.cibseven.bpm.engine.delegate.JavaDelegate;
import org.cibseven.bpm.engine.runtime.Execution;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component("correlateDeliveryConfirmedDelegate")
//Correlation between Restocker Process and Delivery Process so ReStockOffice then sends the confirmation Mail to the customer
public class CorrelateDeliveryConfirmedDelegate implements JavaDelegate {

    private static final Logger log = LoggerFactory.getLogger(CorrelateDeliveryConfirmedDelegate.class);
    private static final String DELIVERY_CONFIRMED_MESSAGE = "DeliveryConfirmed";

    private final RuntimeService runtimeService;

    public CorrelateDeliveryConfirmedDelegate(RuntimeService runtimeService) {
        this.runtimeService = runtimeService;
    }

    @Override
    public void execute(DelegateExecution execution) {
        String deliveryId = firstNonBlank(
                stringVariable(execution, "deliveredDeliveryId"),
                stringVariable(execution, "deliveryId")
        );

        if (deliveryId == null) {
            throw new IllegalStateException("deliveryId or deliveredDeliveryId is required to confirm a delivery.");
        }

        Execution waitingDeliveryProcess = runtimeService
                .createExecutionQuery()
                .messageEventSubscriptionName(DELIVERY_CONFIRMED_MESSAGE)
                .processInstanceBusinessKey(deliveryId)
                .singleResult();

        if (waitingDeliveryProcess == null) {
            log.info("No waiting delivery process found for delivery {}; skipping duplicate confirmation", deliveryId);
            return;
        }

        runtimeService
                .createMessageCorrelation(DELIVERY_CONFIRMED_MESSAGE)
                .processInstanceBusinessKey(deliveryId)
                .setVariable("deliveryId", deliveryId)
                .setVariable("deliveredDeliveryId", deliveryId)
                .correlateWithResult();

        log.info("Correlated {} for delivery {}", DELIVERY_CONFIRMED_MESSAGE, deliveryId);
    }

    private String stringVariable(DelegateExecution execution, String variableName) {
        Object value = execution.getVariable(variableName);
        return value != null && !value.toString().isBlank() ? value.toString() : null;
    }

    private String firstNonBlank(String firstValue, String secondValue) {
        return firstValue != null ? firstValue : secondValue;
    }
}
