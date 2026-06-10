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
