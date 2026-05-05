import Keycloak from 'keycloak-js'

const keycloak = new Keycloak({
  url:      import.meta.env.VITE_KEYCLOAK_URL as string,
  realm:    import.meta.env.VITE_KEYCLOAK_REALM as string,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID as string,
})

let initPromise: Promise<boolean> | null = null

function init(): Promise<boolean> {
  if (!initPromise) {
    initPromise = keycloak.init({ checkLoginIframe: false }).catch(() => {
      initPromise = null
      return false
    })
  }
  return initPromise
}

export async function getAuthState(): Promise<{ authenticated: boolean; name?: string; email?: string }> {
  await init()
  if (!keycloak.authenticated) return { authenticated: false }
  return {
    authenticated: true,
    name:  keycloak.tokenParsed?.given_name as string | undefined,
    email: keycloak.tokenParsed?.email as string | undefined,
  }
}

export async function redirectToRegister(): Promise<void> {
  await init()
  keycloak.register()
}

export async function redirectToLogin(): Promise<void> {
  await init()
  keycloak.login()
}

export async function logout(): Promise<void> {
  await init()
  keycloak.logout({ redirectUri: window.location.origin + '/landing' })
}
