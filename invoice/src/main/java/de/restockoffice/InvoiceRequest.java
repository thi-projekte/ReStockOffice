package de.restockoffice;

// Defines the Request of the InvoiceRessource
public record InvoiceRequest (
        String recipientEmail,
        String invoiceNumber,
        String issueDate
) {
}
