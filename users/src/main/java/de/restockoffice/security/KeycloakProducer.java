package de.restockoffice.security;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;

@ApplicationScoped
public class KeycloakProducer {
    @ConfigProperty(name = "keycloak.admin.client.secret")
    String secret;

    @Produces
    @ApplicationScoped
    public Keycloak produceKeycloak() {
        return KeycloakBuilder.builder()
                .serverUrl("https://id.restockoffice.de")
                .realm("restockoffice")
                .grantType("client_credentials")
                .clientId("restockoffice-backend")
                .clientSecret(secret)
                .build();
    }
}
