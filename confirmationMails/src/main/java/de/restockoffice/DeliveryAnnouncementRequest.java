package de.restockoffice;

import java.util.List;

public record DeliveryAnnouncementRequest(
        String recipientEmail,
        String customerName,
        String daysUntilDelivery,
        String deliveryDate,
        String deliveryWindow,
        String officeLocation,
        String orderNumber,
        String supplierName,
        String deliveryLocation,
        String deskDetails,
        String onSiteContact,
        String deliveryInstructions,
        String supportEmail,
        String deliveryDetailsUrl,
        String logoUrl,
        String subject,
        List<DeliveryItem> deliveryItems
) {
}
