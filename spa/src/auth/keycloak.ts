import Keycloak from "keycloak-js";
import { keycloakConfig } from "./keycloakConfig";

const keycloak = new Keycloak(keycloakConfig);

export default keycloak;
