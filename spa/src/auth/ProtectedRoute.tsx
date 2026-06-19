import {type ReactNode} from "react";
import {useAuth} from "./AuthProvider";

export function ProtectedRoute({children}: Readonly<{ children: ReactNode }>): ReactNode {
  const {error, isAuthenticated, isInitializing} = useAuth();

  if (error) {
    return <section className="page-card error-box">{error}</section>;
  }

  if (isInitializing) {
    return <section className="page-card">Anmeldung wird geprüft...</section>;
  }

  if (!isAuthenticated) {
    return <section className="page-card">Nicht angemeldet</section>;
  }

  return children;
}
