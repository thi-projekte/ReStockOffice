package de.restockoffice.service;

import de.restockoffice.api.InvoiceRequest;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.when;

@QuarkusTest
class ResendMailClientTest {

    @Inject
    ResendMailClient resendMailClient;

    @InjectMock
    HttpClient mockHttpClient;

    HttpResponse<String> mockResponse;

    @BeforeEach
    void setup() {
        mockResponse = Mockito.mock(HttpResponse.class);
    }

    @Test
    void testSendInvoiceMail_Success() throws Exception {
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        resendMailClient.sendInvoiceMail("kunde@example.de", new byte[]{1}, createDummyRequest());

        ArgumentCaptor<HttpRequest> requestCaptor = ArgumentCaptor.forClass(HttpRequest.class);
        verify(mockHttpClient, times(1)).send(requestCaptor.capture(), any());

        HttpRequest capturedRequest = requestCaptor.getValue();
        assertEquals("POST", capturedRequest.method());
        assertTrue(capturedRequest.uri().toString().contains("/emails"));
        assertEquals("Bearer fake-key", capturedRequest.headers().firstValue("Authorization").orElse(""));
    }

    @Test
    void testSendInvoiceMail_ApiError() throws Exception {
        when(mockResponse.statusCode()).thenReturn(401);
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        InvoiceRequest request = createDummyRequest();
        byte[] pdf = new byte[]{1};

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                resendMailClient.sendInvoiceMail("kunde@example.de", pdf, request)
        );

        // Hier ändern: Gib den tatsächlichen Fehler aus, falls er nicht enthält was du erwartest
        String errorMessage = ex.getMessage();
        assertTrue(errorMessage.contains("Fehler beim E-Mail Versand via Resend"),
                "Fehlermeldung war: " + errorMessage);
    }

    private InvoiceRequest createDummyRequest() {
        return new InvoiceRequest("u1", "kunde@test.de", "Max", "Str", "123", "Stadt",
                "R-1", "01.01.2026", "14.01.2026", BigDecimal.TEN, List.of());
    }
}