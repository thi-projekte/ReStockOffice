package de.restockoffice;

import de.restockoffice.invoice.LoadAllCustomersDelegate;
import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

import static org.mockito.Mockito.*;

class LoadAllCustomersDelegateTest {

    private RestClient restClient;
    private LoadAllCustomersDelegate delegate;
    private DelegateExecution execution;

    @BeforeEach
    void setUp() {
        restClient = mock(RestClient.class);

        RestClient.Builder builder = mock(RestClient.Builder.class);
        when(builder.baseUrl(anyString())).thenReturn(builder);
        when(builder.build()).thenReturn(restClient);

        delegate = new LoadAllCustomersDelegate(builder, "http://localhost");
        execution = mock(DelegateExecution.class);
    }

    @Test
    void testExecute_SetsCustomerListAndDate() {
        // Arrange
        String expectedMonth = LocalDate.now().minusMonths(1).format(DateTimeFormatter.ofPattern("MM.yyyy"));
        List<String> mockCustomerIds = List.of("CUST-001", "CUST-002");

        var getSpec = mock(RestClient.RequestHeadersUriSpec.class);
        var responseSpec = mock(RestClient.ResponseSpec.class);

        when(restClient.get()).thenReturn(getSpec);
        when(getSpec.uri(any(java.util.function.Function.class))).thenReturn(getSpec);
        when(getSpec.retrieve()).thenReturn(responseSpec);

        when(responseSpec.body(LoadAllCustomersDelegate.DeliveryServiceResponse.class))
                .thenReturn(new LoadAllCustomersDelegate.DeliveryServiceResponse(expectedMonth, mockCustomerIds));

        // Act
        delegate.execute(execution);

        // Assert
        verify(execution).setVariable("InvoiceForMonth", expectedMonth);
        verify(execution).setVariable("customerIdList", mockCustomerIds);
    }
}
