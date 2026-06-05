# Schnittstellen
- getUserbyId [GET users.restockoffice.de/user?userId={userId}]  
  - Nur mit gültigem JWT Token des jeweiligen Customers (über GET)
- createUser [POST users.restockoffice.de/user/create]
  - von Keycloak aus (über EventListener)
  - Nur Aufgerufen beim Registrieren
- updateUser [POST users.restockoffice.de/user/update]
  - von SPA aus (über POST)
- (getAllUsers) [GET users.restockoffice.de/users]
  - Nur mit gültigem JWT Token eines Admins (über GET)


# Model
User:
  - UserId: string (aus Keycloak JWT Token)
  - postalCode*: string
  - city*: string
  - street*: string
  - houseNumber*: string
  - country*: enum [string]
  - companyName*: string
  - roleInCompany: string
  - birthDate: Date
  - phoneNumber*: string
  - deliveryHint: string
  - IBAN: string

Keycloak:
  - id: string (aus Keycloak JWT Token)
  - username*: string
  - firstName*: string
  - lastName*: string
  - email*: string
  - password*: string
  - roles*: array of string

## To-Do
- Keycloak client in application properties