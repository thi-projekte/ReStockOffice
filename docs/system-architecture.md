# ReStockOffice System Architecture

Stand: 2026-06-20

Diese Visualisierung basiert auf der aktuellen Repo-Struktur, den Docker-Compose-Dateien, den Service-Konfigurationen, REST-Clients und den BPMN-Prozessen im `processengine`-Modul.

## 1. Gesamtueberblick

```mermaid
flowchart TB
    actor["Customer / Restocker / Admin"]
    browser["Browser"]
    proxy["Nginx Proxy Manager<br/>public HTTPS routing"]

    actor --> browser
    browser --> proxy

    subgraph frontend["Frontend"]
        landing["Landing Page<br/>React/Vite static site<br/>restockoffice.de"]
        spa["ReStockOffice SPA<br/>React/Vite<br/>app.restockoffice.de"]
    end

    subgraph identity["Identity"]
        keycloak["Keycloak<br/>realm: restockoffice<br/>id.restockoffice.de"]
    end

    subgraph backend["Backend services"]
        articles["Articles Service<br/>Quarkus<br/>Product catalog"]
        users["Users Service<br/>Quarkus<br/>Customer and restocker profiles"]
        orders["Orders Service<br/>Quarkus<br/>Subscriptions / restock orders"]
        deliveries["Restocker Deliveries Service<br/>Quarkus<br/>Planning, tours, delivery execution"]
        processengine["Process Engine<br/>Spring Boot + CIB seven<br/>BPMN orchestration"]
        mailer["Confirmation Mail Service<br/>Quarkus<br/>Operational mail templates"]
        invoice["Invoice Service<br/>Quarkus<br/>Invoices, PDFs, invoice mails"]
    end

    subgraph persistence["Persistence"]
        articlesDb[(Postgres<br/>articles_db)]
        usersDb[(Postgres<br/>users_db)]
        ordersDb[(Postgres<br/>orders_db)]
        deliveriesDb[(Postgres<br/>deliveries_db)]
        processDb[(Postgres<br/>processengine)]
        invoiceDb[(Postgres<br/>invoices_db)]
        keycloakData[(Keycloak data volume)]
    end

    subgraph external["External providers"]
        resend["Resend API<br/>email delivery"]
        objectStorage["Object Storage<br/>profile pictures, logos"]
    end

    proxy --> landing
    proxy --> spa
    proxy --> keycloak
    proxy --> articles
    proxy --> users
    proxy --> orders
    proxy --> deliveries
    proxy --> processengine
    proxy --> invoice
    proxy --> mailer

    spa -->|"OIDC login and token refresh"| keycloak
    spa -->|"Bearer REST"| articles
    spa -->|"Bearer REST"| users
    spa -->|"Bearer REST"| orders
    spa -->|"Bearer REST"| deliveries
    spa -->|"Bearer REST"| processengine
    spa -->|"Bearer REST"| invoice

    articles --> articlesDb
    users --> usersDb
    orders --> ordersDb
    deliveries --> deliveriesDb
    processengine --> processDb
    invoice --> invoiceDb
    keycloak --> keycloakData

    users -->|"Keycloak Admin Client<br/>email lookup / identity data"| keycloak
    users -->|"upload profile pictures"| objectStorage
    invoice -->|"logo assets"| objectStorage
    mailer -->|"transactional mails"| resend
    invoice -->|"invoice mails"| resend
```

## 2. Service-Abhaengigkeiten

```mermaid
flowchart LR
    spa["SPA"]
    keycloak["Keycloak"]
    articles["Articles"]
    users["Users"]
    orders["Orders"]
    deliveries["Restocker Deliveries"]
    processengine["Process Engine"]
    mailer["Confirmation Mail"]
    invoice["Invoice"]
    resend["Resend"]
    objectStorage["Object Storage"]

    spa -->|"login / tokens"| keycloak
    spa -->|"catalog"| articles
    spa -->|"profiles"| users
    spa -->|"subscriptions"| orders
    spa -->|"delivery views and tour ops"| deliveries
    spa -->|"BPMN helper APIs"| processengine
    spa -->|"invoice list / PDF download"| invoice

    orders -->|"customer mail context"| users
    orders -->|"starts/updates BPMN<br/>AboConfirmationProcess"| processengine
    orders -->|"customer delivery replan"| deliveries

    users -->|"email lookup / admin client"| keycloak
    users -->|"profile picture upload"| objectStorage
    users -->|"delivery replan after delivery day change"| deliveries

    deliveries -->|"active orders"| orders
    deliveries -->|"customer address and delivery preferences"| users
    deliveries -->|"article names and units"| articles

    processengine -->|"service token via client credentials"| keycloak
    processengine -->|"read / enrich process data"| orders
    processengine -->|"read / enrich process data"| users
    processengine -->|"read article data"| articles
    processengine -->|"delivery monitoring and monthly billing data"| deliveries
    processengine -->|"operational emails"| mailer
    processengine -->|"create invoices and send invoice mails"| invoice

    mailer --> resend
    invoice --> resend
    invoice --> objectStorage
```

## 3. Wichtige Laufzeit-Flows

### 3.1 Abo anlegen oder aendern

```mermaid
sequenceDiagram
    actor Customer
    participant SPA
    participant Orders
    participant OrdersDB as Orders DB
    participant Users
    participant ProcessEngine
    participant Deliveries
    participant Mailer as Confirmation Mail
    participant Resend

    Customer->>SPA: Abo erstellen oder aendern
    SPA->>Orders: POST/PUT /orders with Bearer token
    Orders->>OrdersDB: Order speichern
    Orders->>Users: Customer-Profil fuer Mail-Kontext laden
    Orders->>ProcessEngine: Code startet/aktualisiert BPMN via POST /api/abo-confirmation-process/change
    Orders->>Deliveries: POST /api/deliveries/customers/{customerId}/replan
    ProcessEngine-->>ProcessEngine: AboConfirmationProcess wartet Bestaetigungsfenster
    ProcessEngine->>Mailer: POST /emails/abo-confirmation
    Mailer->>Resend: POST /emails
    Resend-->>Customer: Abo-Bestaetigung
```

### 3.2 Delivery-Planung und Restocker-Tour

```mermaid
sequenceDiagram
    actor Restocker
    participant SPA
    participant Deliveries
    participant Orders
    participant Users
    participant Articles
    participant ProcessEngine
    participant Mailer as Confirmation Mail
    participant Resend
    actor Customer

    Restocker->>SPA: Offene Lieferungen / heutige Tour oeffnen
    SPA->>Deliveries: GET /api/deliveries/open or /assigned
    Deliveries->>Orders: GET /orders/active
    Deliveries->>Users: GET /customerForRestocker or /customer
    Deliveries->>Articles: GET /article?productId=...
    Deliveries-->>SPA: Geplante Deliveries und Tourdaten

    SPA->>Deliveries: POST /{deliveryId}/accept, /collect, /items/{itemId}/delivered, /confirm
    SPA->>ProcessEngine: /api/restocker-tour-process/start and task completion
    ProcessEngine-->>ProcessEngine: DeliveryProcess korreliert DeliveryConfirmed
    ProcessEngine->>Mailer: POST /emails/delivery-confirmation
    Mailer->>Resend: POST /emails
    Resend-->>Customer: Lieferbestaetigung
```

### 3.3 Lieferankuendigung und Ueberwachung

```mermaid
sequenceDiagram
    participant Timer as Daily BPMN Timer
    participant ProcessEngine
    participant Deliveries
    participant Mailer as Confirmation Mail
    participant Resend
    actor Customer
    actor Restocker

    Timer->>ProcessEngine: DeliveryAnnouncementMonitoringProcess startet taeglich
    ProcessEngine->>Deliveries: GET /api/deliveries/admin/all-deliveries
    ProcessEngine->>Mailer: POST /emails/delivery-announcement
    Mailer->>Resend: POST /emails
    Resend-->>Customer: Lieferankuendigung
    ProcessEngine-->>ProcessEngine: Warten auf Message DeliveryConfirmed
    Restocker->>ProcessEngine: DeliveryConfirmed via DeliveryProcess
    ProcessEngine->>Mailer: POST /emails/delivery-confirmation
    Mailer->>Resend: POST /emails
    Resend-->>Customer: Lieferbestaetigung
```

### 3.4 Monatliche Rechnung

```mermaid
sequenceDiagram
    participant Timer as Monthly BPMN Timer
    participant ProcessEngine
    participant Deliveries
    participant Articles
    participant Users
    participant Invoice
    participant InvoiceDB as Invoice DB
    participant Resend
    actor Customer

    Timer->>ProcessEngine: InvoiceProcess startet zum Monatsanfang
    ProcessEngine->>Deliveries: GET /api/deliveries/customers?month=MM.YYYY
    loop pro Customer mit gelieferten Artikeln
        ProcessEngine->>Deliveries: GET /api/deliveries/customers/{id}/previous-month-items
        ProcessEngine->>Articles: GET /article?productId=...
        ProcessEngine->>Users: GET /customer?userId=...
        ProcessEngine->>Invoice: POST /invoices/create
        Invoice->>InvoiceDB: Rechnung speichern
        ProcessEngine->>Invoice: POST /invoices/send-mail
        Invoice->>Resend: Rechnungsmail mit PDF
        Resend-->>Customer: Rechnung
    end
```

## 4. BPMN-Prozessstarts aus Anwendungscode

```mermaid
flowchart LR
    ordersCode["Orders Service Code<br/>OrderResource.order / updateOrder"]
    restockerSpa["SPA Restocker UI"]
    processAbo["Process Engine API<br/>/api/abo-confirmation-process/change"]
    processTour["Process Engine API<br/>/api/restocker-tour-process/start"]
    aboBpmn["BPMN<br/>AboConfirmationProcess"]
    tourBpmn["BPMN<br/>DeliveryProcess"]

    ordersCode -->|"nach Order-Create/-Update<br/>startAboConfirmationProcess(...)"| processAbo
    processAbo -->|"startet oder aktualisiert Prozessinstanz"| aboBpmn

    restockerSpa -->|"Restocker startet Tourprozess"| processTour
    processTour -->|"startet oder nutzt aktive Prozessinstanz"| tourBpmn
```

Wichtig: Der Orders Service ruft nicht direkt die CIB-seven Engine-REST-API auf. Er ruft den eigenen Process-Engine-Controller `/api/abo-confirmation-process/change` auf; dort wird die BPMN-Prozessinstanz `AboConfirmationProcess` gestartet oder bei einem aktiven Prozess fuer denselben Business Key aktualisiert. Das passiert im Codepfad `OrderResource.order(...)` und `OrderResource.updateOrder(...)` ueber `startAboConfirmationProcess(...)`.

## 5. Komponenten-Inventar

| Komponente | Technologie | Hauptaufgabe | Datenhaltung / externe Systeme |
| --- | --- | --- | --- |
| `landing` | React/Vite static site | Marketing-/Public-Website | keine eigene DB |
| `spa` | React/Vite, Keycloak JS | Customer-, Restocker- und Account-UI | nutzt Backend-APIs direkt |
| `keycloak` | Keycloak 26 | Login, Realm, Rollen, Tokens | Keycloak data volume |
| `articles` | Quarkus, Hibernate ORM | Produktkatalog und Kategorien | Postgres `articles_db` |
| `users` | Quarkus, Keycloak Admin Client, S3 SDK | Customer-/Restocker-Profile, Profilbilder, Keycloak-Maildaten | Postgres `users_db`, Object Storage, Keycloak |
| `orders` | Quarkus, Hibernate ORM | Abos/RestockOrders, Abo-Aenderungen | Postgres `orders_db`, Users, Process Engine, Deliveries |
| `restocker-deliveries` | Quarkus, MicroProfile REST Client | Delivery-Planung, Touren, Annahme, Sammlung, Zustellung | Postgres `deliveries_db`, Orders, Users, Articles |
| `processengine` | Spring Boot, CIB seven | BPMN-Orchestrierung fuer Abo-, Liefer- und Rechnungsprozesse | Postgres `processengine`, Keycloak service token, andere Services |
| `confirmation-mails` | Quarkus, Qute templates | Abo-, Lieferankuendigungs- und Lieferbestaetigungsmails | Resend API |
| `invoice` | Quarkus, PDF/e-billing, Qute templates | Rechnungserstellung, PDF-Download, Rechnungsmails | Postgres `invoices_db`, Resend API, Object Storage |

## 6. Deployment-Sicht

```mermaid
flowchart TB
    ghcr["GitHub Container Registry<br/>ghcr.io/thi-projekte/restockoffice-*"]
    portainer["Portainer / Docker Compose"]
    proxy["nginx-proxy-manager network"]
    internals["service-specific internal bridge networks"]

    ghcr -->|"pull images"| portainer
    portainer --> proxy
    portainer --> internals

    proxy -->|"public domains"| spa["spa"]
    proxy --> landing["landing"]
    proxy --> keycloak["keycloak"]
    proxy --> articles["articles"]
    proxy --> users["users"]
    proxy --> orders["orders"]
    proxy --> deliveries["restocker-deliveries"]
    proxy --> processengine["processengine"]
    proxy --> invoice["invoice"]
    proxy --> mailer["confirmation-mails"]

    internals -->|"private DB connections"| databases["Postgres containers / volumes"]
    internals -->|"private mailer link"| processToMailer["processengine -> confirmation-mails"]
```

## 7. Repo-Quellen fuer die Visualisierung

| Bereich | Wichtige Dateien |
| --- | --- |
| Deployment | `*/docker-compose.yml`, root `docker-compose.yml` |
| Backend-Konfiguration | `*/src/main/resources/application.properties`, `processengine/src/main/resources/application.yaml` |
| SPA API-Ziele | `spa/src/services/*.ts`, `spa/src/auth/keycloakConfig.ts` |
| Service-zu-Service Calls | `orders/src/main/java/de/restockoffice/OrderResource.java`, `users/src/main/java/de/restockoffice/api/UserResource.java`, `restocker-deliveries/src/main/java/de/restockoffice/**`, `processengine/src/main/java/de/restockoffice/**` |
| BPMN-Prozesse | `processengine/src/main/resources/*.bpmn` |

## 8. Hinweise und Annahmen

- `bestellungsservice` liegt noch im Repository, taucht aber in den aktuellen Compose-/Runtime-Konfigurationen nicht als produktiver Service auf und ist deshalb nicht im Hauptdiagramm enthalten.
- Die Services werden im Deployment ueber `nginx-proxy-manager` oeffentlich erreichbar gemacht. Einige Service-zu-Service-URLs zeigen in den Defaults ebenfalls auf die oeffentlichen Domains; der Mailservice wird vom Process Engine Compose zusaetzlich ueber das interne `mailer`-Netz angesprochen.
- Die Visualisierung zeigt die fachliche Laufzeitarchitektur, nicht jedes einzelne REST-Endpoint-Detail.
