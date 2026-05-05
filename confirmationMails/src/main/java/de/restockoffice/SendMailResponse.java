package de.restockoffice;

public record SendMailResponse(String template, String recipientEmail, String subject, String messageId, String status) {
}
