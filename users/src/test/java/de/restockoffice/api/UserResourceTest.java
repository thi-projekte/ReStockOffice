package de.restockoffice.api;

import de.restockoffice.domain.Customer;
import de.restockoffice.domain.Restocker;
import io.quarkus.panache.mock.PanacheMock;
import io.quarkus.test.InjectMock;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import software.amazon.awssdk.services.s3.S3Client;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

@QuarkusTest
@TestHTTPEndpoint(UserResource.class)
class UserResourceTest {

    @InjectMock S3Client s3Client;
    @InjectMock org.keycloak.admin.client.Keycloak keycloakClient;

    @BeforeEach
    void setup() {
        PanacheMock.mock(Customer.class);
        PanacheMock.mock(Restocker.class);
        RestAssured.port = 8081;
    }

    @Test
    @TestSecurity(user = "max", roles = {"customer"})
    void testGetMyCustomerData() {
        Customer c = new Customer();
        c.userId = "max";
        Mockito.when(Customer.findById("max")).thenReturn(c);

        given().contentType(ContentType.JSON)
                .when().get("/customer/me")
                .then().statusCode(200).body("userId", equalTo("max"));
    }

    @Test
    @TestSecurity(user = "admin", roles = {"admin"})
    void testGetAllCustomersAsAdmin() {
        given().when().get("/customers")
                .then().statusCode(200);
    }

    @Test
    @TestSecurity(user = "new-user", roles = {"customer"})
    void testCreateCustomer() {
        Customer c = new Customer();
        c.userId = "new-user";

        Mockito.when(Customer.findById("new-user")).thenReturn(null);
        PanacheMock.doNothing().when(Customer.class).persist();

        given().contentType(ContentType.JSON)
                .body(c)
                .when().post("/customer/create")
                .then().statusCode(201);
    }

    @Test
    @TestSecurity(user = "max", roles = {"customer"})
    void testUpdateCustomerWithoutFile() {
        Customer c = new Customer();
        c.userId = "max";
        Mockito.when(Customer.findById("max")).thenReturn(c);

        given().multiPart("userData", "{\"city\":\"Berlin\"}", "application/json")
                .when().post("/customer/update")
                .then().statusCode(200);
    }

    @Test
    @TestSecurity(user = "hacker", roles = {"unknown"})
    void testAccessDeniedToAdminEndpoint() {
        given().when().get("/customers")
                .then().statusCode(403);
    }

    @Test
    @TestSecurity(user = "non-existent", roles = {"customer"})
    void testCustomerNotFound() {
        Mockito.when(Customer.findById("non-existent")).thenReturn(null);

        given().queryParam("userId", "non-existent")
                .when().get("/customer")
                .then().statusCode(404);
    }
}