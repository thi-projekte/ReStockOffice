package de.restockoffice.exception;

public class ResendApiFailedException extends MailServiceException {
    public ResendApiFailedException(String message) { super(message); }
}