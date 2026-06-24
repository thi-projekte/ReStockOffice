package de.restockoffice.exception;

public class PdfResourceMissingException extends PdfGenerationException {
    public PdfResourceMissingException(String message) {
        super(message);
    }
}
