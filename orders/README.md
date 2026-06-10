# Orders Service

Der Orders Service verwaltet RestockOrders für eingeloggte Customer. Beim Erstellen oder Ändern einer Order wird nach dem Commit der Abo-Bestätigungsprozess gestartet und der Delivery Service für eine Neuplanung informiert.

## Base URL

```text
https://orders.restockoffice.de
```

Lokal im Dev Mode läuft der Service standardmäßig auf:

```text
http://localhost:8081
```

Alle API-Requests benötigen ein Keycloak Bearer Token:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

## APIs

### Alle RestockOrders bekommen

```http
GET /orders
```

```text
GET https://orders.restockoffice.de/orders
```

### Alle aktiven RestockOrders bekommen

```http
GET /orders/active
```

```text
GET https://orders.restockoffice.de/orders/active
```

### Alle RestockOrders des eingeloggten Users bekommen

Die UserID wird aus dem Token gelesen. Es wird keine UserID im Pfad übergeben.

```http
GET /orders/my
```

```text
GET https://orders.restockoffice.de/orders/my
```

### Bestimmte RestockOrder bekommen

```http
GET /orders/{orderId}
```

```text
GET https://orders.restockoffice.de/orders/123
```

### RestockOrder für Delivery Service bekommen

```http
GET /orders/delivery/{orderId}
```

```text
GET https://orders.restockoffice.de/orders/delivery/123
```

### RestockOrder erstellen

```http
POST /orders
```

```text
POST https://orders.restockoffice.de/orders
```

Beispiel-Body:

```json
{
  "productId": "10003",
  "status": "ACTIVE",
  "quantity": 2,
  "interval": 1
}
```

`customerId` wird serverseitig aus dem Token gesetzt.

### Abo updaten

Damit können Menge, Intervall und optional der Status geändert werden.

```http
PUT /orders/{orderId}
```

```text
PUT https://orders.restockoffice.de/orders/123
```

Beispiel-Body:

```json
{
  "status": "ACTIVE",
  "quantity": 4,
  "interval": 2
}
```

### CustomerID für Orders ersetzen

Admin-Hilfsendpoint, z.B. wenn Orders auf eine andere CustomerID umgehängt werden müssen.

```http
PUT /orders/admin/customer-id
```

Beispiel-Body:

```json
{
  "oldCustomerId": "alte-user-id",
  "newCustomerId": "neue-user-id"
}
```

### Alle Orders löschen

```http
DELETE /orders
```

```text
DELETE https://orders.restockoffice.de/orders
```

Achtung: Dieser Endpoint löscht alle Orders.

### Bestimmte Order löschen

```http
DELETE /orders/{orderId}
```

```text
DELETE https://orders.restockoffice.de/orders/123
```

## Lokal starten

```powershell
cd orders
.\mvnw.cmd quarkus:dev
```

Falls Port `8080` schon belegt ist:

```powershell
.\mvnw.cmd quarkus:dev "-Dquarkus.http.port=8081"
```

## Tests ausführen

```powershell
cd orders
.\mvnw.cmd test
```

Nur die Orders-Tests:

```powershell
.\mvnw.cmd "-Dtest=OrderResourceTest" test
```

## Build

JVM Build:

```powershell
cd orders
.\mvnw.cmd clean package
```

Native Build:

```powershell
.\mvnw.cmd clean package -Pnative -DskipTests
```

## Image bauen und veröffentlichen

Der GitHub Actions Workflow für Orders wird durch Tags mit dem Präfix `orders-v*` gestartet.

Beispiel:

```powershell
git tag orders-v1.0.1
git push origin orders-v1.0.1
```

Vorher prüfen, welche Tags es schon gibt:

```powershell
git fetch --tags origin
git tag --list "orders-v*" --sort=-v:refname
```

Der Workflow baut und pusht das Image nach GHCR:

```text
ghcr.io/<repository-owner>/restockoffice-orders:latest
ghcr.io/<repository-owner>/restockoffice-orders:<commit-sha>
```

Im Workflow ist zusätzlich ein fixer Image-Tag eingetragen. Wenn eine neue feste Versionsnummer gebraucht wird, muss der Tag in `.github/workflows/orders.yml` angepasst werden.
