package de.restockoffice.exception;

public class PdfGenerationException extends RuntimeException {
    public PdfGenerationException(String message, Throwable cause) { super(message, cause); }
    public PdfGenerationException(String message) { super(message); }
}
