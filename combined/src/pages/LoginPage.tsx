import { useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import type { LoginFormData } from "../types/shop";

interface OutletContext {
  onLogin: (formData: LoginFormData) => void;
  isLoggedIn: boolean;
}

export function LoginPage() {
  const { onLogin, isLoggedIn } = useOutletContext<OutletContext>();
  const [formData, setFormData] = useState<LoginFormData>({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formData.username.trim() || !formData.password.trim()) {
      setError("Bitte Benutzername und Passwort eingeben.");
      return;
    }

    try {
      setError("");
      onLogin(formData);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Login fehlgeschlagen.",
      );
    }
  }

  return (
    <section className="page-card auth-card">
      <h1>{isLoggedIn ? "Angemeldet" : "Login"}</h1>

      {isLoggedIn ? (
        <div className="status-box">
          Du bist nun eingeloggt.
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Benutzername
            <input
              type="text"
              value={formData.username}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  username: event.target.value,
                }))
              }
            />
          </label>

          <label>
            Passwort
            <input
              type="password"
              value={formData.password}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
            />
          </label>

          {error ? <div className="error-box">{error}</div> : null}

          <button className="button" type="submit">
            Anmelden
          </button>

        </form>
      )}
    </section>
  );
}
