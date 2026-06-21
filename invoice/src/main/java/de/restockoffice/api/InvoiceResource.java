package de.restockoffice.api;

import de.restockoffice.domain.InvoiceEntity;
import de.restockoffice.repository.InvoiceRepository;
import de.restockoffice.service.InvoiceService;
import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@Path("/")
@Consumes(MediaType.APPLICATION_JSON)
public class InvoiceResource {

    private static final Logger log = LoggerFactory.getLogger(InvoiceResource.class);

    @Inject
    InvoiceService invoiceService;

    @Inject
    SecurityIdentity identity;

    @Inject
    JsonWebToken jwt;

    @Inject
    InvoiceRepository invoiceRepository;

    @POST
    @Path("invoices/create")
    @Produces(MediaType.APPLICATION_JSON)
    @RolesAllowed("process-engine")
    public Response createInvoice(InvoiceRequest request) {
        log.info("Process Engine triggers: Creating invoice {} for user {}", request.invoiceNumber(), request.recipientEmail());
        String generatedNumber = invoiceService.createAndPersistInvoice(request);
        String jsonResponse = String.format("{\"invoiceNumber\":\"%s\"}", generatedNumber);

        return Response.status(Response.Status.CREATED).entity(jsonResponse).build();
    }

    @POST
    @Path("invoices/send-mail")
    @Produces(MediaType.APPLICATION_JSON)
    @jakarta.transaction.Transactional
    @RolesAllowed("process-engine")
    public Response sendInvoiceMail(InvoiceRequest request) {
        invoiceService.sendInvoiceViaEmail(request);

        return Response.accepted().build();
    }

    @POST
    @Path("emails/invoice")
    @Produces(MediaType.APPLICATION_JSON)
    @RolesAllowed("process-engine")
    public Response sendInvoice(InvoiceRequest request) {
        log.info("Sending invoice-mail to {}", request.recipientEmail());
        invoiceService.processInvoice(request);

        return Response.accepted().build();
    }

    @GET
    @Path("invoices")
    @Produces(MediaType.APPLICATION_JSON)
    @jakarta.transaction.Transactional
    @Authenticated
    public List<InvoiceEntity> getInvoices(@QueryParam("userId") String userID) {
        String loggedInId = jwt.getSubject();

        boolean isAdmin = identity.hasRole("admin");

        if (!loggedInId.equals(userID) && !isAdmin) {
            throw new WebApplicationException("Zugriff verweigert: Sie dürfen nur Ihre eigenen Rechnungen einsehen.", 403);
        }

        log.info("SPA fetches invoices for user: {}", userID);
        if (userID == null || userID.isBlank()) {
            return List.of();
        }

        return invoiceService.getInvoicesForAccount(userID);
    }

    @GET
    @Path("invoices/download")
    @Produces("application/pdf")
    @jakarta.transaction.Transactional
    @Authenticated
    public Response downloadInvoicePdf(
            @QueryParam("userId") String userId,
            @QueryParam("invoiceNumber") String invoiceNumber) {

        String loggedInId = jwt.getSubject();
        boolean isAdmin = identity.hasRole("admin");

        if (!loggedInId.equals(userId) && !isAdmin) {
            throw new WebApplicationException("Zugriff verweigert: Das ist nicht Ihre Rechnung.", 403);
        }

        log.info("Triggered PDF download for user {} and invoice number: {}", userId, invoiceNumber);
        if (userId == null || userId.isBlank() || invoiceNumber == null || invoiceNumber.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST).build();
        }

        InvoiceEntity entity = invoiceRepository.findByUserIdAndInvoiceNumber(userId, invoiceNumber)
                .orElse(null);

        if (entity == null || entity.getZugferdPdf() == null) {
            log.warn("No invoice found for user {} with invoice number {}", userId, invoiceNumber);
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        return Response.ok(entity.getZugferdPdf())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"rechnung_" + entity.getInvoiceNumber() + ".pdf\"")
                .build();
    }
}
