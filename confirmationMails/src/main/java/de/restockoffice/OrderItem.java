package de.restockoffice;

public record OrderItem(String name, String articleNumber, String quantity, String intervalDescription, String nextDeliveryDate) {
}
