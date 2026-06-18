package de.restockoffice;

import jakarta.annotation.Priority;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Alternative;
import jakarta.enterprise.inject.Produces;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.Set;

@ApplicationScoped
public class TestJsonWebTokenProducer {

    @Produces
    @Alternative
    @Priority(1)
    JsonWebToken jsonWebToken() {
        return new JsonWebToken() {
            @Override
            public String getName() {
                return "test-user";
            }

            @Override
            public Set<String> getClaimNames() {
                return Set.of();
            }

            @Override
            public <T> T getClaim(String claimName) {
                return null;
            }
        };
    }
}
