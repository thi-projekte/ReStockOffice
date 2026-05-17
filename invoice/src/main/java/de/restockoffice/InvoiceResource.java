package de.restockoffice;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.List;

@Path("/")
@Consumes(MediaType.APPLICATION_JSON)
public class InvoiceResource {

    private static final Logger log = LoggerFactory.getLogger(InvoiceResource.class);

    @Inject InvoiceService invoiceService;

    @POST
    @Path("emails/invoice")
    @Produces(MediaType.APPLICATION_JSON)
    public Response sendInvoice(InvoiceRequest request) throws IOException {
        log.info("Sending invoice-mail to {}", request.recipientEmail());
        invoiceService.processInvoice(request);

        return Response.accepted().build();
    }

    @GET
    @Path("invoices")
    @Produces(MediaType.APPLICATION_JSON)
    public List<InvoiceEntity> getInvoices(@QueryParam("userId") String userID){
        log.info("SPA fetches invoices for user: {}", userID);
        if (userID == null || userID.isBlank()) {
            return List.of();
        }
        return invoiceService.getInvoicesForAccount(userID);
    }


}
