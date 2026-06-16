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
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.UserRepresentation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import software.amazon.awssdk.services.s3.S3Client;

import java.util.List;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

@QuarkusTest
@TestHTTPEndpoint(UserResource.class)
class UserResourceTest {

    @InjectMock S3Client s3Client;
    @InjectMock org.keycloak.admin.client.Keycloak keycloakClient;

    @BeforeEach
    void setup() {
        RestAssured.port = 8081;
    }

    @Test
    @TestSecurity(user = "max", roles = {"customer"})
    void testGetMyCustomerData() {
        PanacheMock.mock(Customer.class);
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
        PanacheMock.mock(Customer.class);
        given().when().get("/customers")
                .then().statusCode(200);
    }

    @Test
    @TestSecurity(user = "new-user", roles = {"customer"})
    void testCreateCustomer() {
        PanacheMock.mock(Customer.class);
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
        PanacheMock.mock(Customer.class);
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
        PanacheMock.mock(Customer.class);
        Mockito.when(Customer.findById("non-existent")).thenReturn(null);

        given().queryParam("userId", "non-existent")
                .when().get("/customer")
                .then().statusCode(404);
    }

    @Test
    @TestSecurity(user = "processengine", roles = {"process-engine"})
    void testRestockerDisplayNameUsesAccountHolderForTechnicalUsername() {
        PanacheMock.mock(Restocker.class);
        Restocker restocker = new Restocker();
        restocker.userId = "restocker-user-id";
        restocker.accountHolder = "Max Mustermann";

        UserRepresentation keycloakUser = new UserRepresentation();
        keycloakUser.setId("restocker-user-id");
        keycloakUser.setUsername("max.restocker");

        RealmResource realmResource = Mockito.mock(RealmResource.class);
        UsersResource usersResource = Mockito.mock(UsersResource.class);
        Mockito.when(keycloakClient.realm("restockoffice")).thenReturn(realmResource);
        Mockito.when(realmResource.users()).thenReturn(usersResource);
        Mockito.when(usersResource.searchByUsername("max.restocker", true)).thenReturn(List.of(keycloakUser));
        Mockito.when(Restocker.findById("max.restocker")).thenReturn(null);
        Mockito.when(Restocker.findById("restocker-user-id")).thenReturn(restocker);

        given().queryParam("identifier", "max.restocker")
                .when().get("/restocker/display-name")
                .then().statusCode(200)
                .body("displayName", equalTo("Max Mustermann"));
    }
}
