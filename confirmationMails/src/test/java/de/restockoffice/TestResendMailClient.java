package de.restockoffice;

import jakarta.annotation.Priority;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Alternative;

@Alternative
@Priority(1)
@ApplicationScoped
public class TestResendMailClient extends ResendMailClient {

    @Override
    public String send(String recipientEmail, String subject, String html) {
        return "test-message-id";
    }
}
