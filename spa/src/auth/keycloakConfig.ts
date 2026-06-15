type KeycloakConfig = {
  readonly url: string;
  readonly realm: string;
  readonly clientId: string;
};

export const keycloakConfig: KeycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL ?? "https://id.restockoffice.de",
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? "restockoffice",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "restockoffice-spa",
};
