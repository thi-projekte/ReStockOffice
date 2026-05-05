package de.restockoffice;

import io.smallrye.config.ConfigMapping;

@ConfigMapping(prefix = "restock.mail")
public interface MailSettings {

    String sender();

    String replyTo();

    String supportEmail();

    String logoUrl();

    String resendApiKey();

    String resendBaseUrl();
}
