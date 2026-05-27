# ReStockOffice Confirmation Mail Service

Dieser Quarkus-Service verschickt die E-Mails aus dem ReStockOffice-Prozess:

- Abo-Bestellbestätigung direkt nach Eingang der Abo-Bestellung
- Lieferankündigung vor der anstehenden Lieferung
- Lieferbestätigung nach erfolgreicher Zustellung

Die Mail-Inhalte basieren auf HTML- und CSS-Vorlagen und werden serverseitig mit Bestell- und Lieferdaten personalisiert. Der Versand erfolgt über die Resend-API.

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

Die GitHub Action unter `.github/workflows/confirmation-mails.yml` baut und publiziert das Image nach GHCR. Für Portainer liegt die Compose-Datei unter `confirmationMails/docker-compose.yml`.
