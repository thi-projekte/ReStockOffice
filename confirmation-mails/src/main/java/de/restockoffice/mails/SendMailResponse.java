package de.restockoffice.mails;

public record SendMailResponse(String template, String recipientEmail, String subject, String messageId,
        String status) {
}
