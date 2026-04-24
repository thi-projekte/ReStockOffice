import Keycloak from 'keycloak-js'

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL as string,
  realm: import.meta.env.VITE_KEYCLOAK_REALM as string,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID as string,
})

let initPromise: Promise<boolean> | null = null

function ensureInitialized(): Promise<boolean> {
  if (!initPromise) {
    initPromise = keycloak.init({ checkLoginIframe: false })
  }
  return initPromise
}

export async function redirectToRegister(): Promise<void> {
  await ensureInitialized()
  keycloak.register()
}

export async function redirectToLogin(): Promise<void> {
  await ensureInitialized()
  keycloak.login()
}

export default keycloak
