package de.restockoffice;

import de.restockoffice.invoice.SendInvoiceMailDelegate;
import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.Map;

import static org.mockito.Mockito.*;

class SendInvoiceMailDelegateTest {

    private RestClient invoiceClient;
    private SendInvoiceMailDelegate delegate;
    private DelegateExecution execution;

    @BeforeEach
    void setUp() {
        invoiceClient = mock(RestClient.class);
        delegate = new SendInvoiceMailDelegate(invoiceClient);
        execution = mock(DelegateExecution.class);
    }

    @Test
    @SuppressWarnings("unchecked")
    void testExecute_SendsMailSuccessfully() throws Exception {
        // Arrange
        Map<String, Object> mockRequest = new HashMap<>();
        mockRequest.put("userId", "123");

        when(execution.getVariable("tempInvoiceRequest")).thenReturn(mockRequest);
        when(execution.getVariable("generatedInvoiceNumber")).thenReturn("INV-2026-001");

        // Mocking der RestClient Kette für POST
        var postSpec = mock(RestClient.RequestBodyUriSpec.class);
        var bodySpec = mock(RestClient.RequestBodySpec.class);
        var retrieveSpec = mock(RestClient.ResponseSpec.class);

        when(invoiceClient.post()).thenReturn(postSpec);
        when(postSpec.uri("/invoices/send-mail")).thenReturn(bodySpec);
        when(bodySpec.body(any(Map.class))).thenReturn(bodySpec);
        when(bodySpec.retrieve()).thenReturn(retrieveSpec);

        // Act
        delegate.execute(execution);

        // Assert: Prüfen, ob die Variablen gelöscht wurden
        verify(execution).removeVariable("tempInvoiceRequest");
        verify(execution).removeVariable("generatedInvoiceNumber");

        // Prüfen, ob der Service aufgerufen wurde
        verify(retrieveSpec).toBodilessEntity();
    }
}
