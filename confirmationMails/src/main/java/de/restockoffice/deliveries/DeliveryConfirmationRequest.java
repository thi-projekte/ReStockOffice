package de.restockoffice.deliveries;

import java.util.List;

public record DeliveryConfirmationRequest(
        String recipientEmail,
        String customerName,
        String deliveryDate,
        String deliveryWindow,
        String orderNumber,
        String supplierName,
        String supportEmail,
        String deliveryDetailsUrl,
        String logoUrl,
        String subject,
        List<DeliveryItem> deliveryItems
) {
}
