package de.restockoffice;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertNull;

@QuarkusTest
@QuarkusTestResource(OrderServiceMockResource.class)
@TestSecurity(user = "customer-one", roles = "customer")
class OrderResourceTest {

    @Inject
    EntityManager entityManager;

    @BeforeEach
    void cleanOrders() {
        QuarkusTransaction.requiringNew().run(() ->
                entityManager.createQuery("delete from Order").executeUpdate()
        );
    }

    @Test
    void getAllReturnsAllOrders() {
        createOrder("customer-one", "10001", "ACTIVE", 1, 1);
        createOrder("customer-two", "10002", "CANCELLED", 2, 3);

        given()
                .when()
                .get("/orders")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("$", hasSize(2));
    }

    @Test
    void getActiveOrdersReturnsOnlyActiveOrders() {
        createOrder("customer-one", "10001", "ACTIVE", 1, 1);
        createOrder("customer-one", "10002", "CANCELLED", 2, 3);

        given()
                .when()
                .get("/orders/active")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("$", hasSize(1))
                .body("[0].status", equalTo("ACTIVE"))
                .body("[0].productId", equalTo("10001"));
    }

    @Test
    void getByIdForDeliveryReturnsSelectedOrder() {
        Order order = createOrder("customer-one", "10007", "ACTIVE", 2, 1);

        given()
                .when()
                .get("/orders/delivery/{id}", order.id)
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("id", equalTo(order.id.intValue()))
                .body("productId", equalTo("10007"));
    }

    @Test
    void getByIdForDeliveryReturnsNotFoundForMissingOrder() {
        given()
                .when()
                .get("/orders/delivery/{id}", 99999)
                .then()
                .statusCode(404);
    }

    @Test
    void getByIdReturnsSelectedOrder() {
        Order order = createOrder("customer-one", "10008", "ACTIVE", 1, 2);

        given()
                .when()
                .get("/orders/{id}", order.id)
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("id", equalTo(order.id.intValue()))
                .body("interval", equalTo(2));
    }

    @Test
    void updateOrderChangesValuesAndSetsUpdatedAt() {
        Order order = createOrder("customer-one", "10009", "ACTIVE", 1, 1);
        String payload = """
                {
                  "status": "CANCELLED",
                  "quantity": 4,
                  "interval": 2
                }
                """;

        given()
                .contentType(ContentType.JSON)
                .body(payload)
                .when()
                .put("/orders/{id}", order.id)
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("status", equalTo("CANCELLED"))
                .body("quantity", equalTo(4))
                .body("interval", equalTo(2))
                .body("updatedAt", notNullValue());
    }

    @Test
    void updateOrderKeepsStatusWhenBlankAndMarksChangeUpdated() {
        Order order = createOrder("customer-one", "10014", "ACTIVE", 1, 1);
        String payload = """
                {
                  "status": " ",
                  "quantity": 5,
                  "interval": 3
                }
                """;

        given()
                .contentType(ContentType.JSON)
                .body(payload)
                .when()
                .put("/orders/{id}", order.id)
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("status", equalTo("ACTIVE"))
                .body("quantity", equalTo(5))
                .body("interval", equalTo(3))
                .body("updatedAt", notNullValue());
    }

    @Test
    void updateOrderReturnsNotFoundForMissingOrder() {
        String payload = """
                {
                  "status": "ACTIVE",
                  "quantity": 1,
                  "interval": 1
                }
                """;

        given()
                .contentType(ContentType.JSON)
                .body(payload)
                .when()
                .put("/orders/{id}", 99999)
                .then()
                .statusCode(404);
    }

    @Test
    void replaceCustomerIdMovesMatchingOrders() {
        createOrder("old-customer", "10010", "ACTIVE", 1, 1);
        createOrder("other-customer", "10011", "ACTIVE", 1, 1);
        String payload = """
                {
                  "oldCustomerId": "old-customer",
                  "newCustomerId": "new-customer"
                }
                """;

        given()
                .contentType(ContentType.JSON)
                .body(payload)
                .when()
                .put("/orders/admin/customer-id")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("oldCustomerId", equalTo("old-customer"))
                .body("newCustomerId", equalTo("new-customer"))
                .body("updated", equalTo(1));
    }

    @Test
    void replaceCustomerIdRejectsBlankCustomerId() {
        String payload = """
                {
                  "oldCustomerId": " ",
                  "newCustomerId": "new-customer"
                }
                """;

        given()
                .contentType(ContentType.JSON)
                .body(payload)
                .when()
                .put("/orders/admin/customer-id")
                .then()
                .statusCode(400);
    }

    @Test
    void deleteAllOrdersRemovesEveryOrder() {
        createOrder("customer-one", "10012", "ACTIVE", 1, 1);
        createOrder("customer-two", "10013", "ACTIVE", 1, 1);

        given()
                .when()
                .delete("/orders")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("deleted", equalTo(2));

        given()
                .when()
                .get("/orders")
                .then()
                .statusCode(200)
                .body("$", hasSize(0));
    }

    @Test
    void createOrderPersistsOrderForAuthenticatedCustomer() {
        String payload = """
                {
                  "productId": "10003",
                  "status": "ACTIVE",
                  "quantity": 2,
                  "interval": 1
                }
                """;

        given()
                .contentType(ContentType.JSON)
                .body(payload)
                .when()
                .post("/orders")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("customerId", equalTo("customer-one"))
                .body("productId", equalTo("10003"))
                .body("status", equalTo("ACTIVE"))
                .body("quantity", equalTo(2))
                .body("interval", equalTo(1));
    }

    @Test
    void getMyOrdersReturnsOnlyAuthenticatedCustomerOrders() {
        createOrder("customer-one", "10004", "ACTIVE", 3, 1);
        createOrder("customer-two", "10005", "ACTIVE", 1, 2);

        given()
                .when()
                .get("/orders/my")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("$", hasSize(1))
                .body("[0].customerId", equalTo("customer-one"))
                .body("[0].productId", equalTo("10004"));
    }

    @Test
    void deleteOrderRemovesSelectedOrder() {
        Order order = createOrder("customer-one", "10006", "ACTIVE", 1, 1);

        given()
                .when()
                .delete("/orders/{id}", order.id)
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("id", equalTo(order.id.intValue()))
                .body("deleted", equalTo(true));

        assertNull(findOrder(order.id));
    }

    @Test
    void deleteOrderReturnsNotFoundForMissingOrder() {
        given()
                .when()
                .delete("/orders/{id}", 99999)
                .then()
                .statusCode(404);
    }

    private Order createOrder(
            String customerId,
            String productId,
            String status,
            int quantity,
            int interval
    ) {
        return QuarkusTransaction.requiringNew().call(() -> {
            Order order = Order.order(customerId, productId, status, quantity, interval);
            entityManager.persist(order);
            return order;
        });
    }

    private Order findOrder(Long id) {
        return QuarkusTransaction.requiringNew().call(() -> entityManager.find(Order.class, id));
    }
}
