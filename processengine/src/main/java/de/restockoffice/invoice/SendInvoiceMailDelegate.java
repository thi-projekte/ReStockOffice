package de.restockoffice.invoice;

import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.cibseven.bpm.engine.delegate.JavaDelegate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.security.oauth2.client.OAuth2AuthorizeRequest;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientManager;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import java.util.Map;

@Component("sendInvoiceMailDelegate")
public class SendInvoiceMailDelegate implements JavaDelegate {

    private final RestClient invoiceClient;

    public SendInvoiceMailDelegate(
            @Value("${invoiceservice.base-url}") String invoiceUrl,
            OAuth2AuthorizedClientManager authorizedClientManager) {

        ClientHttpRequestInterceptor authInterceptor = (request, body, env) -> {
            OAuth2AuthorizeRequest authorizeRequest = OAuth2AuthorizeRequest
                    .withClientRegistrationId("keycloak") // Matcht exakt das 'keycloak:' aus deiner yml
                    .principal("CamundaTimerService")
                    .build();

            OAuth2AuthorizedClient authorizedClient = authorizedClientManager.authorize(authorizeRequest);
            if (authorizedClient != null && authorizedClient.getAccessToken() != null) {
                String token = authorizedClient.getAccessToken().getTokenValue();
                request.getHeaders().setBearerAuth(token);
            }
            return env.execute(request, body);
        };

        // Client mit dem Interceptor bauen
        this.invoiceClient = RestClient.builder()
                .baseUrl(invoiceUrl)
                .requestInterceptor(authInterceptor)
                .build();
    }

    @Override
    public void execute(DelegateExecution execution) throws Exception {

        // Holt die temporär gemerkten Daten aus dem vorherigen Schritt
        Map<String, Object> invoiceRequest = (Map<String, Object>) execution.getVariable("tempInvoiceRequest");
        String invoiceNumber = (String) execution.getVariable("generatedInvoiceNumber");

        if (invoiceRequest == null || invoiceNumber == null) {
            throw new IllegalStateException("Rechnungsdaten für den E-Mail-Versand fehlen im Prozesskontext!");
        }

        // Von Quarkus generierte echte Rechnungsnummer in das Request-Objekt einsetzen
        invoiceRequest.put("invoiceNumber", invoiceNumber);

        // HTTP POST an InvoiceResource
        invoiceClient.post()
                .uri("/invoices/send-mail")
                .body(invoiceRequest)
                .retrieve()
                .toBodilessEntity();

        // Temporäre Variablen löschen
        execution.removeVariable("tempInvoiceRequest");
        execution.removeVariable("generatedInvoiceNumber");
    }
}
