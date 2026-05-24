package de.restockoffice;

import com.fasterxml.jackson.annotation.JsonUnwrapped;

public class CustomerProfileResponse {

    @JsonUnwrapped
    public Customer customer;

    public String email;

    public CustomerProfileResponse(Customer customer, String email) {
        this.customer = customer;
        this.email = email;
    }
}