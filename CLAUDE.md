# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
# Build (skip tests)
mvn clean package -DskipTests

# Build with tests
mvn clean package

# Run via Maven
mvn spring-boot:run

# Run via JAR
java -jar target/cibseven-spring-boot-oidc-0.0.1-SNAPSHOT.jar

# Run tests only
mvn test
```

## Technology Stack

- **Java 17**, Spring Boot 3.5.6, Maven 4
- **CIB seven BPM** 2.1.4-ee (Camunda-based BPMN engine)
- **Keycloak** for OAuth2/OIDC identity provider
- **H2** in-memory database
- BPMN process defined in `src/main/resources/loanApproval.bpmn`

## Architecture

### Authentication Flow

Spring Security OAuth2 handles the Keycloak OIDC flow. `KeycloakIdentityProviderPluginConfiguration` bridges `plugin.identity.keycloak.*` properties from `application.yaml` into the CIB seven Keycloak plugin, mapping Keycloak identities to Camunda users/groups. The `preferred_username` claim becomes the Camunda user ID.

### Application Startup

`WebappExampleProcessApplication` is the Spring Boot entry point (`@SpringBootApplication` + `@EnableProcessApplication`). It auto-starts the `loanApproval` process instance on deployment via a `PostDeployEvent` listener.

### Configuration Placeholders

`application.yaml` contains placeholders that must be set before running:
- `<url>` — Keycloak server hostname (appears multiple times)
- `<secret>` — Keycloak client secret for registration `cib-seven-local`

The JWT secret in `cibseven-webclient.properties` is flagged as non-production.

### REST API & Web Client

Engine REST API is served at `/engine-rest`. The web client (configured in `cibseven-webclient.properties`) communicates with the engine via this endpoint using JWT-secured SSO tokens from Keycloak.

## CIB seven Artifact Repository

CIB seven enterprise artifacts are resolved from a custom Maven repository:
`https://artifacts.cibseven.org/repository/enterprise-snapshots`

Credentials for this repository may be required in `~/.m2/settings.xml`.
