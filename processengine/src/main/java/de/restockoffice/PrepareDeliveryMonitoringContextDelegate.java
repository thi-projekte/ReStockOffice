package de.restockoffice;

import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.cibseven.bpm.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;

@Component("prepareDeliveryMonitoringContextDelegate")
public class PrepareDeliveryMonitoringContextDelegate implements JavaDelegate {

    @Override
    public void execute(DelegateExecution execution) {
        DeliveryMonitoringItem delivery = (DeliveryMonitoringItem) execution.getVariable("delivery");
        if (delivery == null || isBlank(delivery.deliveryId())) {
            throw new IllegalStateException("Multi-instance element variable 'delivery' is missing or invalid.");
        }

        LocalDate deliveryDate = delivery.deliveryDate();
        execution.setVariableLocal("deliveryId", delivery.deliveryId());
        execution.setVariableLocal("deliveredDeliveryId", delivery.deliveryId());
        execution.setVariableLocal("orderId", delivery.orderId());
        execution.setVariableLocal("customerId", delivery.customerId());
        execution.setVariableLocal("deliveryDate", deliveryDate != null ? deliveryDate.atTime(LocalTime.of(8, 0)).toString() : null);
        execution.setVariableLocal("deliveryDateLabel", deliveryDate != null ? deliveryDate.toString() : null);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
