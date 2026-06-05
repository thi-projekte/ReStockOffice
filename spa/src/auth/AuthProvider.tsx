import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  KeycloakProfile,
  KeycloakTokenParsed,
} from "keycloak-js";
import keycloak from "./keycloak";
import { keycloakConfig } from "./keycloakConfig";

interface RealmAccess {
  roles: string[];
}

interface RestockTokenParsed extends KeycloakTokenParsed {
  customer_id?: string;
  realm_access?: RealmAccess;
  resource_access?: Record<string, RealmAccess>;
}

interface AuthUser {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  customerId?: string;
  roles: string[];
}

interface AuthContextValue {
  isAuthenticated: boolean;
  isInitializing: boolean;
  error: string | null;
  token?: string;
  user: AuthUser | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeRoleName(role: string | undefined) {
  return role?.trim().toLowerCase() ?? "";
}

function collectRoles(tokenParsed?: RestockTokenParsed) {
  const realmRoles = tokenParsed?.realm_access?.roles ?? [];
  const clientRoles =
      tokenParsed?.resource_access?.[keycloakConfig.clientId]?.roles ?? [];

  return Array.from(new Set([...realmRoles, ...clientRoles]));
}

function mapUser(
    tokenParsed: RestockTokenParsed | undefined,
    profile: KeycloakProfile | null,
): AuthUser | null {
  if (!tokenParsed?.sub) return null;

  return {
    id: tokenParsed.sub,
    username: profile?.username ?? tokenParsed.preferred_username,
    firstName: profile?.firstName ?? tokenParsed.given_name,
    lastName: profile?.lastName ?? tokenParsed.family_name,
    email: profile?.email ?? tokenParsed.email,
    customerId: tokenParsed.customer_id,
    roles: collectRoles(tokenParsed),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const refreshTimerRef = useRef<number | undefined>(undefined);

  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | undefined>();
  const [user, setUser] = useState<AuthUser | null>(null);

  const syncAuthState = useCallback(async () => {
    const authenticated = Boolean(keycloak.authenticated);

    setIsAuthenticated(authenticated);
    setToken(keycloak.token);

    if (!authenticated) {
      setUser(null);
      return;
    }

    const profile = await keycloak.loadUserProfile().catch(() => null);

    setUser(mapUser(keycloak.tokenParsed as RestockTokenParsed | undefined, profile));
  }, []);

  useEffect(() => {
    let isMounted = true;

    keycloak.onAuthSuccess = () => {
      void syncAuthState();
    };

    keycloak.onAuthRefreshSuccess = () => {
      void syncAuthState();
    };

    keycloak.onAuthLogout = () => {
      setIsAuthenticated(false);
      setToken(undefined);
      setUser(null);
    };

    async function init() {
      try {
        await keycloak.init({
          onLoad: "login-required",
          pkceMethod: "S256",
          checkLoginIframe: false,
        });

        if (!isMounted) return;

        setError(null);
        await syncAuthState();

        if (keycloak.authenticated) {
          refreshTimerRef.current = window.setInterval(() => {
            keycloak.updateToken(60).catch(() => {
              keycloak.login();
            });
          }, 30000);
        }
      } catch {
        if (isMounted) {
          setError("Keycloak ist nicht erreichbar.");
        }
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    }

    void init();

    return () => {
      isMounted = false;
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
      }
    };
  }, [syncAuthState]);

  const login = useCallback(async () => {
    await keycloak.login({
      redirectUri: window.location.origin,
    });
  }, []);

  const logout = useCallback(async () => {
    await keycloak.logout({
      redirectUri: `${window.location.origin}/login`,
    });
  }, []);

  const value = useMemo<AuthContextValue>(
      () => ({
        isAuthenticated,
        isInitializing,
        error,
        token,
        user,
        login,
        logout,
        hasRole: (role) => {
          const normalizedRole = normalizeRoleName(role);
          return user?.roles.some(
            (userRole) => normalizeRoleName(userRole) === normalizedRole,
          ) ?? false;
        },
      }),
      [isAuthenticated, isInitializing, error, token, user, login, logout],
  );

  return (
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth muss innerhalb des AuthProviders verwendet werden.");
  }

  return ctx;
}
