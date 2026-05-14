package de.restockoffice;

import java.math.BigDecimal;
import java.math.RoundingMode;

public record InvoiceRequest(
        String recipientEmail,
        String recipientName,
        String recipientStreet,
        String recipientZip,
        String recipientCity,
        String invoiceNumber,
        String issueDate,
        BigDecimal netAmount
) {
    public BigDecimal taxAmount() {
        return netAmount.multiply(new BigDecimal("0.19")).setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal grossAmount() {
        return netAmount.add(taxAmount()).setScale(2, RoundingMode.HALF_UP);
    }
}
