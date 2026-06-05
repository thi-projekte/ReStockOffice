package de.restockoffice;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import io.quarkus.runtime.annotations.RegisterForReflection;

// Klasse vereint Restocker und Keycloak-Daten (bisher Mail)
@RegisterForReflection
public class RestockerProfileResponse {

    @JsonUnwrapped
    public Restocker restocker;

    public String email;

    public RestockerProfileResponse(Restocker restocker, String email) {
        this.restocker = restocker;
        this.email = email;
    }
}