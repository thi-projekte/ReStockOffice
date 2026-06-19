package de.restockoffice.common;

import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Provider
public class GlobalExceptionHandler implements ExceptionMapper<Throwable> {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @Override
    public Response toResponse(Throwable exception) {
        log.error("CRITICAL ERROR: ", exception); // Hier wird der volle Stacktrace geloggt!
        return Response.serverError().entity("Check logs for details").build();
    }
}