# User Service API Dokumentation

Dieser Service verwaltet die Benutzerprofile, die Verknüpfung mit Keycloak-Identitäten sowie den Upload von Profilbildern zu AWS S3. Alle Endpunkte sind durch OIDC abgesichert.

## Authentifizierung

Alle Endpunkte erfordern einen gültigen **Bearer Token** von Keycloak im HTTP-Header.
`Authorization: Bearer <token>`

---

## Zugriff auf das eigene Profil

Um die Daten des aktuell über den Token angemeldeten Benutzers zu erhalten, verwende Folgendes:

```shell script
[url]/user/me
```
Bsp.:
```shell script
https://users.restockoffice.de/user/me
```

## Zugriff auf ein spezifisches Profil (nach ID)

Um die Daten eines Benutzers anhand der Keycloak-UUID zu erhalten, verwende Folgendes:

```shell script
[url]/user?userId=[userId]
```
Bsp.:
```shell script
https://users.restockoffice.de/user?userId=88736862-7567-463d-9860-937299a9a304
```
Sicherheit: Normale Benutzer können nur ihre eigene ID abfragen (403 bei Fremdzugriff). Admins dürfen jede ID abrufen.

## Zugriff auf alle Benutzer (Admin Only)

Um eine JSON-Liste aller registrierten Benutzerprofile zu erhalten, verwende Folgendes:

```shell script
[url]/users
```
Bsp.:
```shell script
https://users.restockoffice.de/users
```

## Benutzerprofil erstellen

Um ein neues Profil in der Datenbank anzulegen, verwende Folgendes:

**Methode:** ```POST``` <br>
**Pfad:** ```shell script/user/create```

### Beispiel Body (JSON)

```shell script
{
    "postalCode": "80331",
    "city": "München",
    "street": "Kaufingerstraße",
    "houseNumber": "12",
    "country": "DE",
    "companyName": "Beispiel GmbH",
    "phoneNumber": "0891234567",
    "roleInCompany": "Einkauf",
    "birthDate": "1990-01-01T00:00:00Z"
}
```
Hinweis: Die ``` userId ```userId wird automatisch aus dem Token des Senders extrahiert.

## Benutzerprofil aktualisieren (inkl. Profilbild)

Um das eigene Profil zu aktualisieren und optional ein Bild hochzuladen, verwende Folgendes:

**Methode:** ```POST``` <br>
**Pfad** ````/user/update````<br>
**Content-Type** ````multipart/form-data````

````shell script
[url]/user/update
````

**Pfad** <br>
- ````userData````: JSON-Daten des Users (Content-Type: ```application/json```)
- ````file````: Bilddatei (z.B. ```.jpg```)

Bsp. für den Inhalt von ```userData```:
````shell
{
    "phoneNumber": "0176999999",
    "deliveryHint": "Bitte beim Nachbarn abgeben"
}
````
