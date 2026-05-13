package de.restockoffice;

import io.smallrye.config.ConfigMapping;

import java.util.Optional;

@ConfigMapping(prefix = "restock.mail")
public interface MailSettings {

    String sender();

    String replyTo();

    String supportEmail();

    String logoUrl();

    Optional<String> resendApiKey();

    String resendBaseUrl();
}
