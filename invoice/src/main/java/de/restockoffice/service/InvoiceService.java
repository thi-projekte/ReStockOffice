package de.restockoffice.service;

import de.restockoffice.api.InvoiceRequest;
import de.restockoffice.domain.InvoiceEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@ApplicationScoped
public class InvoiceService {

    private static final Logger log = LoggerFactory.getLogger(InvoiceService.class);

    // Service für Generierung der PDF mittels OpenHTMLtoPDF und ZUGFeRD Konvertierung mittels MUSTANG
    @Inject
    PDFGenerator pdfGenerator;
    @Inject
    EBillingService eBillingService;
    @Inject
    ResendMailClient mailClient;

    @Transactional
    public String createAndPersistInvoice(InvoiceRequest request) {
        int year = java.time.Year.now().getValue();
        Long nextVal = (Long) InvoiceEntity.getEntityManager()
                .createNativeQuery("SELECT nextval('invoice_num_seq')")
                .getSingleResult();
        String generatedInvoiceNumber = "RE-" + year + "-" + String.format("%05d", nextVal);

        log.info("Automatically generated global invoice number: {}", generatedInvoiceNumber);

        InvoiceRequest updatedRequest = new InvoiceRequest(
                request.userId(),
                request.recipientEmail(),
                request.recipientName(),
                request.recipientStreet(),
                request.recipientZip(),
                request.recipientCity(),
                generatedInvoiceNumber,
                request.issueDate(),
                request.dueDate(),
                request.netAmount(),
                request.orderItems()
        );

        log.info("Generating PDF and ZUGFeRD metadata for invoice: {}", generatedInvoiceNumber);

        // PDF Generieren
        byte[] rawPdf = pdfGenerator.createPDF(updatedRequest);

        // PDF mit eRechnung Metadaten anreichern
        byte[] eBillingPdf = eBillingService.makeZUGFeRD(rawPdf, updatedRequest);

        InvoiceEntity entity = getInvoiceEntity(request, generatedInvoiceNumber, eBillingPdf);

        entity.persist();
        log.info("Invoice {} successfully persisted to database.", generatedInvoiceNumber);

        return generatedInvoiceNumber;
    }

    private static InvoiceEntity getInvoiceEntity(InvoiceRequest request, String generatedInvoiceNumber, byte[] eBillingPdf) {
        InvoiceEntity entity = new InvoiceEntity();
        entity.setUserId(request.userId());
        entity.setInvoiceNumber(generatedInvoiceNumber);
        entity.setRecipientName(request.recipientName());
        entity.setRecipientEmail(request.recipientEmail());
        entity.setIssueDate(request.issueDate());
        entity.setNetAmount(request.netAmount());
        entity.setTaxAmount(request.taxAmount());
        entity.setGrossAmount(request.grossAmount());

        entity.setZugferdPdf(eBillingPdf);
        return entity;
    }

    @Transactional
    public void sendInvoiceViaEmail(InvoiceRequest request) {
        log.info("Fetching invoice {} from DB to send email to {}", request.invoiceNumber(), request.recipientEmail());

        InvoiceEntity entity = InvoiceEntity
                .find("invoiceNumber", request.invoiceNumber())
                .firstResult();

        if (entity == null || entity.getZugferdPdf() == null) {
            log.error("Cannot send email: Invoice {} not found in database!", request.invoiceNumber());
            throw new WebApplicationException("Rechnung für den Mailversand nicht in der Datenbank gefunden.", 404);
        }

        // Versenden der Mail mit dem PDF aus der Datenbank
        mailClient.sendInvoiceMail(request.recipientEmail(), entity.getZugferdPdf(), request);
        log.info("Invoice-mail for {} successfully sent.", request.invoiceNumber());
    }

    @Transactional
    public void processInvoice(InvoiceRequest request) {
        // PDF Generieren
        byte[] rawPdf = pdfGenerator.createPDF(request);

        // PDF mit eRechnung Metadaten anreichern
        byte[] eBillingPdf = eBillingService.makeZUGFeRD(rawPdf, request);

        // Versenden der Mail
        mailClient.sendInvoiceMail(request.recipientEmail(), eBillingPdf, request);

        InvoiceEntity entity = getInvoiceEntity(request, request.invoiceNumber(), eBillingPdf);
        entity.persist();
    }

    @jakarta.transaction.Transactional
    public List<InvoiceEntity> getInvoicesForAccount(String userId) {
        return InvoiceEntity.list("userId", userId);
    }
}
