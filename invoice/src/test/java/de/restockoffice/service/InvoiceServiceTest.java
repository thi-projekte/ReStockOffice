package de.restockoffice.service;

import de.restockoffice.api.InvoiceRequest;
import de.restockoffice.domain.InvoiceEntity;
import de.restockoffice.repository.InvoiceRepository;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.ws.rs.WebApplicationException;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@QuarkusTest
@TestSecurity(user = "test-user", roles = { "admin" })
class InvoiceServiceTest {

    @Inject
    InvoiceService invoiceService;

    @InjectMock
    PDFGenerator pdfGenerator;

    @InjectMock
    EBillingService eBillingService;

    @InjectMock
    ResendMailClient mailClient;

    @InjectMock
    InvoiceRepository invoiceRepository;

    private static final JsonWebToken MOCK_JWT = Mockito.mock(JsonWebToken.class);

    @jakarta.enterprise.context.Dependent
    public static class TestJwtProducer {
        @jakarta.enterprise.inject.Produces
        @io.quarkus.test.Mock
        public JsonWebToken mockJwt() {
            return MOCK_JWT;
        }
    }

    @Test
    void testCreateAndPersistInvoice() {
        InvoiceRequest request = new InvoiceRequest("user123", "test@example.com", "Max Mustermann", "Str 1", "12345",
                "Stadt", null, "2026-06-15", "2026-06-30", new BigDecimal("100.00"), List.of());

        when(pdfGenerator.createPDF(any())).thenReturn(new byte[] { 1, 2, 3 });
        when(eBillingService.makeZUGFeRD(any(), any())).thenReturn(new byte[] { 4, 5, 6 });

        String invoiceNumber = invoiceService.createAndPersistInvoice(request);

        assertNotNull(invoiceNumber);
        verify(invoiceRepository).persist(any(InvoiceEntity.class));
        verify(pdfGenerator).createPDF(any());
        verify(eBillingService).makeZUGFeRD(any(), any());
    }

    @Test
    void testSendInvoiceViaEmail_Success() {
        String testInvoiceNumber = "RE-MAIL-123";
        InvoiceEntity entity = new InvoiceEntity();
        entity.setInvoiceNumber(testInvoiceNumber);
        entity.setZugferdPdf(new byte[] { 7, 8, 9 });

        when(invoiceRepository.findByInvoiceNumber(testInvoiceNumber)).thenReturn(Optional.of(entity));

        InvoiceRequest request = new InvoiceRequest("user123", "test@example.com", "Max Mustermann", "Str 1", "12345",
                "Stadt", testInvoiceNumber, "2026-06-15", "2026-06-30", new BigDecimal("100.00"), List.of());

        invoiceService.sendInvoiceViaEmail(request);

        verify(mailClient).sendInvoiceMail(eq("test@example.com"), any(byte[].class), eq(request));
    }

    @Test
    void testSendInvoiceViaEmail_NotFound() {
        when(invoiceRepository.findByInvoiceNumber("RE-UNKNOWN")).thenReturn(Optional.empty());

        InvoiceRequest request = new InvoiceRequest("user123", "test@example.com", "Max Mustermann", "Str 1", "12345",
                "Stadt", "RE-UNKNOWN", "2026-06-15", "2026-06-30", new BigDecimal("100.00"), List.of());

        assertThrows(WebApplicationException.class, () -> {
            invoiceService.sendInvoiceViaEmail(request);
        });
    }

    @Test
    void testProcessInvoice() {
        String testInvoiceNumber = "RE-PROC-001";
        InvoiceRequest request = new InvoiceRequest("user-proc", "test@example.com", "Max Mustermann", "Str 1", "12345",
                "Stadt", testInvoiceNumber, "2026-06-15", "2026-06-30", new BigDecimal("250.00"), List.of());

        when(pdfGenerator.createPDF(any())).thenReturn(new byte[] { 1, 2 });
        when(eBillingService.makeZUGFeRD(any(), any())).thenReturn(new byte[] { 3, 4 });

        invoiceService.processInvoice(request);

        verify(mailClient).sendInvoiceMail(eq("test@example.com"), any(byte[].class), eq(request));
        verify(invoiceRepository).persist(any(InvoiceEntity.class));
    }

    @Test
    void testGetInvoicesForAccount() {
        String targetUserId = "user-get-test";
        List<InvoiceEntity> mockList = List.of(new InvoiceEntity(), new InvoiceEntity());

        when(invoiceRepository.findByUserId(targetUserId)).thenReturn(mockList);

        List<InvoiceEntity> results = invoiceService.getInvoicesForAccount(targetUserId);

        assertNotNull(results);
        assertEquals(2, results.size());
        verify(invoiceRepository).findByUserId(targetUserId);
    }
}
