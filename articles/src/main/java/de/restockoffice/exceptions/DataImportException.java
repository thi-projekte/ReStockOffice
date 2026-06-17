package de.restockoffice.exceptions;

public class DataImportException extends RuntimeException{
    public DataImportException(String message) {
        super(message);
    }

    public DataImportException(String message, Throwable cause) {
        super(message, cause);
    }
}
