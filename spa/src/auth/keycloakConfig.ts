export const keycloakConfig = {
  // url: import.meta.env.VITE_KEYCLOAK_URL ?? "https://id.restockoffice.de",
  url: import.meta.env.VITE_KEYCLOAK_URL ?? "http://localhost:8180/",
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? "restockoffice",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "restockoffice-spa",
};
