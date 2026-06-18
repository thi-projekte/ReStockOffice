package de.restockoffice.service;

import de.restockoffice.api.InvoiceRequest;
import de.restockoffice.domain.InvoiceEntity;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@QuarkusTest
@TestSecurity(user = "test-user", roles = {"admin"})
class InvoiceServiceTest {

    @Inject
    InvoiceService invoiceService;

    @InjectMock
    PDFGenerator pdfGenerator;

    @InjectMock
    EBillingService eBillingService;

    @InjectMock
    ResendMailClient mailClient;

    @Test
    void testCreateAndPersistInvoice() throws IOException {

        InvoiceRequest request = new InvoiceRequest(
                "user123", "test@example.com", "Max Mustermann", "Str 1", "12345", "Stadt",
                null, "2026-06-15", "2026-06-30", new java.math.BigDecimal("100.00"), List.of()
        );

        when(pdfGenerator.createPDF(any())).thenReturn(new byte[]{1, 2, 3});
        when(eBillingService.makeZUGFeRD(any(), any())).thenReturn(new byte[]{4, 5, 6});

        String invoiceNumber = invoiceService.createAndPersistInvoice(request);

        assertNotNull(invoiceNumber);
        verify(pdfGenerator).createPDF(any());
        verify(eBillingService).makeZUGFeRD(any(), any());
    }

    @Test
    @Transactional
    void testSendInvoiceViaEmail_Success() throws IOException {
        String testInvoiceNumber = "RE-MAIL-123";
        InvoiceEntity entity = new InvoiceEntity();
        entity.setInvoiceNumber(testInvoiceNumber);
        entity.setZugferdPdf(new byte[]{7, 8, 9});
        entity.persist();

        InvoiceRequest request = new InvoiceRequest(
                "user123", "test@example.com", "Max Mustermann", "Str 1", "12345", "Stadt",
                testInvoiceNumber, "2026-06-15", "2026-06-30", new BigDecimal("100.00"), List.of()
        );

        invoiceService.sendInvoiceViaEmail(request);

        verify(mailClient).sendInvoiceMail(eq("test@example.com"), any(byte[].class), eq(request));
    }

    @Test
    void testSendInvoiceViaEmail_NotFound() {
        InvoiceRequest request = new InvoiceRequest(
                "user123", "test@example.com", "Max Mustermann", "Str 1", "12345", "Stadt",
                "RE-UNKNOWN", "2026-06-15", "2026-06-30", new BigDecimal("100.00"), List.of()
        );

        WebApplicationException exception = assertThrows(WebApplicationException.class, () -> {
            invoiceService.sendInvoiceViaEmail(request);
        });

        assertEquals(404, exception.getResponse().getStatus());
    }

    @Test
    void testProcessInvoice() throws IOException {
        String testInvoiceNumber = "RE-PROC-001";
        InvoiceRequest request = new InvoiceRequest(
                "user-proc", "test@example.com", "Max Mustermann", "Str 1", "12345", "Stadt",
                testInvoiceNumber, "2026-06-15", "2026-06-30", new BigDecimal("250.00"), List.of()
        );

        when(pdfGenerator.createPDF(any())).thenReturn(new byte[]{1, 2});
        when(eBillingService.makeZUGFeRD(any(), any())).thenReturn(new byte[]{3, 4});

        invoiceService.processInvoice(request);

        verify(pdfGenerator).createPDF(request);
        verify(eBillingService).makeZUGFeRD(any(byte[].class), eq(request));
        verify(mailClient).sendInvoiceMail(eq("test@example.com"), any(byte[].class), eq(request));

        InvoiceEntity savedEntity = InvoiceEntity.find("invoiceNumber", testInvoiceNumber).firstResult();
        assertNotNull(savedEntity, "Die Rechnung sollte in der Datenbank gespeichert worden sein.");
        assertEquals("user-proc", savedEntity.getUserId());
    }

    @Test
    @Transactional
    void testGetInvoicesForAccount() {
        String targetUserId = "user-get-test";

        InvoiceEntity e1 = new InvoiceEntity();
        e1.setUserId(targetUserId);
        e1.setInvoiceNumber("RE-GET-01");
        e1.persist();

        InvoiceEntity e2 = new InvoiceEntity();
        e2.setUserId(targetUserId);
        e2.setInvoiceNumber("RE-GET-02");
        e2.persist();

        InvoiceEntity e3 = new InvoiceEntity();
        e3.setUserId("other-user");
        e3.setInvoiceNumber("RE-GET-03");
        e3.persist();

        List<InvoiceEntity> results = invoiceService.getInvoicesForAccount(targetUserId);

        assertNotNull(results);
        assertEquals(2, results.size(), "Es sollten exakt zwei Rechnungen für den User gefunden werden.");
    }
}
