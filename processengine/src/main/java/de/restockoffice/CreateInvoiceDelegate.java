package de.restockoffice;

import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.cibseven.bpm.engine.delegate.JavaDelegate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.security.oauth2.client.OAuth2AuthorizeRequest;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientManager;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component("createInvoiceDelegate")
public class CreateInvoiceDelegate implements JavaDelegate {

    private final RestClient deliveryClient;
    private final RestClient articleClient;
    private final RestClient userClient;
    private final RestClient invoiceClient;

    public CreateInvoiceDelegate(
            @Value("${deliveriesservice.base-url}") String deliveryUrl,
            @Value("${articlesservice.base-url}") String articleUrl,
            @Value("${usersservice.base-url}") String userUrl,
            @Value("${invoiceservice.base-url}") String invoiceUrl,
            OAuth2AuthorizedClientManager authorizedClientManager) {

        ClientHttpRequestInterceptor authInterceptor = (request, body, env) -> {
            try{
                OAuth2AuthorizeRequest authorizeRequest = OAuth2AuthorizeRequest
                        .withClientRegistrationId("keycloak") // Matcht exakt das 'keycloak:' aus deiner yml
                        .principal("CamundaTimerService")
                        .build();

                OAuth2AuthorizedClient authorizedClient = authorizedClientManager.authorize(authorizeRequest);
                if (authorizedClient != null && authorizedClient.getAccessToken() != null) {
                    String token = authorizedClient.getAccessToken().getTokenValue();
                    request.getHeaders().add("Authorization", "Bearer " + token);
                    System.out.println("DEBUG: Token erfolgreich generiert: " + token.substring(0, 10) + "...");
                    request.getHeaders().setBearerAuth(token);
                }else{

                    System.err.println("DEBUG: ERROR - authorizedClient ist NULL oder Token fehlt!");
                }
            }catch(Exception e){
                System.err.println("DEBUG: Exception während Token-Abruf: " + e.getMessage());
                e.printStackTrace();
            }

            return env.execute(request, body);
        };

        this.deliveryClient = RestClient.builder().baseUrl(deliveryUrl).requestInterceptor(authInterceptor).build();
        this.articleClient = RestClient.builder().baseUrl(articleUrl).requestInterceptor(authInterceptor).build();
        this.userClient = RestClient.builder().baseUrl(userUrl).requestInterceptor(authInterceptor).build();
        this.invoiceClient = RestClient.builder().baseUrl(invoiceUrl).requestInterceptor(authInterceptor).build();
    }

    @Override
    public void execute(DelegateExecution execution) throws Exception {
            String customerId = (String) execution.getVariable("customerId");

            // Lieferungen des Vormonats abrufen
            List<Map<String, Object>> deliveries = deliveryClient.get()
                    .uri("/api/deliveries/customers/{customerId}/previous-month-items", customerId)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<Map<String, Object>>>() {});

            // Falls der Kunde im letzten Monat nichts geliefert bekommen hat, überspringen wir ihn
            if (deliveries == null || deliveries.isEmpty()) {
                execution.setVariable("hasDeliveries", false);
                return;
            }
            execution.setVariable("hasDeliveries", true);

            List<Map<String, Object>> orderItemsJson = new ArrayList<>();
            BigDecimal totalNet = BigDecimal.ZERO;

            // Schleife über alle gelieferten Artikel
            for (Map<String, Object> delivery : deliveries) {
                String articleNumber = (String) delivery.get("articleNumber");
                Integer quantity = (Integer) delivery.get("quantity");

                if (articleNumber == null || quantity == null) continue;

                // Artikel-Details live aus dem Article-Service laden
                Map<String, Object> article = articleClient.get()
                        .uri("/article?productId={Id}", articleNumber)
                        .retrieve()
                        .body(new ParameterizedTypeReference<Map<String, Object>>() {});

                if (article != null) {
                    Double rawPrice = (Double) article.get("price");
                    BigDecimal price = BigDecimal.valueOf(rawPrice != null ? rawPrice : 0.0);
                    BigDecimal qty = BigDecimal.valueOf(quantity);

                    BigDecimal itemTotal = price.multiply(qty);
                    totalNet = totalNet.add(itemTotal);

                    Map<String, Object> orderItem = new HashMap<>();
                    orderItem.put("description", article.get("name"));
                    orderItem.put("quantity", qty);
                    orderItem.put("price", price);
                    orderItemsJson.add(orderItem);
                }
            }

            // Adressdaten aus dem User-Service für den Briefkopf laden
            Map<String, Object> user = userClient.get()
                    .uri("/customer?userId={id}", customerId)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});

            if (user == null) {
                throw new IllegalStateException("Kundendaten konnten nicht geladen werden für ID: " + customerId);
            }

            // Request bauen
            Map<String, Object> invoiceRequest = new HashMap<>();
            invoiceRequest.put("userId", customerId);
            invoiceRequest.put("recipientEmail", user.get("email"));
            invoiceRequest.put("recipientName", user.get("companyName"));
            invoiceRequest.put("recipientStreet", user.get("street"));
            invoiceRequest.put("recipientZip", user.get("zipCode"));
            invoiceRequest.put("recipientCity", user.get("city"));
            invoiceRequest.put("invoiceNumber", ""); // von Quarkus überschrieben
            invoiceRequest.put("issueDate", LocalDate.now().toString());
            invoiceRequest.put("dueDate", LocalDate.now().plusDays(14).toString());
            invoiceRequest.put("netAmount", totalNet);
            invoiceRequest.put("orderItems", orderItemsJson);

            System.out.println("DEBUG: Sende Request an: " + invoiceClient + "/invoices/create");

            // HTTP POST an InvoiceResource senden
            Map<String, String> response = invoiceClient.post()
                    .uri("/invoices/create")
                    .body(invoiceRequest)
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, String>>() {});

            // Von Quarkus generierte Rechnungsnummer für den nächsten Schritt merken
            String generatedNumber = response != null ? response.get("invoiceNumber") : null;
            execution.setVariable("generatedInvoiceNumber", generatedNumber);

            // Den Payload temporär merken
            execution.setVariable("tempInvoiceRequest", invoiceRequest);
    }
}