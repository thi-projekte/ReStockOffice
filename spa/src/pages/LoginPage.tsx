import type { ReactElement } from "react";
import { useAuth } from "../auth/AuthProvider";

export function LoginPage(): ReactElement {
  const { login, isInitializing, error } = useAuth();

  return (
    <section className="page-card auth-card">
      <h1>Login</h1>

      {isInitializing
        ? (
            <div className="status-box">Anmeldung wird geprüft...</div>
          )
        : (
            <div className="auth-form">
              <p>
                Melde dich an, um dein Konto, dein Abo und die Produktsuche zu verwenden.
              </p>

              {error ? <div className="error-box">{error}</div> : null}

              <button
                className="button"
                type="button"
                onClick={() => void login()}
              >
                Anmelden
              </button>
            </div>
          )}
    </section>
  );
}
