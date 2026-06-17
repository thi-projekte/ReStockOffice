package de.restockoffice.api;

import io.quarkus.test.Mock;
import jakarta.annotation.Priority;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Alternative;
import jakarta.enterprise.inject.Produces;
import org.keycloak.admin.client.Keycloak;
import org.mockito.Answers;
import org.mockito.Mockito;

@Mock
@Alternative
@Priority(1)
@ApplicationScoped
public class TestKeycloakProducer {

    @Produces
    @ApplicationScoped
    public Keycloak produceMockKeycloak() {
        return Mockito.mock(Keycloak.class, Answers.RETURNS_DEEP_STUBS);
    }
}
