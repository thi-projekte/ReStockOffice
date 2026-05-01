package de.restockoffice;

import com.fasterxml.jackson.annotation.JsonProperty;

public class MailRequestDTO {

    public record  ResendEmailRequest(String from, String to, String subject, @JsonProperty("html") String htmlContent){

    }
}
