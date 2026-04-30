# CIB seven Spring Boot OIDC Template

Dieses Projekt zeigt eine einfache Loan-Approval-Anwendung auf Basis von CIB seven BPM mit OAuth2/OIDC-Authentifizierung über Keycloak.

## Voraussetzungen

- Java 17
- Maven 4
- Zugang zum CIB seven Enterprise Maven Repository

## Maven-Konfiguration

Da das CIB seven Enterprise Repository nicht öffentlich zugänglich ist, müssen die Zugangsdaten in `~/.m2/settings.xml` hinterlegt werden.

Falls noch keine `settings.xml` vorhanden ist, muss die Datei neu angelegt werden. Andernfalls die folgenden Abschnitte in die bestehende Datei einfügen:

**In `<servers>` einfügen:**
```xml
<server>
  <id>mvn-cibseven-enterprise</id>
  <username>KUNDENNUMMER</username>
  <password>PASSWORT</password>
</server>
```

**In `<profiles>` einfügen:**
```xml
<profile>
  <id>cibseven-ee</id>
  <repositories>
    <repository>
      <id>mvn-cibseven-enterprise</id>
      <name>CIB seven Enterprise repository</name>
      <url>https://artifacts.cibseven.org/repository/enterprise-group/</url>
    </repository>
  </repositories>
</profile>
```

**In `<activeProfiles>` einfügen:**
```xml
<activeProfile>cibseven-ee</activeProfile>
```

## Lokaler Start

### 1. Keycloak starten

Keycloak wird über Docker Compose gestartet und ist vorkonfiguriert (Realm, Client, Benutzer werden automatisch importiert):

```bash
docker compose up -d keycloak
```

Keycloak ist anschließend unter `http://localhost:8180` erreichbar.
Admin-Zugang: `admin` / `admin`

### 2. Anwendung bauen und starten

```bash
mvn clean package -DskipTests
mvn spring-boot:run
```

Die Anwendung ist unter `http://localhost:8080` erreichbar.
Die REST API ist unter `http://localhost:8080/engine-rest` erreichbar.

### Einloggen

Nach dem Öffnen von `http://localhost:8080` wird automatisch zu Keycloak weitergeleitet. Login mit:

- **Benutzername:** `demo`
- **Passwort:** `demo`

Der Benutzer `demo` ist Mitglied der Gruppe `camunda-admin` und hat vollen Zugriff auf die Anwendung.

## Benutzer und Rollen

Benutzer werden in Keycloak verwaltet, Gruppen steuern den Zugriff in CIB seven.

### Benutzer über die Keycloak Admin UI anlegen

1. `http://localhost:8180` öffnen, einloggen als `admin` / `admin`
2. Realm `cib-seven` auswählen
3. **Users → Add user** → Benutzernamen vergeben → Save
4. Tab **Credentials** → Passwort setzen, „Temporary" auf Off
5. Tab **Groups** → gewünschte Gruppe zuweisen

### Gruppen und Berechtigungen

Die Keycloak-Gruppe wird direkt als Camunda-Gruppe übernommen.

| Gruppe           | Zugriff                        |
|------------------|--------------------------------|
| `camunda-admin`  | Voller Adminzugriff            |
| eigene Gruppen   | Konfigurierbar über CIB seven  |

Für eigene Gruppen mit eingeschränktem Zugriff:
1. In Keycloak unter **Groups → Create group** eine neue Gruppe anlegen (z. B. `abteilung-kredit`)
2. Benutzer dieser Gruppe zuweisen
3. In CIB seven unter `http://localhost:8080` als `demo` einloggen → **Admin → Authorizations** → der Gruppe Berechtigungen auf Prozesse, Tasks etc. erteilen

### Benutzer im realm-export.json vorkonfigurieren

Für eine reproduzierbare Entwicklungsumgebung können Benutzer und Gruppen direkt in `keycloak/realm-export.json` definiert werden.

Gruppe hinzufügen:
```json
{ "name": "abteilung-kredit", "path": "/abteilung-kredit" }
```

Benutzer hinzufügen:
```json
{
  "username": "maria",
  "enabled": true,
  "email": "maria@example.com",
  "credentials": [{ "type": "password", "value": "maria", "temporary": false }],
  "groups": ["/abteilung-kredit"]
}
```

Da Keycloak den Realm nur beim ersten Start importiert, muss für einen Neuimport das Volume gelöscht werden:

```bash
docker compose down -v
docker compose up -d
```

## Deployment

Das Docker-Image wird per GitHub Actions gebaut und in GHCR veröffentlicht:

```text
ghcr.io/thi-projekte/restockoffice-processengine
```

Die Action läuft bei Pushes auf `main`, bei Git-Tags mit `v`-Präfix und manuell über `workflow_dispatch`. Für den Maven-Zugriff auf das CIB-seven Enterprise Repository müssen im GitHub-Repository diese Secrets gesetzt sein:

- `CIBSEVEN_MAVEN_USERNAME`
- `CIBSEVEN_MAVEN_PASSWORD`

Portainer kann den Stack direkt aus dem Repository lesen. Die `docker-compose.yml` startet die Process Engine als Container und stellt sie standardmäßig auf Port `8080` bereit. Nginx kann dann auf diesen Port weiterleiten:

```text
https://pe.ReStockOffice.de -> http://<docker-host>:8080
```

Die REST API liegt nach dem Deployment unter:

```text
https://pe.ReStockOffice.de/engine-rest
```

Wichtige Umgebungsvariablen für Portainer:

| Variable | Standardwert | Zweck |
| --- | --- | --- |
| `PROCESSENGINE_HTTP_PORT` | `8080` | Host-Port der Process Engine |
| `KEYCLOAK_HTTP_PORT` | `8180` | Host-Port von Keycloak |
| `KEYCLOAK_ISSUER_URI` | `http://keycloak:8080/realms/cib-seven` | Issuer-URL für OAuth2/OIDC |
| `KEYCLOAK_ADMIN_URL` | `http://keycloak:8080/admin/realms/cib-seven` | Keycloak Admin-URL |
| `KEYCLOAK_CLIENT_ID` | `cib-seven-local` | OIDC Client-ID |
| `KEYCLOAK_CLIENT_SECRET` | `cib-seven-secret` | OIDC Client-Secret |
| `ENGINE_REST_BASE_URL` | `https://pe.ReStockOffice.de` | Öffentliche Basis-URL der Process Engine |
