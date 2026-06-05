# restocker-deliveries

## Wie entstehen Deliveries?

Die Deliveries werden nicht jeden Tag komplett neu berechnet, sondern beim Laden bzw. Synchronisieren fortgeschrieben. Der Service arbeitet dabei nach einem **upsert-/append-Prinzip**.

### Begriffe

* `Order`: Abo-/Bestellwunsch eines Customers für ein Produkt.
* `Delivery`: geplante Lieferung für einen Customer an einem konkreten Datum.
* `DeliveryItem`: einzelne Produktposition innerhalb einer Delivery.
* `Tour`: angenommene Lieferroute eines Restockers für ein Lieferdatum.
* `Restocker`: Person, die Deliveries annimmt, einsammelt und zustellt.

### Grundlogik

* Der `DeliveryService` plant immer einen Horizont von aktuell **14 Tagen im Voraus**.
* Dafür werden alle aktiven Orders geladen.
* Anschließend werden passende Liefertermine berechnet.
* Orders werden nach: `customerId`, `deliveryDate` gruppiert.

Dadurch entsteht pro Kunde und Lieferdatum genau **eine gemeinsame Delivery**. Technisch ist diese Fachlogik auch über eine Unique-Constraint auf `user_id` und `delivery_date` abgesichert.

### Wann wird geplant?

Die Planung läuft aktuell nicht als automatische tägliche Hintergrund-Neuberechnung. Stattdessen wird der Planungshorizont durch API-Aufrufe angestoßen. Die Deliveries werden **nicht von allein um Mitternacht oder täglich per Job erzeugt**. Es gibt aktuell keinen Scheduler, der sagt: „Heute ist ein neuer Tag, ich plane jetzt alle Deliveries neu.“ Stattdessen passiert die Planung **erst dann, wenn jemand bestimmte Delivery-Endpunkte aufruft**. Zum Beispiel:

- Ein Restocker öffnet die Seite mit offenen Lieferungen.
- Die SPA ruft `GET /api/deliveries/open` auf.
- Im Backend läuft dabei `ensurePlanningHorizon(...)`.
- Der Service schaut: „Welche aktiven Orders gibt es, und welche Deliveries müssen zwischen heute und heute + 14 Tage existieren?“
- Fehlende Deliveries werden angelegt, bestehende Deliveries behalten ihr Lieferdatum und ihre bestehenden Positionen. Neue Artikel können zu zukünftigen, nicht ausgelieferten Deliveries ergänzt werden.

Beispiel: Heute ist **26.05.2026**. Dann plant der Service beim API-Aufruf für den Zeitraum:

```text
26.05.2026 bis 09.06.2026
```

Wenn niemand den Endpoint aufruft, passiert erstmal nichts Neues in der Delivery-Datenbank. Am nächsten Tag, **27.05.2026**, wäre der neue Horizont:

```text
27.05.2026 bis 10.06.2026
```

Aber auch das wird erst erzeugt/ergänzt, wenn wieder ein relevanter API-Aufruf kommt. Die drei genannten Endpunkte lösen dieses Sicherstellen des Planungshorizonts aus:

- `GET /api/deliveries/open`: offene Lieferungen anzeigen
- `GET /api/deliveries/assigned`: bereits angenommene Lieferungen eines Restockers anzeigen
- `POST /api/deliveries/tours/today/sync`: heutige Tour/Orders synchronisieren

Kurz gesagt: **Die Planung ist lazy/on-demand**, nicht automatisch im Hintergrund.

---

## Lieferlogik

### Delivery Day des Customers

Der feste Liefertag des Customers (`deliveryDay`) bestimmt, wann Deliveries stattfinden. Beispiel:

```json
"deliveryDay": "Dienstag"
```

-> Alle Orders dieses Customers landen auf Dienstags-Deliveries. Falls kein `deliveryDay` gesetzt ist verwendet der Service den Wochentag von `createdAt`. Dadurch könnten Orders auf unterschiedliche Wochentage verteilt werden.

### Customer-Stammdaten

Adresse, Lieferhinweis, Lieferzeit und `deliveryDay` kommen aus dem User-Service. Falls der Customer keinen `deliveryDay` hat, greift der Service auf den Wochentag von `createdAt` der jeweiligen Order zurück.

---

## Mindestvorlaufzeit

Zwischen Erstellung einer Order und erster Lieferung müssen mindestens: **2 vollständige Werktage** liegen. Dadurch werden kurzfristige Lieferungen verhindert.

### Beispiele

| Erstellung | Erste mögliche Dienstag-Delivery |
| ---------- | -------------------------------- |
| Donnerstag | nächster Dienstag                |
| Freitag    | übernächster Dienstag            |
| Samstag    | übernächster Dienstag            |
| Montag     | übernächster Dienstag            |

Die Uhrzeit spielt aktuell keine Rolle - nur das Datum von `createdAt`. Der Service arbeitet bei diesen Berechnungen mit `LocalDate.now()`.

---

## Intervalle

Das `interval` wird fachlich als Wochenintervall interpretiert:

| Interval | Bedeutung      |
| -------- | -------------- |
| 1        | jede Woche     |
| 2        | alle 2 Wochen  |
| 3        | alle 3 Wochen  |
| 12       | alle 12 Wochen |

---

## Welche Orders werden geplant?

Geplant werden nur Orders, die fachlich aktiv sind `status = ACTIVE` oder kein Status gesetzt. Orders mit anderen Statuswerten werden ignoriert. Wichtig: Bereits vorhandene Delivery-Items werden dadurch aktuell nicht automatisch entfernt.

## Zusammenführung mehrerer Orders

Mehrere Orders desselben Customers werden in derselben Delivery gebündelt, wenn gleicher Customer und gleiches Lieferdatum. Beispiel:

| Order  | Intervall     |
| ------ | ------------- |
| Papier | jede Woche    |
| Kaffee | alle 2 Wochen |
| Stifte | alle 3 Wochen |

Dann könnte eine Delivery so aussehen:

| Datum | Inhalt                        |
| ----- | ----------------------------- |
| 02.06 | alle Produkte                 |
| 09.06 | nur wöchentliche Produkte     |
| 16.06 | wöchentliche + 2-wöchentliche |
| 23.06 | wöchentliche + 3-wöchentliche |

---

## Verhalten bei neuen Produkten

Neue Produkte werden nicht rückwirkend in alte Deliveries eingefügt. Stattdessen:

* neue Berechnung ab erstem gültigen Liefertermin
* ebenfalls mit 2 Werktagen Vorlauf

### Beispiel

Customer hat Lieferdienstag. Neues Produkt erstellt am:

| Erstellung | Erste Delivery |
| ---------- | -------------- |
| 04.06      | 09.06          |
| 06.06      | 16.06          |
| 08.06      | 16.06          |

---

## Akzeptierte Deliveries und Touren

Wenn ein Restocker eine Delivery annimmt:

* wird die Delivery einer Tour zugeordnet
* die Tour gilt für den Restocker und das Lieferdatum
* die Delivery verschwindet aus `GET /api/deliveries/open`
* `stopOrder` wird beim Annehmen vergeben

Falls für denselben Restocker und dasselbe Lieferdatum bereits eine offene Tour existiert, wird diese Tour wiederverwendet. Andernfalls wird eine neue Tour erstellt.

### Neue Artikel bei bereits akzeptierter Delivery

Neue Artikel können auch zu einer bereits akzeptierten, zukünftigen Delivery hinzugefügt werden. Das passiert, wenn:

* dieselbe `customerId`
* dasselbe `deliveryDate`
* die Mindestvorlaufzeit von 2 vollständigen Werktagen eingehalten ist
* die Delivery noch nicht ausgeliefert wurde

Beispiel:

* Customer hat Lieferdienstag.
* Delivery für den 09.06 wurde bereits von einem Restocker angenommen.
* Neues Produkt wird am 04.06 erstellt.
* Für den 09.06 sind 2 vollständige Werktage Vorlauf erfüllt.

Dann wird das neue Produkt aktuell in die bereits angenommene Delivery vom 09.06 ergänzt. Wenn das neue Produkt erst am 06.06 erstellt wird, reicht der Vorlauf für den 09.06 nicht mehr aus. Dann landet es frühestens in der Delivery vom 16.06. 

D.h. eine bereits angenommene oder operativ vorbereitete Delivery darf durch neue Artikel erweitert werden, solange sie noch nicht ausgeliefert wurde.

---

## Zustellablauf

Der operative Ablauf besteht aus mehreren Schritten:

* Delivery annehmen
* Paket einsammeln
* einzelne Delivery-Items abhaken
* Delivery bestätigen

Eine Delivery kann erst bestätigt werden, wenn alle enthaltenen Items als `delivered = true` markiert wurden.

---

## Aktualisierung bestehender Deliveries

Existiert für einen Customer und ein Datum bereits eine Delivery:

* wird diese wiederverwendet
* neue Produkte ergänzt
* bestehende Positionen bleiben unverändert
* ausgelieferte Deliveries bleiben vollständig unverändert

Ändert sich der `deliveryDay`, werden bestehende Deliveries nicht verschoben. Der neue Liefertag gilt erst für neu erzeugte Deliveries nach dem bestehenden Planungshorizont. Bei bestehenden Orders wird dafür der letzte gespeicherte Delivery-Termin als Intervall-Anker verwendet, damit ein 4-Wochen-Rhythmus nicht wieder bei Woche 0 startet.

### Artikel-Stammdaten

Name und Einheit eines Delivery-Items kommen aus dem Article-Service. Falls der Article-Service nicht erreichbar ist oder keine Daten liefert, verwendet der Service Fallbacks:

* Name: `Artikel <productId>`
* Einheit: `Stück`

---

## Wichtiger technischer Hinweis

Der aktuelle Service:

* ergänzt Deliveries um neue Artikel
* löscht jedoch keine alten Positionen automatisch
* führt keine vollständige Reconciliation gegen den aktuellen Order-Bestand aus

Das bedeutet:

* Änderungen an Orders werden nicht vollständig "neu gerechnet"
* der Service arbeitet aktuell nicht als vollständige tägliche Neuberechnung
* sondern als inkrementelles Fortschreiben der Planung

### Concurrency

Während der Planung verwendet der Service einen PostgreSQL Advisory Lock. Dadurch wird verhindert, dass mehrere gleichzeitige Requests parallel denselben Planungshorizont doppelt anlegen.


## Frontend-Verhalten

Die verbleibenden Tage bis zur Lieferung werden nicht gespeichert. Das Frontend berechnet diese dynamisch über:

```text
deliveryDate - heute
```

Dadurch reduziert sich der Countdown automatisch jeden Tag.

---

## Wichtige API-Endpunkte

| Methode | Endpoint | Zweck |
| ------- | -------- | ----- |
| `GET` | `/api/deliveries/open` | offene Deliveries laden und Planungshorizont sicherstellen |
| `GET` | `/api/deliveries/admin/all-deliveries` | alle gespeicherten Deliveries inklusive Status laden |
| `GET` | `/api/deliveries/assigned?restocker=...` | angenommene Deliveries eines Restockers laden |
| `POST` | `/api/deliveries/tours/today/sync?restocker=...` | heutige Tour/Planung synchronisieren |
| `POST` | `/api/deliveries/{deliveryId}/accept?restocker=...` | Delivery annehmen |
| `POST` | `/api/deliveries/{deliveryId}/collect` | Paket einsammeln |
| `POST` | `/api/deliveries/{deliveryId}/items/{itemId}/delivered` | einzelnes Item abhaken |
| `POST` | `/api/deliveries/{deliveryId}/confirm` | Delivery abschließen |

---


## Quarkus

This project uses Quarkus, the Supersonic Subatomic Java Framework.

If you want to learn more about Quarkus, please visit its website: <https://quarkus.io/>.

## Running the application in dev mode

You can run your application in dev mode that enables live coding using:

```shell script
./mvnw quarkus:dev
```

> **_NOTE:_**  Quarkus now ships with a Dev UI, which is available in dev mode only at <http://localhost:8080/q/dev/>.

## Packaging and running the application

The application can be packaged using:

```shell script
./mvnw package
```

It produces the `quarkus-run.jar` file in the `target/quarkus-app/` directory.
Be aware that it’s not an _über-jar_ as the dependencies are copied into the `target/quarkus-app/lib/` directory.

The application is now runnable using `java -jar target/quarkus-app/quarkus-run.jar`.

If you want to build an _über-jar_, execute the following command:

```shell script
./mvnw package -Dquarkus.package.jar.type=uber-jar
```

The application, packaged as an _über-jar_, is now runnable using `java -jar target/*-runner.jar`.

## Creating a native executable

You can create a native executable using:

```shell script
./mvnw package -Dnative
```

Or, if you don't have GraalVM installed, you can run the native executable build in a container using:

```shell script
./mvnw package -Dnative -Dquarkus.native.container-build=true
```

You can then execute your native executable with: `./target/restocker-deliveries-1.0.0-SNAPSHOT-runner`

If you want to learn more about building native executables, please consult <https://quarkus.io/guides/maven-tooling>.

## Related Guides

- REST Jackson ([guide](https://quarkus.io/guides/rest#json-serialisation)): Jackson serialization support for Quarkus REST. This extension is not compatible with the quarkus-resteasy extension, or any of the extensions that depend on it
- OpenID Connect ([guide](https://quarkus.io/guides/security-openid-connect)): Secure applications with OpenID Connect and OAuth 2.0 using bearer tokens and authorization code flow
- Hibernate ORM with Panache ([guide](https://quarkus.io/guides/hibernate-orm-panache)): Simplified JPA/Hibernate data access layer with active record and repository patterns
- SmallRye Health ([guide](https://quarkus.io/guides/smallrye-health)): Monitor service health
- JDBC Driver - PostgreSQL ([guide](https://quarkus.io/guides/datasource)): Connect to the PostgreSQL database via JDBC

## Provided Code

### Hibernate ORM

Create your first JPA entity

[Related guide section...](https://quarkus.io/guides/hibernate-orm)


[Related Hibernate with Panache section...](https://quarkus.io/guides/hibernate-orm-panache)


### REST

Easily start your REST Web Services

[Related guide section...](https://quarkus.io/guides/getting-started-reactive#reactive-jax-rs-resources)

### SmallRye Health

Monitor your application's health using SmallRye Health

[Related guide section...](https://quarkus.io/guides/smallrye-health)
