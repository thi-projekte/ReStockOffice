package de.restockoffice.exception;

public class MailServiceException extends RuntimeException {
    public MailServiceException(String message, Throwable cause) { super(message, cause); }
    public MailServiceException(String message) { super(message); }
}