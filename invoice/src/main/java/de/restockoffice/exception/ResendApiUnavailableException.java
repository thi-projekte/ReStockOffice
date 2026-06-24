package de.restockoffice.exception;

public class ResendApiUnavailableException extends MailServiceException {
    public ResendApiUnavailableException(String message) {
        super(message);
    }
}
