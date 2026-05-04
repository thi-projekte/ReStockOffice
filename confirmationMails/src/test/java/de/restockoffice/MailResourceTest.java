package de.restockoffice;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class MailResourceTest {

    @Test
    void previewOrderConfirmationRendersHtmlWithPersonalizedData() {
        String payload = """
                {
                  "recipientEmail": "max.mustermann@example.com",
                  "customerName": "Max Mustermann",
                  "orderNumber": "RSO-2026-004281",
                  "orderDate": "29.04.2026, 10:42 Uhr",
                  "orderedBy": "Max Mustermann",
                  "deliveryWindow": "08:30 bis 10:00 Uhr",
                  "officeLocation": "HQ Ingolstadt",
                  "deliveryLocation": "ReStockOffice GmbH\\n3. OG, Office West",
                  "deskDetails": "Arbeitsplatz B-3-17",
                  "onSiteContact": "Max Mustermann",
                  "changeDeadline": "02.05.2026, 12:00 Uhr",
                  "manageSubscriptionUrl": "https://restockoffice.example.com/account/orders/RSO-2026-004281",
                  "orderItems": [
                    {
                      "name": "Kopierpapier A4 Premium",
                      "articleNumber": "RS-10023",
                      "quantity": "4 Pack",
                      "intervalDescription": "Montag alle 2 Wochen",
                      "nextDeliveryDate": "04.05.2026"
                    }
                  ]
                }
                """;

        given().contentType(ContentType.JSON)
                .body(payload)
                .when()
                .post("/emails/order-confirmation/preview")
                .then()
                .statusCode(200)
                .contentType(containsString("text/html"))
                .body(containsString("Max Mustermann"))
                .body(containsString("Kopierpapier A4 Premium"))
                .body(containsString("<style>"));
    }

    @Test
    void sendDeliveryAnnouncementReturnsQueuedResponse() {
        String payload = """
                {
                  "recipientEmail": "max.mustermann@example.com",
                  "customerName": "Max Mustermann",
                  "daysUntilDelivery": "2",
                  "deliveryDate": "04.05.2026",
                  "deliveryWindow": "08:30 bis 10:00 Uhr",
                  "officeLocation": "HQ Ingolstadt",
                  "orderNumber": "RSO-2026-004281",
                  "supplierName": "Sabrina Keller",
                  "deliveryLocation": "ReStockOffice GmbH\\n3. OG, Office West",
                  "deskDetails": "Arbeitsplatz B-3-17",
                  "onSiteContact": "Max Mustermann",
                  "deliveryInstructions": "Bitte am Sideboard abstellen.",
                  "deliveryDetailsUrl": "https://restockoffice.example.com/account/deliveries/RSO-2026-004281",
                  "deliveryItems": [
                    {
                      "name": "Kopierpapier A4 Premium",
                      "articleNumber": "RS-10023",
                      "quantity": "4 Pack"
                    }
                  ]
                }
                """;

        given().contentType(ContentType.JSON)
                .body(payload)
                .when()
                .post("/emails/delivery-announcement")
                .then()
                .statusCode(200)
                .body("template", equalTo("delivery-announcement"))
                .body("status", equalTo("queued"))
                .body("messageId", notNullValue());
    }
}
