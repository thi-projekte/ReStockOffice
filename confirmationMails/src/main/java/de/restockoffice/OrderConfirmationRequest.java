package de.restockoffice;

import java.util.List;

public record OrderConfirmationRequest(
        String recipientEmail,
        String customerName,
        String orderNumber,
        String orderDate,
        String orderedBy,
        String deliveryWindow,
        String officeLocation,
        String deliveryLocation,
        String deskDetails,
        String onSiteContact,
        String changeDeadline,
        String supportEmail,
        String manageSubscriptionUrl,
        String logoUrl,
        String subject,
        List<OrderItem> orderItems
) {
}
