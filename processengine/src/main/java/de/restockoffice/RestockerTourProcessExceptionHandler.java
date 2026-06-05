package de.restockoffice;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class RestockerTourProcessExceptionHandler {

  private static final Logger LOG = LoggerFactory.getLogger(RestockerTourProcessExceptionHandler.class);

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiErrorResponse> handleException(Exception exception) throws Exception {
    if (exception instanceof NoResourceFoundException) {
      // Plain 404 for an unknown path, not an API error: rethrow so Spring's
      // default handling applies (e.g. the webapp's SPA fallback).
      throw exception;
    }
    LOG.error("Unhandled API error", exception);
    return ResponseEntity
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(new ApiErrorResponse(
            "API_ERROR",
            exception.getClass().getSimpleName(),
            exception.getMessage()));
  }

  public record ApiErrorResponse(String errorCode, String exception, String message) {
  }
}
