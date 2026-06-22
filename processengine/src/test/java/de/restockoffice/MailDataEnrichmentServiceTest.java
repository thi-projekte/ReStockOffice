package de.restockoffice;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import de.restockoffice.mail.MailDataEnrichmentService;
import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.lang.reflect.Proxy;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

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
                .containsEntry("deliveryLocation", "Hauptstraße 7, 12345 Berlin");
    }

    @Test
    void enrichAboConfirmationKeepsExistingUserDeliveryDayWhenProfileCannotBeLoaded() {
        Map<String, Object> variables = new HashMap<>();
        variables.put("orderId", "44");
        variables.put("customerId", "missing-customer");
        variables.put("productId", "RS-1");
        variables.put("deliveryDay", "Mittwoch");

        service.enrichAboConfirmation(execution(variables));

        assertThat(variables).containsEntry("deliveryDay", "Mittwoch");
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

    @Test
    void enrichDeliveryAnnouncementShowsUnassignedWhenRestockerIsMissing() {
        Map<String, Object> variables = new HashMap<>();
        variables.put("deliveryId", "delivery-without-restocker");
        variables.put("orderId", "42");
        variables.put("customerId", "customer-1");
        variables.put("authorizationHeader", "Bearer test-token");

        service.enrichDeliveryAnnouncement(execution(variables));

        assertThat(variables).containsEntry("supplierName", "noch nicht zugeordnet");
    }

    @Test
    void enrichDeliveryAnnouncementUsesAssignedRestockerIdentifier() {
        Map<String, Object> variables = new HashMap<>();
        variables.put("deliveryId", "delivery-with-restocker-username");
        variables.put("orderId", "42");
        variables.put("customerId", "customer-1");
        variables.put("authorizationHeader", "Bearer test-token");

        service.enrichDeliveryAnnouncement(execution(variables));

        assertThat(variables).containsEntry("supplierName", "restocker.julia");
    }

    @Test
    void enrichDeliveryConfirmationKeepsProcessSupplierWhenDetailHasNoRestocker() {
        Map<String, Object> variables = new HashMap<>();
        variables.put("deliveryId", "delivery-without-restocker");
        variables.put("orderId", "42");
        variables.put("customerId", "customer-1");
        variables.put("authorizationHeader", "Bearer test-token");
        variables.put("supplierName", "restocker.julia");

        service.enrichDeliveryConfirmation(execution(variables));

        assertThat(variables).containsEntry("supplierName", "restocker.julia");
    }

    @Test
    void enrichDeliveryAnnouncementOverwritesPreviousMultiInstanceMailData() {
        Map<String, Object> variables = new HashMap<>();
        variables.put("deliveryId", "delivery-1");
        variables.put("orderId", "42");
        variables.put("customerId", "customer-1");
        variables.put("authorizationHeader", "Bearer test-token");

        service.enrichDeliveryAnnouncement(execution(variables));

        variables.put("deliveryId", "delivery-2");
        variables.put("orderId", "43");
        variables.put("customerId", "customer-2");

        service.enrichDeliveryAnnouncement(execution(variables));

        assertThat(variables)
                .containsEntry("recipientEmail", "second@example.com")
                .containsEntry("customerName", "Second GmbH")
                .containsEntry("orderNumber", "RSO-43");
        assertThat((java.util.List<?>) variables.get("deliveryItems"))
                .singleElement()
                .satisfies(item -> {
                    Map<?, ?> deliveryItem = (Map<?, ?>) item;
                    assertThat(deliveryItem.get("name")).isEqualTo("Haftnotizen");
                    assertThat(deliveryItem.get("articleNumber")).isEqualTo("RS-2");
                    assertThat(deliveryItem.get("quantity")).isEqualTo("5 Stück");
                });
    }

    private void handleRequest(HttpExchange exchange) throws IOException {
        String path = exchange.getRequestURI().getPath();
        String query = exchange.getRequestURI().getRawQuery();
        if ("/customer".equals(path) && query != null && query.contains("missing-customer")) {
            sendJson(exchange, 404, "{}");
            return;
        }

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
            case "/orders/delivery/43" -> """
                    {
                      "id": 43,
                      "customerId": "customer-2",
                      "productId": "RS-2",
                      "status": "ACTIVE",
                      "quantity": 5,
                      "interval": 1,
                      "createdAt": "2026-06-10T10:00:00"
                    }
                    """;
            case "/orders/delivery/44" -> """
                    {
                      "id": 44,
                      "customerId": "missing-customer",
                      "productId": "RS-1",
                      "status": "ACTIVE",
                      "quantity": 2,
                      "interval": 1,
                      "createdAt": "2026-06-19T14:40:00"
                    }
                    """;
            case "/customer" -> """
                    {
                      "email": "customer@example.com",
                      "companyName": "Test GmbH",
                      "street": "Hauptstraße",
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
                      "street": "Hauptstraße",
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
            case "/api/deliveries/delivery-2/detail" -> """
                    {
                      "id": "delivery-2",
                      "orderId": "43",
                      "userId": "customer-2",
                      "recipientEmail": "second@example.com",
                      "companyName": "Second GmbH",
                      "street": "Nebenstrasse",
                      "houseNumber": "3",
                      "postalCode": "54321",
                      "city": "Muenchen",
                      "deliveryHint": "Seiteneingang nutzen.",
                      "deliveryTime": "11:00",
                      "deliveryDate": "2026-06-17",
                      "restockerName": "Rita Restocker",
                      "items": [
                        {
                          "articleNumber": "RS-2",
                          "name": "Haftnotizen",
                          "quantity": 5,
                          "unit": "Stück"
                        }
                      ]
                    }
                    """;
            case "/api/deliveries/delivery-without-restocker/detail" -> """
                    {
                      "id": "delivery-without-restocker",
                      "orderId": "42",
                      "userId": "customer-1",
                      "recipientEmail": "customer@example.com",
                      "companyName": "Test GmbH",
                      "deliveryTime": "09:30",
                      "deliveryDate": "2026-06-17",
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
            case "/api/deliveries/delivery-with-restocker-username/detail" -> """
                    {
                      "id": "delivery-with-restocker-username",
                      "orderId": "42",
                      "userId": "customer-1",
                      "recipientEmail": "customer@example.com",
                      "companyName": "Test GmbH",
                      "deliveryTime": "09:30",
                      "deliveryDate": "2026-06-17",
                      "restockerName": "restocker.julia",
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

        sendJson(exchange, 200, response);
    }

    private void sendJson(HttpExchange exchange, int statusCode, String response) throws IOException {
        byte[] body = response.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(statusCode, body.length);
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
