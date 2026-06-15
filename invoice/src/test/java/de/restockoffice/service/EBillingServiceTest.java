package de.restockoffice.service;

import de.restockoffice.api.InvoiceRequest;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@QuarkusTest
class EBillingServiceTest {

    @Inject
    EBillingService eBillingService;

    @Test
    void testMakeZUGFeRD_ThrowsExceptionOnInvalidPdf() {
        InvoiceRequest request = new InvoiceRequest(
                "user123", "test@example.com", "Max Mustermann", "Str 1", "12345", "Stadt",
                "RE-001", "15.06.2026", "30.06.2026", new BigDecimal("100.00"), List.of()
        );

        byte[] invalidPdfBytes = "Das ist definitiv kein PDF!".getBytes();

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            eBillingService.makeZUGFeRD(invalidPdfBytes, request);
        });

        assertTrue(exception.getMessage().contains("ZUGFeRD-Generierung fehlgeschlagen"));
    }
}