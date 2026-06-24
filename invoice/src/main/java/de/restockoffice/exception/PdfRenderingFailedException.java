package de.restockoffice.exception;

public class PdfRenderingFailedException extends PdfGenerationException {
    public PdfRenderingFailedException(String message, Throwable cause) {
        super(message, cause);
    }
}
