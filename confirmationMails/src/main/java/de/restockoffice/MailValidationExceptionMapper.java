package de.restockoffice;

import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

@Provider
public class MailValidationExceptionMapper implements ExceptionMapper<MailValidationException> {

    @Override
    public Response toResponse(MailValidationException exception) {
        return Response.status(Response.Status.BAD_REQUEST)
                .type(MediaType.APPLICATION_JSON)
                .entity(new ValidationErrorResponse(exception.getMessage()))
                .build();
    }
}
