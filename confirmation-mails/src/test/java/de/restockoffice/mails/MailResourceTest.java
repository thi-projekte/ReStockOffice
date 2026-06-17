package de.restockoffice.mails;

import jakarta.inject.Inject;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Assertions;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class MailResourceTest {

    private static final String TEMPLATE_FIELD = "template";
    private static final String STATUS_FIELD = "status";
    private static final String QUEUED_STATUS = "queued";
    private static final String INLINE_LOGO_SRC = "src=\"cid:restockoffice-logo\"";

    @Inject
    TestResendMailClient testResendMailClient;

    @Test
    void previewAboConfirmationRendersHtmlWithPersonalizedData() {
        String payload = """
                {
                  "recipientEmail": "max.mustermann@example.com",
                  "customerName": "Max Mustermann",
                  "orderNumber": "RSO-2026-004281",
                  "orderDate": "29.04.2026, 10:42 Uhr",
                  "deliveryDay": "Montag",
                  "deliveryWindow": "08:30 bis 10:00 Uhr",
                  "deliveryLocation": "ReStockOffice GmbH\\n3. OG, Office West",
                  "changeDeadline": "02.05.2026, 12:00 Uhr",
                  "manageSubscriptionUrl": "https://restockoffice.example.com/account/orders/RSO-2026-004281",
                  "orderItems": [
                    {
                      "name": "Kopierpapier A4 Premium",
                      "articleNumber": "RS-10023",
                      "quantity": "4 Pack",
                      "intervalDescription": "Montag alle 2 Wochen",
                      "nextDeliveryDate": "04.05.2026"
                    },
                    {
                      "name": "Lineal 30cm Aluminium",
                      "articleNumber": "RS-10019",
                      "quantity": "Deabonniert",
                      "statusLabel": "Deabonniert"
                    }
                  ]
                }
                """;

        given().contentType(ContentType.JSON)
                .body(payload)
                .when()
                .post("/emails/abo-confirmation/preview")
                .then()
                .statusCode(200)
                .contentType(containsString("text/html"))
                .body(containsString("Max Mustermann"))
                .body(containsString("Bevorzugter Liefertermin:</span> Montag"))
                .body(not(containsString("Bevorzugter Liefertermin:</span> 08:30 bis 10:00 Uhr")))
                .body(containsString("Kopierpapier A4 Premium"))
                .body(containsString("4x"))
                .body(not(containsString("4 Pack")))
                .body(containsString("Deabonniert"))
                .body(not(containsString("Deabonniertx")))
                .body(containsString("<style>"));
    }

    @Test
    void sendDeliveryAnnouncementReturnsQueuedResponse() {
        String payload = """
                {
                  "recipientEmail": "max.mustermann@example.com",
                  "customerName": "Max Mustermann",
                  "daysUntilDelivery": "2",
                  "deliveryDay": "Montag",
                  "deliveryDate": "04.05.2026",
                  "deliveryWindow": "08:30 bis 10:00 Uhr",
                  "orderNumber": "RSO-2026-004281",
                  "supplierName": "Sabrina Keller",
                  "deliveryLocation": "ReStockOffice GmbH\\n3. OG, Office West",
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
                .body(TEMPLATE_FIELD, equalTo("delivery-announcement"))
                .body(STATUS_FIELD, equalTo(QUEUED_STATUS))
                .body("messageId", notNullValue());

        Assertions.assertTrue(
                testResendMailClient.lastHtml().contains(INLINE_LOGO_SRC),
                "delivery announcement mail should use an inline logo CID"
        );
    }

    @Test
    void previewDeliveryAnnouncementUsesTodayHeadlineForSameDayDelivery() {
        String payload = """
                {
                  "recipientEmail": "max.mustermann@example.com",
                  "customerName": "Max Mustermann",
                  "daysUntilDelivery": "0",
                  "deliveryDay": "Mittwoch",
                  "deliveryDate": "17.06.2026",
                  "deliveryWindow": "08:30 bis 10:00 Uhr",
                  "orderNumber": "RSO-2026-004281",
                  "supplierName": "noch nicht zugeordnet",
                  "deliveryLocation": "ReStockOffice GmbH",
                  "deliveryInstructions": "Bitte am Sideboard abstellen.",
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
                .post("/emails/delivery-announcement/preview")
                .then()
                .statusCode(200)
                .contentType(containsString("text/html"))
                .body(containsString("Deine Lieferung kommt heute an."))
                .body(not(containsString("Deine Lieferung kommt in 0 Tagen.")));
    }

    @Test
    void sendAboConfirmationUsesInlineLogoCid() {
        String payload = """
                {
                  "recipientEmail": "max.mustermann@example.com",
                  "customerName": "Max Mustermann",
                  "orderNumber": "RSO-2026-004281",
                  "orderDate": "29.04.2026, 10:42 Uhr",
                  "deliveryDay": "Montag",
                  "deliveryWindow": "08:30 bis 10:00 Uhr",
                  "deliveryLocation": "ReStockOffice GmbH\\n3. OG, Office West",
                  "changeDeadline": "02.05.2026, 12:00 Uhr",
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
                .post("/emails/abo-confirmation")
                .then()
                .statusCode(200)
                .body(TEMPLATE_FIELD, equalTo("abo-confirmation"))
                .body(STATUS_FIELD, equalTo(QUEUED_STATUS));

        Assertions.assertTrue(
                testResendMailClient.lastHtml().contains(INLINE_LOGO_SRC),
                "abo confirmation mail should use an inline logo CID"
        );
        Assertions.assertTrue(
                testResendMailClient.lastHtml().contains("4x"),
                "abo confirmation mail should render quantities as multipliers"
        );
        Assertions.assertFalse(
                testResendMailClient.lastHtml().contains("4 Pack"),
                "abo confirmation mail should not render article units in quantities"
        );
    }

    @Test
    void previewDeliveryConfirmationRendersDeliveredItemsWithoutLocationSection() {
        String payload = """
                {
                  "recipientEmail": "max.mustermann@example.com",
                  "customerName": "Max Mustermann",
                  "deliveryDate": "Freitag, 15.05.2026",
                  "deliveryWindow": "um 15:30 Uhr",
                  "orderNumber": "RSO-2026-004281",
                  "supplierName": "Sabrina Keller",
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
                .post("/emails/delivery-confirmation/preview")
                .then()
                .statusCode(200)
                .contentType(containsString("text/html"))
                .body(containsString("Deine Lieferung ist angekommen."))
                .body(containsString("Kopierpapier A4 Premium"));
    }

    @Test
    void sendDeliveryConfirmationUsesInlineLogoCid() {
        String payload = """
                {
                  "recipientEmail": "max.mustermann@example.com",
                  "customerName": "Max Mustermann",
                  "deliveryDate": "Freitag, 15.05.2026",
                  "deliveryWindow": "um 15:30 Uhr",
                  "orderNumber": "RSO-2026-004281",
                  "supplierName": "Sabrina Keller",
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
                .post("/emails/delivery-confirmation")
                .then()
                .statusCode(200)
                .body(TEMPLATE_FIELD, equalTo("delivery-confirmation"))
                .body(STATUS_FIELD, equalTo(QUEUED_STATUS));

        Assertions.assertTrue(
                testResendMailClient.lastHtml().contains(INLINE_LOGO_SRC),
                "delivery confirmation mail should use an inline logo CID"
        );
    }
}
