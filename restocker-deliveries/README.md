# restocker-deliveries

Quarkus-Service für die Planung, Annahme und operative Abwicklung von Restocker-Lieferungen in ReStockOffice.

Der Service erzeugt Deliveries aus aktiven Orders, bündelt mehrere Artikel eines Customers pro Lieferdatum, ordnet angenommene Deliveries Touren zu und stellt die Detaildaten für Restocker-, Admin- und Customer-Views bereit.

## Überblick

### Zentrale Begriffe

| Begriff | Bedeutung |
| ------- | --------- |
| `Order` | Abo-/Bestellwunsch eines Customers für ein Produkt. |
| `Delivery` | Geplante Lieferung für einen Customer an einem konkreten Datum. |
| `DeliveryItem` | Einzelne Produktposition innerhalb einer Delivery. |
| `Tour` | Lieferroute eines Restockers für ein Lieferdatum. |
| `Restocker` | Person, die Deliveries annimmt, einsammelt und zustellt. |

### Angrenzende Services

Der Delivery-Service ruft andere Services per REST Client auf:

| Service | Konfiguration | Zweck |
| ------- | ------------- | ----- |
| Orders | `ORDERS_SERVICE_URL` | Aktive Orders laden. |
| Users | `USERS_SERVICE_URL` | Customer-Adresse, Lieferhinweis, Lieferzeit und Liefertag laden. |
| Articles | `ARTICLES_SERVICE_URL` | Artikelnamen und Einheiten für Delivery-Items laden. |

Falls User-Daten nicht geladen werden können, nutzt der Service für bekannte Test-Customer lokale Fallbackdaten. Falls Artikeldaten fehlen, werden `Artikel <productId>` und `Stück` verwendet.

## Delivery-Planung

### Lazy Planning Horizon

Deliveries werden nicht täglich automatisch im Hintergrund neu berechnet. Die Planung ist lazy/on-demand und wird beim Aufruf bestimmter Endpunkte fortgeschrieben.

Aktuell plant der Service einen Horizont von **14 Tagen ab heute**:

```text
heute bis heute + 14 Tage
```

Diese Endpunkte stellen den Planungshorizont sicher:

| Endpoint | Verhalten |
| -------- | --------- |
| `GET /api/deliveries/open` | Plant fehlende Deliveries und gibt offene Deliveries im aktuellen Horizont zurück. |
| `GET /api/deliveries/assigned?restocker=...` | Plant fehlende Deliveries und gibt angenommene Deliveries dieses Restockers ab heute zurück. |
| `POST /api/deliveries/tours/today/sync?restocker=...` | Plant fehlende Deliveries und gibt die offene heutige Tour dieses Restockers zurück, falls vorhanden. |

Wenn keiner dieser Endpunkte aufgerufen wird, werden keine neuen Delivery-Datensätze erzeugt.

### Gruppierung und Eindeutigkeit

Orders werden nach `customerId` und `deliveryDate` gruppiert. Dadurch entsteht pro Customer und Lieferdatum genau eine gemeinsame Delivery. Das ist zusätzlich über die Datenbank-Unique-Constraint `uk_deliveries_user_delivery_date` auf `user_id` und `delivery_date` abgesichert.

### Welche Orders werden geplant?

Geplant werden nur Orders, die vollständig planbar sind:

| Feld | Voraussetzung |
| ---- | ------------- |
| `status` | `ACTIVE` oder nicht gesetzt. |
| `id` | Muss gesetzt sein. |
| `customerId` | Muss gesetzt und nicht leer sein. |
| `productId` | Muss gesetzt und nicht leer sein. |
| `quantity` | Werte kleiner/gleich 0 fallen auf `1` zurück. |
| `interval` | Werte kleiner/gleich 0 fallen auf wöchentlich zurück. |

Orders mit anderen Statuswerten werden ignoriert. Bereits gespeicherte Delivery-Items werden dadurch nicht automatisch entfernt.

## Lieferlogik

### Liefertag

Der feste Liefertag des Customers (`deliveryDay`) kommt aus dem User-Service und bestimmt den Wochentag der Delivery.

Unterstützt werden deutsche und englische Namen sowie Kurzformen:

```text
Montag/monday/mo, Dienstag/tuesday/di, ..., Sonntag/sunday/so
```

Falls kein gültiger `deliveryDay` gesetzt ist, nutzt der Service den Wochentag von `Order.createdAt`. Wenn auch `createdAt` fehlt, wird der aktuelle Wochentag verwendet.

### Mindestvorlaufzeit

Zwischen Order-Erstellung und erster Delivery müssen mindestens **2 vollständige Werktage** liegen. Samstage und Sonntage zählen dabei nicht als Werktage.

Beispiele für einen Customer mit Lieferdienstag:

| Order erstellt | Erste mögliche Dienstag-Delivery |
| -------------- | -------------------------------- |
| Donnerstag | nächster Dienstag |
| Freitag | übernächster Dienstag |
| Samstag | übernächster Dienstag |
| Montag | übernächster Dienstag |

Die Uhrzeit spielt dabei aktuell keine Rolle. Gerechnet wird mit dem Datum aus `createdAt`.

### Intervalle

Das Feld `interval` wird als Wochenintervall interpretiert:

| `interval` | Bedeutung |
| ---------- | --------- |
| `1` | Jede Woche |
| `2` | Alle 2 Wochen |
| `3` | Alle 3 Wochen |
| `12` | Alle 12 Wochen |

Wenn es für eine Order bereits Deliveries gibt, wird der letzte gespeicherte Delivery-Termin als Intervall-Anker verwendet. Dadurch startet ein bestehender 4-Wochen-Rhythmus nicht wieder bei Woche 0.

### Neue Produkte

Neue Orders eines Customers werden bevorzugt in bereits geplante Customer-Deliveries im aktuellen Horizont eingehängt, sofern die Mindestvorlaufzeit erfüllt ist und das Intervall passt.

Das bedeutet:

| Situation | Verhalten |
| --------- | --------- |
| Es gibt eine passende zukünftige Delivery des Customers | Neues DeliveryItem wird ergänzt. |
| Die passende Delivery ist bereits angenommen | Neues DeliveryItem kann trotzdem ergänzt werden, solange sie noch nicht ausgeliefert ist und in der Zukunft liegt. |
| Die Delivery ist bereits ausgeliefert | Sie bleibt unverändert. |
| Der Vorlauf reicht nicht | Das Produkt landet frühestens auf einem späteren passenden Termin. |

Neue Produkte werden nicht rückwirkend in alte Deliveries eingefügt.

### Änderung des Liefertags

Ändert sich der `deliveryDay`, werden bestehende Deliveries nicht verschoben oder ersetzt. Der neue Liefertag gilt erst für neu berechnete Delivery-Termine außerhalb der bereits vorhandenen Planung.

## Inkrementelles Fortschreiben

Der Service arbeitet nach einem Upsert-/Append-Prinzip:

| Fall | Verhalten |
| ---- | --------- |
| Delivery für Customer und Datum existiert nicht | Neue Delivery mit allen passenden Items wird angelegt. |
| Delivery existiert und neue Orders passen dazu | Neue Items werden angehängt. |
| Order-Menge oder Artikelstammdaten ändern sich | Bestehende Items werden nicht automatisch aktualisiert. |
| Order wird inaktiv | Bestehende Items werden nicht automatisch gelöscht. |
| Delivery ist ausgeliefert | Delivery bleibt vollständig unverändert. |

Es gibt aktuell keine vollständige Reconciliation gegen den aktuellen Order-Bestand.

Während der Planung verwendet der Service einen PostgreSQL Advisory Lock (`pg_advisory_xact_lock(7744288937001)`), damit parallele Requests nicht denselben Planungshorizont doppelt anlegen.

## Status und operativer Ablauf

### Delivery-Status

Der Status wird dynamisch aus den Feldern der Delivery abgeleitet:

| Status | Bedingung |
| ------ | --------- |
| `OPEN` | Keine Tour, nicht gesammelt, nicht ausgeliefert. |
| `ACCEPTED` | Delivery ist einer Tour zugeordnet oder `acceptedAt` ist gesetzt. |
| `COLLECTED` | Paket wurde eingesammelt. |
| `DELIVERED` | `deliveredAt` ist gesetzt. |

### Restocker-Workflow

1. Offene Deliveries laden.
2. Delivery annehmen.
3. Paket einsammeln.
4. Einzelne Delivery-Items abhaken.
5. Delivery bestätigen.

Eine Delivery kann erst bestätigt werden, wenn alle enthaltenen Items als `delivered = true` markiert wurden.

### Tour-Workflow

Wenn ein Restocker eine Delivery annimmt:

- wird eine offene Tour für denselben Restocker und dasselbe Lieferdatum wiederverwendet oder neu erstellt;
- die Delivery wird dieser Tour zugeordnet;
- `acceptedAt` wird gesetzt;
- `stopOrder` wird als nächste freie Stopnummer vergeben;
- die Delivery verschwindet aus `GET /api/deliveries/open`.

Eine Tour kann erst gestartet werden, wenn alle Pakete der Tour eingesammelt wurden. Beim Beenden einer Tour werden `endTime` und die übergebenen `earnings` gespeichert.

## Customer- und Reporting-Funktionen

Der Service bietet zusätzlich Auswertungen für Customer-Views und monatliche Abrechnung:

| Funktion | Verhalten |
| -------- | --------- |
| Previous Month Items | Summiert ausgelieferte Artikel eines Customers für den vorherigen Kalendermonat. |
| Delivery Overview | Liefert die letzte vergangene und nächste heutige/zukünftige Delivery eines Customers. |
| Customers by Month | Gibt eindeutige Customer-IDs zurück, die in einem Monat tatsächlich ausgelieferte Deliveries hatten. Grundlage ist `deliveredAt`, nicht nur `deliveryDate`. |

Das Monatsformat ist strikt `MM.YYYY`, zum Beispiel `06.2026`.

## API-Endpunkte

Alle Endpunkte liegen unter `/api/deliveries`.

### Deliveries

| Methode | Endpoint | Zweck |
| ------- | -------- | ----- |
| `GET` | `/open` | Offene Deliveries im aktuellen Horizont laden und Planung sicherstellen. |
| `GET` | `/assigned?restocker=...` | Angenommene Deliveries eines Restockers ab heute laden und Planung sicherstellen. |
| `GET` | `/{deliveryId}/detail` | Detaildaten einer Delivery laden. |
| `POST` | `/{deliveryId}/accept?restocker=...` | Delivery annehmen und einer Tour zuordnen. |
| `POST` | `/{deliveryId}/collect` | Paket als eingesammelt markieren. |
| `POST` | `/{deliveryId}/items/{itemId}/delivered` | Einzelnes DeliveryItem als geliefert markieren. |
| `POST` | `/{deliveryId}/confirm` | Delivery abschließen. |

### Touren

| Methode | Endpoint | Zweck |
| ------- | -------- | ----- |
| `GET` | `/tours/today?restocker=...` | Heutige Touren eines Restockers laden. |
| `POST` | `/tours` | Tour manuell anlegen. |
| `POST` | `/tours/today/sync?restocker=...` | Planung synchronisieren und offene heutige Tour zurückgeben. |
| `POST` | `/tours/{tourId}/start` | Tour starten. Alle Pakete müssen gesammelt sein. |
| `POST` | `/tours/{tourId}/end` | Tour beenden und Einnahmen speichern. Body: `{ "earnings": 12.34 }`. |
| `GET` | `/tours/{tourId}/details` | Deliveries einer Tour nach `stopOrder` laden. |

### Customer und Reporting

| Methode | Endpoint | Zweck |
| ------- | -------- | ----- |
| `GET` | `/customers/{customerId}/previous-month-items` | Ausgelieferte Artikel des vorherigen Monats summieren. |
| `GET` | `/customers/{customerId}/delivery-overview` | Letzte und nächste Delivery eines Customers laden. |
| `GET` | `/customers?month=MM.YYYY` | Customer-IDs mit ausgelieferten Deliveries im Monat laden. |

### Admin und Testdaten

| Methode | Endpoint | Zweck |
| ------- | -------- | ----- |
| `GET` | `/admin/all-deliveries` | Alle gespeicherten Deliveries nach Datum absteigend laden. |
| `DELETE` | `/admin/all` | Alle Deliveries, DeliveryItems und Touren löschen. |
| `POST` | `/admin/test-data` | Test-Deliveries anlegen. Optionale Query-Parameter: `deliveryDate`, `firstCustomerId`, `secondCustomerId`, `recipientEmail`. |

## Authentifizierung und Darstellung

Der Service ist als OIDC-Service konfiguriert. Der Authorization-Header wird an User- und Order-Service weitergereicht.

Für Detailantworten wertet der Service zusätzlich JWT-Claims aus:

| Claim | Verwendung |
| ----- | ---------- |
| `preferred_username` oder `sub` | Technischer Restocker-Name. |
| `given_name` + `family_name` oder `name` | Anzeigename des authentifizierten Restockers. |

Wenn eine Delivery zur angemeldeten Person gehört und ein Anzeigename vorhanden ist, wird dieser als `restockerName` im DTO ausgegeben.

## Datenbank und Migration

Der Service nutzt PostgreSQL und Hibernate ORM mit Panache. Beim Start führt `DeliverySchemaMigration` kleinere Schema-Korrekturen aus:

- ergänzt `published` und `published_at`, falls sie fehlen;
- entfernt alte `warehouse_item_id`-Reste aus `delivery_items`;
- entfernt doppelte Deliveries pro `user_id`/`delivery_date`;
- legt die Unique-Constraint `uk_deliveries_user_delivery_date` an, falls sie fehlt.

## Frontend-Hinweis

Die verbleibenden Tage bis zur Lieferung werden nicht gespeichert. Das Frontend berechnet den Countdown dynamisch:

```text
deliveryDate - heute
```

Dadurch reduziert sich der Countdown automatisch jeden Tag.

## Entwicklung

### Voraussetzungen

- Java 21
- Maven Wrapper aus diesem Repository
- PostgreSQL
- Erreichbare Orders-, Users- und Articles-Services

### Wichtige Umgebungsvariablen

| Variable | Zweck |
| -------- | ----- |
| `QUARKUS_DATASOURCE_JDBC_URL` | JDBC-URL zur PostgreSQL-Datenbank. |
| `QUARKUS_DATASOURCE_USERNAME` | Datenbank-User. |
| `QUARKUS_DATASOURCE_PASSWORD` | Datenbank-Passwort. |
| `QUARKUS_HIBERNATE_ORM_DATABASE_GENERATION` | Hibernate DB-Strategie, lokal meist `update`. |
| `QUARKUS_OIDC_AUTH_SERVER_URL` | Keycloak/OIDC Realm URL. |
| `QUARKUS_OIDC_CLIENT_ID` | OIDC Client ID. |
| `QUARKUS_OIDC_CREDENTIALS_SECRET` | OIDC Client Secret, falls benötigt. |
| `ORDERS_SERVICE_URL` | Basis-URL des Orders-Service. |
| `USERS_SERVICE_URL` | Basis-URL des Users-Service. |
| `ARTICLES_SERVICE_URL` | Basis-URL des Articles-Service. |
| `CORS_ORIGINS` | Erlaubte Frontend-Origins. |

### Lokal starten

```shell
./mvnw quarkus:dev
```

Unter Windows:

```powershell
.\mvnw.cmd quarkus:dev
```

Die Quarkus Dev UI ist im Dev Mode unter <http://localhost:8080/q/dev/> verfügbar.

### Tests

```shell
./mvnw test
```

Unter Windows:

```powershell
.\mvnw.cmd test
```

### Build

```shell
./mvnw package
```

Das JVM-Artefakt liegt danach unter `target/quarkus-app/` und kann so gestartet werden:

```shell
java -jar target/quarkus-app/quarkus-run.jar
```

Ein Uber-Jar kann bei Bedarf gebaut werden:

```shell
./mvnw package -Dquarkus.package.jar.type=uber-jar
```

### Native Build

```shell
./mvnw package -Dnative
```

Ohne lokale GraalVM-Installation:

```shell
./mvnw package -Dnative -Dquarkus.native.container-build=true
```

## Docker

Für lokale Container-Tests gibt es `dev/docker-compose.yml`. Der Service wird dort auf `http://localhost:8082` veröffentlicht und die Datenbank auf Host-Port `5435`.

Für Deployment-nahe Setups gibt es `docker-compose.yml` im Projektroot. Secrets und produktive Werte sollten über die jeweilige Deployment-Umgebung verwaltet werden.
