package de.restockoffice.security;

public final class SecurityConstants {
    private SecurityConstants() { }

    // Roles
    public static final String ROLE_ADMIN = "admin";
    public static final String ROLE_PROCESS_ENGINE = "process-engine";
    public static final String ROLE_RESTOCKER = "restocker";

    // Realm
    public static final String KEYCLOAK_REALM = "restockoffice";
}
