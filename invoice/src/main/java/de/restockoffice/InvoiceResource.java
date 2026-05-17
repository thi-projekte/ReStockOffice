package de.restockoffice;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Application;
import jakarta.ws.rs.core.HttpHeaders;
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

    @GET
    @Path("invoices/download")
    @Produces("application/pdf")
    public Response downloadInvoicePdf(
            @QueryParam("userId") String userId,
            @QueryParam("invoiceNumber") String invoiceNumber){
        log.info("Triggered PDF download for user {} and invoice number: {}", userId, invoiceNumber);
        if (userId == null || userId.isBlank() || invoiceNumber == null || invoiceNumber.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST).build();
        }

        InvoiceEntity entity = InvoiceEntity
                .find("userId = ?1 and invoiceNumber = ?2", userId, invoiceNumber)
                .firstResult();

        if (entity == null || entity.zugferdPdf == null) {
            log.warn("No invoice found for user {} with invoice number {}", userId, invoiceNumber);
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        return Response.ok(entity.zugferdPdf)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"rechnung_" + entity.invoiceNumber + ".pdf\"")
                .build();
    }


}
