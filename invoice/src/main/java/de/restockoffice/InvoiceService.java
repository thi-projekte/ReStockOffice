package de.restockoffice;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class InvoiceService {

    // Service für Generierung der PDF mittels OpenHTMLtoPDF und ZUGFeRD Konvertierung mittels MUSTANG
    @Inject PDFGenerator pdfGenerator;
    @Inject EBillingService eBillingService;
    @Inject ResendMailClient mailClient;

    public void processInvoice(InvoiceRequest request){
        // PDF Generieren
        byte[] rawPdf = pdfGenerator.createPDF(request);

        // PDF mit eRechnung Metadaten anreichern
        byte[] eBillingPdf = eBillingService.makeZUGFeRD(rawPdf, request);

        // Versenden der Mail
        mailClient.sendInvoiceMail(request.recipientEmail(), eBillingPdf);
    }
}
