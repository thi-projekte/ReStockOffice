package de.restockoffice;

import static org.assertj.core.api.Assertions.assertThat;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import de.restockoffice.mail.MailDataEnrichmentService;
import java.io.IOException;
import java.lang.reflect.Proxy;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class MailDataEnrichmentServiceTest {

    private HttpServer server;
    private String baseUrl;
    private MailDataEnrichmentService service;

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", this::handleRequest);
        server.start();

        baseUrl = "http://127.0.0.1:" + server.getAddress().getPort();
        service = new MailDataEnrichmentService();
        ReflectionTestUtils.setField(service, "ordersServiceBaseUrl", baseUrl);
        ReflectionTestUtils.setField(service, "usersServiceBaseUrl", baseUrl);
        ReflectionTestUtils.setField(service, "articlesServiceBaseUrl", baseUrl);
        ReflectionTestUtils.setField(service, "deliveriesServiceBaseUrl", baseUrl);
        ReflectionTestUtils.setField(service, "appBaseUrl", "https://app.test");
    }

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void enrichAboConfirmationRefreshesDeliveryAddressAndDayFromCurrentCustomerProfile() {
        Map<String, Object> variables = new HashMap<>();
        variables.put("orderId", "42");
        variables.put("customerId", "customer-1");
        variables.put("productId", "RS-1");
        variables.put("authorizationHeader", "Bearer test-token");
        variables.put("deliveryDay", "Freitag");
        variables.put("deliveryLocation", "Lieferadresse wird nachgereicht");

        service.enrichAboConfirmation(execution(variables));

        assertThat(variables)
                .containsEntry("deliveryDay", "Montag")
                .containsEntry("deliveryLocation", "Hauptstrasse 7, 12345 Berlin");
    }

    @Test
    void enrichDeliveryAnnouncementFormatsDateAndUsesDeliveryDetailItems() {
        Map<String, Object> variables = new HashMap<>();
        variables.put("deliveryId", "delivery-1");
        variables.put("orderId", "42");
        variables.put("customerId", "customer-1");
        variables.put("authorizationHeader", "Bearer test-token");
        variables.put("deliveryDateLabel", "2026-06-17");

        service.enrichDeliveryAnnouncement(execution(variables));

        assertThat(variables)
                .containsEntry("deliveryDateLabel", "17.06.2026")
                .containsEntry("recipientEmail", "customer@example.com")
                .containsEntry("customerName", "Test GmbH")
                .containsEntry("supplierName", "Rita Restocker");
        assertThat((java.util.List<?>) variables.get("deliveryItems"))
                .singleElement()
                .satisfies(item -> {
                    Map<?, ?> deliveryItem = (Map<?, ?>) item;
                    assertThat(deliveryItem.get("name")).isEqualTo("Kopierpapier");
                    assertThat(deliveryItem.get("articleNumber")).isEqualTo("RS-1");
                    assertThat(deliveryItem.get("quantity")).isEqualTo("2 Pack");
                });
    }

    @Test
    void enrichDeliveryConfirmationFormatsDateWithoutChangingAboFlow() {
        Map<String, Object> variables = new HashMap<>();
        variables.put("deliveryId", "delivery-1");
        variables.put("orderId", "42");
        variables.put("customerId", "customer-1");
        variables.put("authorizationHeader", "Bearer test-token");
        variables.put("deliveryDateLabel", "2026-06-17");

        service.enrichDeliveryConfirmation(execution(variables));

        assertThat(variables)
                .containsEntry("deliveryDateLabel", "17.06.2026")
                .containsEntry("supplierName", "Rita Restocker");
        assertThat((java.util.List<?>) variables.get("deliveryItems")).hasSize(1);
    }

    private void handleRequest(HttpExchange exchange) throws IOException {
        String path = exchange.getRequestURI().getPath();
        String response = switch (path) {
            case "/orders/delivery/42" -> """
                    {
                      "id": 42,
                      "customerId": "customer-1",
                      "productId": "RS-1",
                      "status": "ACTIVE",
                      "quantity": 2,
                      "interval": 1,
                      "createdAt": "2026-06-10T10:00:00"
                    }
                    """;
            case "/customer" -> """
                    {
                      "email": "customer@example.com",
                      "companyName": "Test GmbH",
                      "street": "Hauptstrasse",
                      "houseNumber": "7",
                      "postalCode": "12345",
                      "city": "Berlin",
                      "deliveryDay": "Montag",
                      "deliveryTime": 8
                    }
                    """;
            case "/article" -> """
                    {
                      "productId": "RS-1",
                      "name": "Kopierpapier",
                      "unit": "Pack"
                    }
                    """;
            case "/api/deliveries/delivery-1/detail" -> """
                    {
                      "id": "delivery-1",
                      "orderId": "42",
                      "userId": "customer-1",
                      "recipientEmail": "customer@example.com",
                      "companyName": "Test GmbH",
                      "street": "Hauptstrasse",
                      "houseNumber": "7",
                      "postalCode": "12345",
                      "city": "Berlin",
                      "deliveryHint": "Bitte am Empfang abgeben.",
                      "deliveryTime": "09:30",
                      "deliveryDate": "2026-06-17",
                      "restockerName": "Rita Restocker",
                      "items": [
                        {
                          "articleNumber": "RS-1",
                          "name": "Kopierpapier",
                          "quantity": 2,
                          "unit": "Pack"
                        }
                      ]
                    }
                    """;
            default -> "{}";
        };

        byte[] body = response.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, body.length);
        exchange.getResponseBody().write(body);
        exchange.close();
    }

    private DelegateExecution execution(Map<String, Object> variables) {
        return (DelegateExecution) Proxy.newProxyInstance(
                DelegateExecution.class.getClassLoader(),
                new Class<?>[]{DelegateExecution.class},
                (proxy, method, args) -> {
                    if ("getVariable".equals(method.getName())) {
                        return variables.get(args[0]);
                    }
                    if ("setVariable".equals(method.getName())) {
                        variables.put((String) args[0], args[1]);
                        return null;
                    }
                    return defaultValue(method.getReturnType());
                }
        );
    }

    private Object defaultValue(Class<?> returnType) {
        if (!returnType.isPrimitive()) {
            return null;
        }
        if (boolean.class.equals(returnType)) {
            return false;
        }
        if (char.class.equals(returnType)) {
            return '\0';
        }
        return 0;
    }
}
