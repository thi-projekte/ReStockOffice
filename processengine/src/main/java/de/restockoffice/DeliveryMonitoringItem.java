package de.restockoffice;

import java.io.Serializable;
import java.time.LocalDate;

public record DeliveryMonitoringItem(
        String deliveryId,
        String orderId,
        String customerId,
        LocalDate deliveryDate
) implements Serializable {
}
