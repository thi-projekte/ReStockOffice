package de.restockoffice;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.io.IOException;
import java.util.List;

@ApplicationScoped
public class InvoiceService {

    // Service für Generierung der PDF mittels OpenHTMLtoPDF und ZUGFeRD Konvertierung mittels MUSTANG
    @Inject PDFGenerator pdfGenerator;
    @Inject EBillingService eBillingService;
    @Inject ResendMailClient mailClient;

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
