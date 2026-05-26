package de.restockoffice;

import java.util.List;

public record DeliveryAnnouncementRequest(
        String recipientEmail,
        String customerName,
        String daysUntilDelivery,
        String deliveryDay,
        String deliveryDate,
        String deliveryWindow,
        String orderNumber,
        String supplierName,
        String deliveryLocation,
        String deliveryInstructions,
        String supportEmail,
        String deliveryDetailsUrl,
        String logoUrl,
        String subject,
        List<DeliveryItem> deliveryItems
) {
}
