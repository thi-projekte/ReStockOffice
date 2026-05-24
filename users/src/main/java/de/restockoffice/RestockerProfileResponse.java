package de.restockoffice;

import com.fasterxml.jackson.annotation.JsonUnwrapped;

public class RestockerProfileResponse {

    @JsonUnwrapped
    public Restocker restocker;

    public String email;

    public RestockerProfileResponse(Restocker restocker, String email) {
        this.restocker = restocker;
        this.email = email;
    }
}