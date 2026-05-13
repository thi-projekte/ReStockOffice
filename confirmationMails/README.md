# ReStockOffice Confirmation Mail Service

Dieser Quarkus-Service verschickt die beiden E-Mails aus dem ReStockOrder-Prozess:

- Bestellbestaetigung direkt nach erfolgreicher Anlage der ReStockOrder
- Lieferankuendigung vor der anstehenden Lieferung

Die Mail-Inhalte basieren auf den vorhandenen HTML- und CSS-Vorlagen und werden serverseitig mit Bestell- und Lieferdaten personalisiert. Der Versand erfolgt ueber die Resend-API.

## REST-Endpunkte

```text
POST /emails/order-confirmation
POST /emails/delivery-announcement
```

Fuer Vorschau und Template-Tests:

```text
POST /emails/order-confirmation/preview
POST /emails/delivery-announcement/preview
```

## Konfiguration

```text
RESTOCK_MAIL_SENDER=noreply@restockoffice.de
RESTOCK_MAIL_REPLY_TO=support@restockoffice.de
RESTOCK_MAIL_SUPPORT_EMAIL=support@restockoffice.de
RESTOCK_MAIL_LOGO_URL=https://restockoffice.de/assets/logo_colored.png
RESTOCK_MAIL_RESEND_API_KEY=...
RESTOCK_MAIL_RESEND_BASE_URL=https://api.resend.com
```

## Lokal starten

```bash
./mvnw quarkus:dev
```

## Build

```bash
./mvnw verify
./mvnw package -Dnative -DskipTests
```

## Deployment

Die GitHub Action unter `.github/workflows/confirmation-mails.yml` baut und publiziert das Image nach GHCR. Fuer Portainer liegt die Compose-Datei unter `confirmationMails/docker-compose.yml`.
