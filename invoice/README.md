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

Die GitHub Action unter `.github/workflows/invoice.yml` baut und publiziert das Image nach GHCR. Fuer Portainer liegt die Compose-Datei unter `invoice/docker-compose.yml`.
