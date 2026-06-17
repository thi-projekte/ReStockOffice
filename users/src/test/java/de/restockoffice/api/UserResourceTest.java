package de.restockoffice.api;

import de.restockoffice.domain.Customer;
import de.restockoffice.domain.Restocker;
import io.quarkus.panache.mock.PanacheMock;
import io.quarkus.security.identity.SecurityIdentity;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import jakarta.transaction.TransactionSynchronizationRegistry;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.UserResource;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.UserRepresentation;
import org.mockito.Mockito;
import software.amazon.awssdk.services.s3.S3Client;

import java.util.Collections;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;

@QuarkusTest
class UserResourceTest {

    @InjectMock
    S3Client s3Client;

    @InjectMock
    Keycloak keycloakClient;

    @InjectMock
    SecurityIdentity securityIdentity;

    @InjectMock
    TransactionSynchronizationRegistry transactionSynchronizationRegistry;

    private static final JsonWebToken MOCK_JWT = Mockito.mock(JsonWebToken.class);

    @jakarta.enterprise.context.Dependent
    public static class TestJwtProducer {
        @jakarta.enterprise.inject.Produces
        @io.quarkus.test.Mock
        public JsonWebToken mockJwt() {
            return MOCK_JWT;
        }
    }

    @BeforeEach
    void setup() {
        RestAssured.port = 8081;
    }

    // ==========================================
    // CUSTOMER TESTS
    // ==========================================

    @Test
    @TestSecurity(user = "max", roles = {"customer"})
    void testGetMyCustomerData_Success() {
        Mockito.when(MOCK_JWT.getSubject()).thenReturn("cust-123");
        Mockito.when(MOCK_JWT.getClaim("email")).thenReturn("max@mustermann.de");

        PanacheMock.mock(Customer.class);
        Customer fakeCustomer = new Customer();
        fakeCustomer.userId = "cust-123";
        Mockito.when(Customer.findById("cust-123")).thenReturn(fakeCustomer);

        given()
                .when().get("/customer/me")
                .then()
                .statusCode(200)
                .body("userId", equalTo("cust-123"))
                .body("email", equalTo("max@mustermann.de"));
    }

    @Test
    @TestSecurity(user = "max", roles = {"customer"})
    void testGetMyCustomerData_NotFound() {
        Mockito.when(MOCK_JWT.getSubject()).thenReturn("unknown-id");

        PanacheMock.mock(Customer.class);
        Mockito.when(Customer.findById("unknown-id")).thenReturn(null);

        given()
                .when().get("/customer/me")
                .then()
                .statusCode(404);
    }

    @Test
    @TestSecurity(user = "admin", roles = {"admin"})
    void testGetAllCustomersAsAdmin_Success() {
        PanacheMock.mock(Customer.class);
        Mockito.when(Customer.listAll()).thenReturn(Collections.emptyList());

        given()
                .when().get("/customers")
                .then()
                .statusCode(200);
    }

    @Test
    @TestSecurity(user = "max", roles = {"customer"})
    void testGetCustomerById_AccessDenied() {
        Mockito.when(MOCK_JWT.getSubject()).thenReturn("max-id");
        Mockito.when(securityIdentity.hasRole(anyString())).thenReturn(false);

        given()
                .queryParam("userId", "other-id")
                .when().get("/customer")
                .then()
                .statusCode(403);
    }

    @Test
    @TestSecurity(user = "admin", roles = {"admin"})
    void testGetCustomerById_AsAdminWithKeycloakMock() {
        Mockito.when(MOCK_JWT.getSubject()).thenReturn("admin-id");
        Mockito.when(securityIdentity.hasRole("admin")).thenReturn(true);

        PanacheMock.mock(Customer.class);
        Customer customer = new Customer();
        customer.userId = "target-user-id";
        Mockito.when(Customer.findById("target-user-id")).thenReturn(customer);

        RealmResource realmResource = Mockito.mock(RealmResource.class);
        UsersResource usersResource = Mockito.mock(UsersResource.class);
        UserResource userResource = Mockito.mock(UserResource.class);
        UserRepresentation userRep = new UserRepresentation();
        userRep.setEmail("target@keycloak.de");

        Mockito.when(keycloakClient.realm(anyString())).thenReturn(realmResource);
        Mockito.when(realmResource.users()).thenReturn(usersResource);
        Mockito.when(usersResource.get(anyString())).thenReturn(userResource);
        Mockito.when(userResource.toRepresentation()).thenReturn(userRep);

        given()
                .queryParam("userId", "target-user-id")
                .when().get("/customer")
                .then()
                .statusCode(200)
                .body("email", equalTo("target@keycloak.de"));
    }

    @Test
    @TestSecurity(user = "new-user", roles = {"customer"})
    void testCreateCustomer_Success() {
        Mockito.when(MOCK_JWT.getSubject()).thenReturn("new-user-id");

        PanacheMock.mock(Customer.class);
        Mockito.when(Customer.findById("new-user-id")).thenReturn(null);
        PanacheMock.doNothing().when(Customer.class).persist();

        Customer body = new Customer();
        body.city = "München";

        given()
                .contentType(ContentType.JSON)
                .body(body)
                .when().post("/customer/create")
                .then()
                .statusCode(201)
                .body("userId", equalTo("new-user-id"))
                .body("city", equalTo("München"));
    }

    @Test
    @TestSecurity(user = "max", roles = {"customer"})
    void testCreateCustomer_Conflict() {
        Mockito.when(MOCK_JWT.getSubject()).thenReturn("existing-id");

        PanacheMock.mock(Customer.class);
        Mockito.when(Customer.findById("existing-id")).thenReturn(new Customer());

        Customer body = new Customer();

        given()
                .contentType(ContentType.JSON)
                .body(body)
                .when().post("/customer/create")
                .then()
                .statusCode(409);
    }

    @Test
    @TestSecurity(user = "max", roles = {"customer"})
    void testUpdateCustomer_WithMultipartAndS3() {
        Mockito.when(MOCK_JWT.getSubject()).thenReturn("cust-123");

        PanacheMock.mock(Customer.class);
        Customer existing = new Customer();
        existing.userId = "cust-123";
        existing.city = "Berlin";
        Mockito.when(Customer.findById("cust-123")).thenReturn(existing);

        Mockito.when(s3Client.putObject(any(software.amazon.awssdk.services.s3.model.PutObjectRequest.class),
                        any(software.amazon.awssdk.core.sync.RequestBody.class)))
                .thenReturn(null);

        given()
                .contentType(ContentType.MULTIPART)
                .multiPart("userData", "{\"city\":\"Hamburg\",\"deliveryDay\":\"Montag\"}", "application/json")
                .multiPart("file", "avatar.jpg", "image/jpeg".getBytes(), "image/jpeg")
                .when().post("/customer/update")
                .then()
                .statusCode(200)
                .body("city", equalTo("Hamburg"))
                .body("profilePictureUrl", equalTo("https://hel1.your-objectstorage.com/restockoffice/users/cust-123.jpg"));
    }

    // ==========================================
    // RESTOCKER TESTS
    // ==========================================

    @Test
    @TestSecurity(user = "bob", roles = {"Restocker"})
    void testGetMyRestockerData_Success() {
        Mockito.when(MOCK_JWT.getSubject()).thenReturn("restock-123");
        Mockito.when(MOCK_JWT.getClaim("email")).thenReturn("bob@restocker.de");

        PanacheMock.mock(Restocker.class);
        Restocker fakeRestocker = new Restocker();
        fakeRestocker.userId = "restock-123";
        Mockito.when(Restocker.findById("restock-123")).thenReturn(fakeRestocker);

        given()
                .when().get("/restocker/me")
                .then()
                .statusCode(200)
                .body("email", equalTo("bob@restocker.de"));
    }

    @Test
    @TestSecurity(user = "bob", roles = {"Restocker"})
    void testGetCustomerAddressForRestocker_Success() {
        Mockito.when(securityIdentity.hasRole("restocker")).thenReturn(true);

        PanacheMock.mock(Customer.class);
        Customer customer = new Customer();
        customer.userId = "cust-999";
        customer.city = "Köln";
        Mockito.when(Customer.findById("cust-999")).thenReturn(customer);

        RealmResource realmResource = Mockito.mock(RealmResource.class);
        UsersResource usersResource = Mockito.mock(UsersResource.class);
        UserResource userResource = Mockito.mock(UserResource.class);
        UserRepresentation userRep = new UserRepresentation();
        userRep.setEmail("cust-999@keycloak.de");

        Mockito.when(keycloakClient.realm(anyString())).thenReturn(realmResource);
        Mockito.when(realmResource.users()).thenReturn(usersResource);
        Mockito.when(usersResource.get("cust-999")).thenReturn(userResource);
        Mockito.when(userResource.toRepresentation()).thenReturn(userRep);

        given()
                .queryParam("userId", "cust-999")
                .when().get("/customerForRestocker")
                .then()
                .statusCode(200)
                .body("city", equalTo("Köln"))
                .body("email", equalTo("cust-999@keycloak.de"));
    }

    @Test
    @TestSecurity(user = "bob", roles = {"Restocker"})
    void testGetRestockerById_OwnProfileSuccess() {
        Mockito.when(MOCK_JWT.getSubject()).thenReturn("restock-123");

        PanacheMock.mock(Restocker.class);
        Restocker restocker = new Restocker();
        restocker.userId = "restock-123";
        Mockito.when(Restocker.findById("restock-123")).thenReturn(restocker);

        given()
                .queryParam("userId", "restock-123")
                .when().get("/restocker")
                .then()
                .statusCode(200)
                .body("userId", equalTo("restock-123"));
    }

    @Test
    @TestSecurity(user = "admin", roles = {"admin"})
    void testGetAllRestockersAsAdmin_Success() {
        PanacheMock.mock(Restocker.class);
        Mockito.when(Restocker.listAll()).thenReturn(Collections.emptyList());

        given()
                .when().get("/restockers")
                .then()
                .statusCode(200);
    }

    @Test
    @TestSecurity(user = "new-restocker", roles = {"Restocker"})
    void testCreateRestocker_Success() {
        Mockito.when(MOCK_JWT.getSubject()).thenReturn("new-restock-id");

        PanacheMock.mock(Restocker.class);
        Mockito.when(Restocker.findById("new-restock-id")).thenReturn(null);

        PanacheMock.doNothing().when(Restocker.class).persist();

        Restocker body = new Restocker();
        body.city = "Stuttgart";

        given()
                .contentType(ContentType.JSON)
                .body(body)
                .when().post("/restocker/create")
                .then()
                .statusCode(201)
                .body("userId", equalTo("new-restock-id"))
                .body("city", equalTo("Stuttgart"));
    }

    @Test
    @TestSecurity(user = "bob", roles = {"Restocker"})
    void testUpdateRestocker_WithMultipartAndS3() {
        Mockito.when(MOCK_JWT.getSubject()).thenReturn("restock-123");

        PanacheMock.mock(Restocker.class);
        Restocker existing = new Restocker();
        existing.userId = "restock-123";
        existing.city = "Dortmund";
        Mockito.when(Restocker.findById("restock-123")).thenReturn(existing);

        Mockito.when(s3Client.putObject(any(software.amazon.awssdk.services.s3.model.PutObjectRequest.class),
                        any(software.amazon.awssdk.core.sync.RequestBody.class)))
                .thenReturn(null);

        given()
                .contentType(ContentType.MULTIPART)
                .multiPart("userData", "{\"city\":\"Leipzig\"}", "application/json")
                .multiPart("file", "avatar.jpg", "image/jpeg".getBytes(), "image/jpeg")
                .when().post("/restocker/update")
                .then()
                .statusCode(200)
                .body("city", equalTo("Leipzig"))
                .body("profilePictureUrl", equalTo("https://hel1.your-objectstorage.com/restockoffice/users/restock-123.jpg"));
    }
}