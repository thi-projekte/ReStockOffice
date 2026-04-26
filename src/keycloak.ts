import type KeycloakType from 'keycloak-js'

let instance: KeycloakType | null = null

async function getKeycloak(): Promise<KeycloakType> {
  if (!instance) {
    const { default: Keycloak } = await import('keycloak-js')
    instance = new Keycloak({
      url:      import.meta.env.VITE_KEYCLOAK_URL as string,
      realm:    import.meta.env.VITE_KEYCLOAK_REALM as string,
      clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID as string,
    })
    await instance.init({ checkLoginIframe: false })
  }
  return instance
}

export async function redirectToRegister(): Promise<void> {
  const kc = await getKeycloak()
  kc.register()
}

export async function redirectToLogin(): Promise<void> {
  const kc = await getKeycloak()
  kc.login()
}
