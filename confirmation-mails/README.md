# ReStockOffice Confirmation Mail Service

Dieser Quarkus-Service verschickt die E-Mails aus dem ReStockOffice-Prozess:

- Abo-Bestellbestätigung direkt nach Eingang der Abo-Bestellung
- Lieferankündigung vor der anstehenden Lieferung
- Lieferbestätigung nach erfolgreicher Zustellung

Die Mail-Inhalte basieren auf HTML- und CSS-Vorlagen und werden serverseitig mit Bestell- und Lieferdaten personalisiert. Der Versand erfolgt über die Resend-API.

## Aufgabe des Services

Der Service ist für transaktionale Benachrichtigungen rund um Abonnements und Lieferungen verantwortlich. Er nimmt
strukturierte JSON-Requests entgegen, validiert die Pflichtfelder, rendert das passende HTML-Template und übergibt die
fertige E-Mail an Resend.

Im Dev-Profil ist der Versand standardmässig als Dry-Run konfiguriert. Dadurch können Templates lokal gerendert und
Endpunkte getestet werden, ohne echte E-Mails zu versenden.

## REST-Endpunkte

```text
POST /emails/abo-confirmation
POST /emails/delivery-announcement
POST /emails/delivery-confirmation
```

Für Vorschau und Template-Tests:

```text
POST /emails/abo-confirmation/preview
POST /emails/delivery-announcement/preview
POST /emails/delivery-confirmation/preview
```

Für eine schnelle Browser-Vorschau mit Beispieldaten:

```text
GET /emails/abo-confirmation/preview
GET /emails/delivery-announcement/preview
GET /emails/delivery-confirmation/preview
```

Der Service läuft lokal standardmässig auf Port `8081`.

## Konfiguration

```text
RESTOCK_MAIL_SENDER=noreply@restockoffice.de
RESTOCK_MAIL_REPLY_TO=support@restockoffice.de
RESTOCK_MAIL_SUPPORT_EMAIL=support@restockoffice.de
RESTOCK_MAIL_LOGO_URL=https://nbg1.your-objectstorage.com/restockoffice/assets/branding/logo_colored.png
RESTOCK_MAIL_RESEND_API_KEY=...
RESTOCK_MAIL_RESEND_BASE_URL=https://api.resend.com
RESTOCK_MAIL_DRY_RUN=false
```

`RESTOCK_MAIL_RESEND_API_KEY` kann alternativ über `QUARKUS_MAILER_PASSWORD` gesetzt werden. Im Dev-Profil ist
`RESTOCK_MAIL_DRY_RUN` standardmässig `true`, sofern kein anderer Wert gesetzt wird.

## Projektstruktur

```text
src/main/java/de/restockoffice
|-- mails
|   |-- MailResource
|   |-- NotificationMailService
|   |-- TemplateService
|   |-- ResendMailClient
|   |-- MailSettings
|   |-- RenderedMail
|   `-- SendMailResponse
|-- deliveries
|   |-- DeliveryAnnouncementRequest
|   |-- DeliveryConfirmationRequest
|   `-- DeliveryItem
|-- subscriptions
|   |-- AboConfirmationRequest
|   `-- OrderItem
`-- validation
    |-- MailValidationException
    |-- MailValidationExceptionMapper
    `-- ValidationErrorResponse
```

Die HTML-Templates liegen unter `src/main/resources/templates`. Die Dateien mit `.example.html` dienen als statische
Beispielansichten, die produktiven Templates enthalten Platzhalter wie `{{customerName}}`, `{{deliveryDate}}` oder
`{{deliveryItemsHtml}}`.

## Beispielrequests

Abo-Bestätigung:

```json
{
  "recipientEmail": "max.mustermann@example.com",
  "customerName": "Max Mustermann",
  "orderNumber": "RSO-2026-004281",
  "orderDate": "29.04.2026, 10:42 Uhr",
  "deliveryDay": "Montag",
  "deliveryWindow": "08:30 bis 10:00 Uhr",
  "deliveryLocation": "ReStockOffice GmbH, 3. OG, Office West",
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
```

Lieferankündigung:

```json
{
  "recipientEmail": "max.mustermann@example.com",
  "customerName": "Max Mustermann",
  "daysUntilDelivery": "2",
  "deliveryDay": "Montag",
  "deliveryDate": "04.05.2026",
  "deliveryWindow": "08:30 bis 10:00 Uhr",
  "orderNumber": "RSO-2026-004281",
  "supplierName": "Sabrina Keller",
  "deliveryLocation": "ReStockOffice GmbH, 3. OG, Office West",
  "deliveryInstructions": "Bitte am Sideboard abstellen.",
  "deliveryItems": [
    {
      "name": "Kopierpapier A4 Premium",
      "articleNumber": "RS-10023",
      "quantity": "4 Pack"
    }
  ]
}
```

Lieferbestätigung:

```json
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
```

## Lokal starten

```bash
./mvnw quarkus:dev
```

Danach sind die Browser-Previews zum Beispiel unter `http://localhost:8081/emails/abo-confirmation/preview` erreichbar.

## Health Checks

Quarkus stellt die Health-Endpoints bereit:

```text
GET /q/health
GET /q/health/live
GET /q/health/ready
```

## Build

```bash
./mvnw test
./mvnw verify
./mvnw package -Dnative -DskipTests
```

## Deployment

Die GitHub Action unter `.github/workflows/confirmation-mails.yml` baut und publiziert das Image nach GHCR. Für Portainer liegt die Compose-Datei unter `confirmation-mails/docker-compose.yml`.

Das Deployment erwartet mindestens einen Resend-API-Key über `QUARKUS_MAILER_PASSWORD` oder
`RESTOCK_MAIL_RESEND_API_KEY`. Ohne API-Key kann der Service nur im Dry-Run sinnvoll genutzt werden.
