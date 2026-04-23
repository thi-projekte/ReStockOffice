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

## Starten

### 1. Keycloak starten

Keycloak wird über Docker Compose gestartet und ist vorkonfiguriert (Realm, Client, Benutzer werden automatisch importiert):

```bash
docker compose up -d
```

Keycloak ist anschließend unter `http://localhost:8180` erreichbar.
Admin-Zugang: `admin` / `admin`

### 2. Anwendung bauen und starten

```bash
mvn clean package -DskipTests
mvn spring-boot:run
```

Die Anwendung ist unter `http://localhost:8080` erreichbar.

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
