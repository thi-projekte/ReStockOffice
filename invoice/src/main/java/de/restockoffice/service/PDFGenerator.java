package de.restockoffice.service;

import com.openhtmltopdf.outputdevice.helper.BaseRendererBuilder.FontStyle;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import de.restockoffice.api.InvoiceRequest;
import de.restockoffice.exception.PdfRenderingFailedException;
import de.restockoffice.exception.PdfResourceMissingException;
import io.quarkus.qute.Template;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

@ApplicationScoped
public class PDFGenerator {

    @Inject
    Template invoiceFile;

    @ConfigProperty(name = "invoice.logo.url")
    String logoUrl;

    @ConfigProperty(name = "invoice.icc.profile.path", defaultValue = "/sRGB2014.icc")
    String profilePath;

    public byte[] createPDF(InvoiceRequest request) {
        String html = invoiceFile
                .data("invoice", request)
                .data("logoUrl", logoUrl)
                .render();

        try (ByteArrayOutputStream os = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();

            builder.usePdfAConformance(PdfRendererBuilder.PdfAConformance.PDFA_3_U);

            builder.useFont(() -> getClass().getResourceAsStream("/fonts/Arimo-Regular.ttf"),
                    "Arial", 400, FontStyle.NORMAL, true);
            builder.useFont(() -> getClass().getResourceAsStream("/fonts/Arimo-Bold.ttf"),
                    "Arial", 700, FontStyle.NORMAL, true);

            try (InputStream is = getClass().getResourceAsStream(profilePath)) {
                if (is == null) {
                    throw new PdfResourceMissingException("ICC-Profil nicht gefunden unter: " + profilePath);
                }

                byte[] profileData = is.readAllBytes();
                builder.useColorProfile(profileData);

                builder.withHtmlContent(html, "/");
                builder.toStream(os);
                builder.run();
            }

            return os.toByteArray();
        }catch (PdfResourceMissingException e){
            throw e;
        }
        catch (Exception e) {
            throw new PdfRenderingFailedException("Fehler beim PDF-Rendering für Rechnung " + request.invoiceNumber(), e);
        }
    }
}
