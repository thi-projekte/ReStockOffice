package de.restockoffice.invoice;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.*;

@Service
public class InvoiceDataService {

    private final RestClient deliveryClient;
    private final RestClient articleClient;
    private final RestClient userClient;

    public InvoiceDataService(
            @Value("${deliveriesservice.base-url}") String deliveryUrl,
            @Value("${articlesservice.base-url}") String articleUrl,
            @Value("${usersservice.base-url}") String userUrl,
            RestClient.Builder restClientBuilder) {

        this.deliveryClient = restClientBuilder.clone().baseUrl(deliveryUrl).build();
        this.articleClient = restClientBuilder.clone().baseUrl(articleUrl).build();
        this.userClient = restClientBuilder.clone().baseUrl(userUrl).build();
    }

    public Optional<InvoicePreparationData> prepareInvoiceData(String customerId) {
        List<Map<String, Object>> deliveries = deliveryClient.get()
                .uri("/api/deliveries/customers/{customerId}/previous-month-items", customerId)
                .retrieve().body(new ParameterizedTypeReference<List<Map<String, Object>>>() {});

        if (deliveries == null || deliveries.isEmpty()) return Optional.empty();

        List<Map<String, Object>> orderItems = new ArrayList<>();
        BigDecimal totalNet = BigDecimal.ZERO;

        for (Map<String, Object> delivery : deliveries) {
            String articleNumber = (String) delivery.get("articleNumber");
            Integer quantity = (Integer) delivery.get("quantity");
            if (articleNumber == null || quantity == null) continue;

            Map<String, Object> article = articleClient.get()
                    .uri("/article?productId={Id}", articleNumber)
                    .retrieve().body(new ParameterizedTypeReference<Map<String, Object>>() {});

            if (article != null) {
                BigDecimal price = BigDecimal.valueOf((Double) article.getOrDefault("price", 0.0));
                BigDecimal qty = BigDecimal.valueOf(quantity);
                totalNet = totalNet.add(price.multiply(qty));

                Map<String, Object> item = new HashMap<>();
                item.put("description", article.get("name"));
                item.put("quantity", qty);
                item.put("price", price);
                orderItems.add(item);
            }
        }

        Map<String, Object> user = userClient.get()
                .uri("/customer?userId={id}", customerId)
                .retrieve().body(new ParameterizedTypeReference<Map<String, Object>>() {});

        if (user == null) throw new IllegalStateException("Kundendaten nicht gefunden: " + customerId);

        return Optional.of(new InvoicePreparationData(
                customerId, (String) user.get("email"), (String) user.get("companyName"),
                (String) user.get("street"), (String) user.get("postalCode"), (String) user.get("city"),
                orderItems, totalNet
        ));
    }
}