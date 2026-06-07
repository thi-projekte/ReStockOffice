package de.restockoffice;

import org.cibseven.bpm.engine.RuntimeService;
import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.cibseven.bpm.engine.delegate.JavaDelegate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component("correlateDeliveryConfirmedDelegate")
public class CorrelateDeliveryConfirmedDelegate implements JavaDelegate {

    private static final Logger log = LoggerFactory.getLogger(CorrelateDeliveryConfirmedDelegate.class);
    private static final String MESSAGE_NAME = "DeliveryConfirmed";

    private final RuntimeService runtimeService;

    public CorrelateDeliveryConfirmedDelegate(RuntimeService runtimeService) {
        this.runtimeService = runtimeService;
    }

    @Override
    public void execute(DelegateExecution execution) {
        String deliveryId = firstNonBlank(
                stringValue(execution.getVariable("deliveredDeliveryId")),
                stringValue(execution.getVariable("deliveryId"))
        );

        if (isBlank(deliveryId)) {
            throw new IllegalStateException("DeliveryConfirmed message cannot be sent without deliveryId.");
        }

        try {
            runtimeService
                    .createMessageCorrelation(MESSAGE_NAME)
                    .localVariableEquals("deliveryId", deliveryId)
                    .setVariable("deliveryId", deliveryId)
                    .setVariable("deliveredDeliveryId", deliveryId)
                    .correlate();

            log.info("Correlated {} message for delivery {}", MESSAGE_NAME, deliveryId);
        } catch (RuntimeException exception) {
            if (exception.getMessage() != null && exception.getMessage().contains("Cannot correlate")) {
                log.info("No waiting {} subscription found for delivery {}; skipping correlation", MESSAGE_NAME, deliveryId);
                return;
            }

            throw exception;
        }
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (!isBlank(value)) {
                return value;
            }
        }

        return null;
    }

    private String stringValue(Object value) {
        return value != null ? String.valueOf(value).trim() : null;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
