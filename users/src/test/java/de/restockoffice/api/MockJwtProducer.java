package de.restockoffice.api;

import io.quarkus.test.Mock;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.mockito.Mockito;

@Mock
@ApplicationScoped
public class MockJwtProducer {

    @Produces
    @ApplicationScoped
    public JsonWebToken produceMockJwt() {
        return Mockito.mock(JsonWebToken.class);
    }
}