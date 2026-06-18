package de.restockoffice.subscriptions;

import java.util.List;

public record AboConfirmationRequest(
        String recipientEmail,
        String customerName,
        String orderNumber,
        String orderDate,
        String deliveryDay,
        String deliveryWindow,
        String deliveryLocation,
        String changeDeadline,
        String supportEmail,
        String manageSubscriptionUrl,
        String logoUrl,
        String subject,
        List<OrderItem> orderItems
) {
}
