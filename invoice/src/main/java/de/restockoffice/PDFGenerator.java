package de.restockoffice;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import com.openhtmltopdf.outputdevice.helper.BaseRendererBuilder.FontStyle;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import io.quarkus.qute.Template;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

@ApplicationScoped
public class PDFGenerator {

    @Inject
    Template invoiceFile;

    @ConfigProperty(name = "invoice.logo.url")
    String logoUrl;

    public byte[] createPDF(InvoiceRequest request){
        String html = invoiceFile
                .data("invoice", request)
                .data("logoUrl", logoUrl)
                .render();

        try(ByteArrayOutputStream os = new ByteArrayOutputStream()){
            PdfRendererBuilder builder = new PdfRendererBuilder();
            // builder.useFastMode();

            builder.usePdfAConformance(PdfRendererBuilder.PdfAConformance.PDFA_3_U);

            builder.useFont(() -> getClass().getResourceAsStream("/fonts/Arimo-Regular.ttf"),
                    "Arial", 400, FontStyle.NORMAL, true);
            builder.useFont(() -> getClass().getResourceAsStream("/fonts/Arimo-Bold.ttf"),
                    "Arial", 700, FontStyle.NORMAL, true);

            String profilePath = "/sRGB2014.icc";
            InputStream is = getClass().getResourceAsStream(profilePath);

            if (is == null) {
                // Dieser Block hilft uns beim Debuggen
                throw new RuntimeException("Kritischer Fehler: Die Datei " + profilePath +
                        " wurde im resources-Ordner nicht gefunden. " +
                        "Stellen Sie sicher, dass sie in src/main/resources/ liegt.");
            }

            byte[] profileData = is.readAllBytes();
            builder.useColorProfile(profileData);

            builder.withHtmlContent(html, "/");
            builder.toStream(os);
            builder.run();

            return os.toByteArray();

        } catch (Exception e){
            throw new RuntimeException("Fehler beim Generieren des PDFs: " + e.getMessage(), e);
        }
    }
}
