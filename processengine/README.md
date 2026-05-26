# ReStockOffice Process Engine

Dieser Service stellt die zentrale CIB seven Process Engine für ReStockOffice bereit.
Es gibt keine UI; andere Services greifen über die REST-Schnittstelle zu.

## Technologien

- Java 17
- Spring Boot
- CIB seven
- Maven
- Docker

## Lokaler Start

Die Zugangsdaten für das CIB seven Maven Repository müssen lokal in `~/.m2/settings.xml` oder in GitHub Actions als Secrets hinterlegt sein.

```bash
mvn -B package -DskipTests
docker compose up -d
```

Die REST-Schnittstelle ist lokal erreichbar unter:

```text
http://localhost:8080/engine-rest
```

## Deployment

Das Docker-Image wird durch GitHub Actions gebaut und in der GitHub Container Registry veröffentlicht:

```text
ghcr.io/thi-projekte/restockoffice-processengine:1.0.0
```

Portainer verwendet die Datei `processengine/docker-compose.yml`.
Der Service wird in Nginx Proxy Manager auf `pe.ReStockOffice.de` weitergeleitet.
