# ReStockOffice Process Engine

Dieser Service stellt die zentrale CIB seven Process Engine fuer ReStockOffice bereit.
Es gibt keine UI; andere Services greifen ueber die REST-Schnittstelle zu.

## Technologien

- Java 17
- Spring Boot
- CIB seven
- Maven
- Docker

## Lokaler Start

Die Zugangsdaten fuer das CIB seven Maven Repository muessen lokal in `~/.m2/settings.xml` oder in GitHub Actions als Secrets hinterlegt sein.

```bash
mvn -B package -DskipTests
docker compose up -d
```

Die REST-Schnittstelle ist lokal erreichbar unter:

```text
http://localhost:8080/engine-rest
```

## Deployment

Das Docker-Image wird durch GitHub Actions gebaut und in der GitHub Container Registry veroeffentlicht:

```text
ghcr.io/thi-projekte/restockoffice-processengine:1.0.0
```

Portainer verwendet die Datei `processengine/docker-compose.yml`.
Der Service wird in Nginx Proxy Manager auf `pe.ReStockOffice.de` weitergeleitet.
