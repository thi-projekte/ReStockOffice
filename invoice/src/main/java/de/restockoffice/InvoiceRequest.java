package de.restockoffice;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

public record InvoiceRequest(
        String userId,
        String recipientEmail,
        String recipientName,
        String recipientStreet,
        String recipientZip,
        String recipientCity,
        String invoiceNumber,
        String issueDate,
        String dueDate,
        BigDecimal netAmount,
        List<OrderItem> orderItems
) {
    public BigDecimal taxAmount() {
        return netAmount.multiply(new BigDecimal("0.19")).setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal grossAmount() {
        return netAmount.add(taxAmount()).setScale(2, RoundingMode.HALF_UP);
    }

    public record OrderItem(
            String description,
            BigDecimal quantity,
            BigDecimal price
    ) {
        public BigDecimal total() {
            return price.multiply(quantity).setScale(2, RoundingMode.HALF_UP);
        }
    }
}
