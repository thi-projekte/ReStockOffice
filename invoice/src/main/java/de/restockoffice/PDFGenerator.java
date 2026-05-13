package de.restockoffice;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import io.quarkus.qute.Template;

import java.io.ByteArrayOutputStream;

@ApplicationScoped
public class PDFGenerator {

    @Inject
    Template invoiceFile;

    public byte[] createPDF(InvoiceRequest request){
        String html = invoiceFile.data("invoice", request).render();

        try(ByteArrayOutputStream os = new ByteArrayOutputStream()){
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.withHtmlContent(html, "");
            builder.toStream(os);
            builder.run();

            return os.toByteArray();
        } catch (Exception e){
            throw new RuntimeException("Fehler beim Generieren des PDFs", e);
        }
    }
}
