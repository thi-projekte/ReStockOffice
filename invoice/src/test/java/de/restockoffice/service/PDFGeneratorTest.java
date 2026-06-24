package de.restockoffice.service;

import de.restockoffice.api.InvoiceRequest;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@QuarkusTest
class PDFGeneratorTest {

    @Inject
    PDFGenerator pdfGenerator;

    @Test
    void testCreatePDF_Success() {
        InvoiceRequest request = new InvoiceRequest("user123", "test@example.com", "Max Mustermann", "Str 1", "12345",
                "Stadt", "RE-PDF-123", "15.06.2026", "30.06.2026", new BigDecimal("100.00"), List.of());

        byte[] pdfBytes = pdfGenerator.createPDF(request);

        assertNotNull(pdfBytes, "Das generierte PDF darf nicht null sein");
        assertTrue(pdfBytes.length > 1000, "Das PDF sollte eine realistische Dateigröße (> 1KB) haben");
    }
}
