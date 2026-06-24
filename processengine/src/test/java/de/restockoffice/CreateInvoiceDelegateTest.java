package de.restockoffice;

import de.restockoffice.invoice.CreateInvoiceDelegate;
import de.restockoffice.invoice.InvoiceDataService;
import de.restockoffice.invoice.InvoicePreparationData;
import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;

import static org.mockito.Mockito.*;

class CreateInvoiceDelegateTest {

    private InvoiceDataService dataService;
    private RestClient invoiceClient;
    private CreateInvoiceDelegate delegate;
    private DelegateExecution execution;

    @BeforeEach
    void setUp() {
        dataService = mock(InvoiceDataService.class);
        invoiceClient = mock(RestClient.class);

        delegate = new CreateInvoiceDelegate(dataService, invoiceClient);
        execution = mock(DelegateExecution.class);
    }

    @Test
    void testExecute_NoDeliveries_SetsVariableFalse() throws Exception {
        when(execution.getVariable("customerId")).thenReturn("u1");
        when(dataService.prepareInvoiceData("u1")).thenReturn(Optional.empty());

        delegate.execute(execution);

        verify(execution).setVariable("hasDeliveries", false);
        verify(execution, never()).setVariable(eq("generatedInvoiceNumber"), any());
    }

    @Test
    void testExecute_WithDeliveries_SetsVariables() throws Exception {
        // Arrange
        String customerId = "u1";
        InvoicePreparationData data = new InvoicePreparationData(customerId, "test@mail.de", "Firma", "Str", "123",
                "Stadt", Collections.emptyList(), BigDecimal.TEN);

        when(execution.getVariable("customerId")).thenReturn(customerId);
        when(dataService.prepareInvoiceData(customerId)).thenReturn(Optional.of(data));

        // Mocking der RestClient Kette (Post -> Uri -> Body -> Retrieve -> Body)
        var postSpec = mock(RestClient.RequestBodyUriSpec.class);
        var bodySpec = mock(RestClient.RequestBodySpec.class);
        var retrieveSpec = mock(RestClient.ResponseSpec.class);

        when(invoiceClient.post()).thenReturn(postSpec);
        when(postSpec.uri(anyString())).thenReturn(bodySpec);
        when(bodySpec.body(any(Map.class))).thenReturn(bodySpec);
        when(bodySpec.retrieve()).thenReturn(retrieveSpec);
        when(retrieveSpec.body(any(org.springframework.core.ParameterizedTypeReference.class)))
                .thenReturn(Map.of("invoiceNumber", "INV-123"));

        // Act
        delegate.execute(execution);

        // Assert
        verify(execution).setVariable("hasDeliveries", true);
        verify(execution).setVariable("generatedInvoiceNumber", "INV-123");
    }
}
