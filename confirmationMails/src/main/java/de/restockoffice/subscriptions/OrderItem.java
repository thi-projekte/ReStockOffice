package de.restockoffice.subscriptions;

public record OrderItem(
        String name,
        String articleNumber,
        String quantity,
        String intervalDescription,
        String nextDeliveryDate,
        String statusLabel
) {
}
