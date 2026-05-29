package de.restockoffice;

import java.io.Serializable;
import java.time.LocalDate;

public record DeliveryPublicationItem(
        String deliveryId,
        String orderId,
        String customerId,
        String aboId,
        LocalDate deliveryDate
) implements Serializable {
}
