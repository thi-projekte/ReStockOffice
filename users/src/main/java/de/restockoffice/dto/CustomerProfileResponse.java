package de.restockoffice.dto;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import de.restockoffice.domain.Customer;
import io.quarkus.runtime.annotations.RegisterForReflection;

// Klasse vereint Customer und Keycloak-Daten (bisher Mail)
@RegisterForReflection
public class CustomerProfileResponse {

    @JsonUnwrapped
    public Customer customer;

    public String email;

    public CustomerProfileResponse(Customer customer, String email) {
        this.customer = customer;
        this.email = email;
    }
}
