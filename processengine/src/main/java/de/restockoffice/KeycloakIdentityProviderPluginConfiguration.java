package de.restockoffice;

import org.cibseven.bpm.extension.keycloak.plugin.KeycloakIdentityProviderPlugin;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Registers the CIB seven Keycloak Identity Provider Plugin, configured via the
 * {@code plugin.identity.keycloak} properties in {@code application-local-webapp.yaml}.
 * Only active in the local-webapp profile; production stays unaffected.
 */
@Component
@Profile("local-webapp")
@ConfigurationProperties(prefix = "plugin.identity.keycloak")
public class KeycloakIdentityProviderPluginConfiguration extends KeycloakIdentityProviderPlugin {
}
