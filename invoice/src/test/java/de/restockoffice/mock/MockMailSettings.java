package de.restockoffice.mock;

import de.restockoffice.domain.MailSettings;
import io.quarkus.test.Mock;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Optional;

@Mock
@ApplicationScoped
public class MockMailSettings implements MailSettings {
    @Override
    public String sender() {
        return "test@restockoffice.de";
    }

    @Override
    public String replyTo() {
        return "support@restockoffice.de";
    }

    @Override
    public String supportEmail() {
        return "support@restockoffice.de";
    }

    @Override
    public String logoUrl() {
        return "https://example.com/logo.png";
    }

    @Override
    public Optional<String> resendApiKey() {
        return Optional.of("fake-key");
    }

    @Override
    public String resendBaseUrl() {
        return "https://api.resend.com";
    }
}
