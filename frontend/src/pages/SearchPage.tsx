import { Navigate, useOutletContext } from "react-router-dom";
import type { LoginFormData, Product } from "../types/shop";

interface OutletContext {
  onLogin: (formData: LoginFormData) => Promise<void>;
  isLoggedIn: boolean;
  onAddToCart: (product: Product) => void;
}

export function SearchPage() {
  const { isLoggedIn } = useOutletContext<OutletContext>();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return (
    <section className="page-card">
      <h1>Suchen und Bestellen</h1>
      <p>
          Suche, filtere und bestelle Bürobedarf effizient an einem Ort.
          Alles, was dein Arbeitsplatz braucht – jederzeit verfügbar. Simple in Stock.
      </p>
    </section>
  );
}
