package de.restockoffice;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Path("/emails")
@Consumes(MediaType.APPLICATION_JSON)
public class InvoiceResource {

    private static final Logger log = LoggerFactory.getLogger(InvoiceResource.class);

    @POST
    @Path("/invoice")
    @Produces(MediaType.APPLICATION_JSON)
    public void sendInvoice(InvoiceRequest request){
        log.info("Sending invoice-mail to {}", request.recipientEmail());
    }
}
