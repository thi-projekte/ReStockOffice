package de.restockoffice;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.List;

@ApplicationScoped
public class InvoiceService {

    private static final Logger log = LoggerFactory.getLogger(InvoiceService.class);

    // Service für Generierung der PDF mittels OpenHTMLtoPDF und ZUGFeRD Konvertierung mittels MUSTANG
    @Inject PDFGenerator pdfGenerator;
    @Inject EBillingService eBillingService;
    @Inject ResendMailClient mailClient;

    @Transactional
    public String createAndPersistInvoice(InvoiceRequest request) throws IOException{
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

        InvoiceEntity entity = new InvoiceEntity();
        entity.userId = request.userId();
        entity.invoiceNumber = generatedInvoiceNumber;
        entity.recipientName = request.recipientName();
        entity.recipientEmail = request.recipientEmail();
        entity.issueDate = request.issueDate();
        entity.netAmount = request.netAmount();
        entity.taxAmount = request.taxAmount();
        entity.grossAmount = request.grossAmount();

        entity.zugferdPdf = eBillingPdf;

        entity.persist();
        log.info("Invoice {} successfully persisted to database.", generatedInvoiceNumber);

        return generatedInvoiceNumber;
    }

    @Transactional(Transactional.TxType.SUPPORTS)
    public void sendInvoiceViaEmail(InvoiceRequest request) throws IOException {
        log.info("Fetching invoice {} from DB to send email to {}", request.invoiceNumber(), request.recipientEmail());

        InvoiceEntity entity = InvoiceEntity
                .find("invoiceNumber", request.invoiceNumber())
                .firstResult();

        if (entity == null || entity.zugferdPdf == null) {
            log.error("Cannot send email: Invoice {} not found in database!", request.invoiceNumber());
            throw new WebApplicationException("Rechnung für den Mailversand nicht in der Datenbank gefunden.", 404);
        }

        // Versenden der Mail mit dem PDF aus der Datenbank
        mailClient.sendInvoiceMail(request.recipientEmail(), entity.zugferdPdf, request);
        log.info("Invoice-mail for {} successfully sent.", request.invoiceNumber());
    }

    @Transactional
    public void processInvoice(InvoiceRequest request) throws IOException {
        // PDF Generieren
        byte[] rawPdf = pdfGenerator.createPDF(request);

        // PDF mit eRechnung Metadaten anreichern
        byte[] eBillingPdf = eBillingService.makeZUGFeRD(rawPdf, request);

        // Versenden der Mail
        mailClient.sendInvoiceMail(request.recipientEmail(), eBillingPdf, request);

        // Sichern in DB
        InvoiceEntity entity = new InvoiceEntity();
        entity.userId = request.userId();

        entity.invoiceNumber = request.invoiceNumber();
        entity.recipientName = request.recipientName();
        entity.recipientEmail = request.recipientEmail();
        entity.issueDate = request.issueDate();
        entity.netAmount = request.netAmount();
        entity.taxAmount = request.taxAmount();
        entity.grossAmount = request.grossAmount();

        entity.zugferdPdf = eBillingPdf;

        entity.persist();
    }

    public List<InvoiceEntity> getInvoicesForAccount(String userId) {
        return InvoiceEntity.list("userId", userId);
    }
}
