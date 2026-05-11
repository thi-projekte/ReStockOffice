import { Navigate, useOutletContext } from "react-router-dom";
import type { Product, RestockOrderWithProduct } from "../types/shop";

interface OutletContext {
  isLoggedIn: boolean;
  onAddToSubscription: (product: Product) => void;
  onOpenSubscriptionOverview: () => void;
  onEditSubscriptionItem: (item: RestockOrderWithProduct) => void;
  subscriptionItems: RestockOrderWithProduct[];
  onLogout: () => void;
  theme: "light" | "dark" | "auto";
  onToggleTheme: () => void;
  onSetTheme: (theme: "light" | "dark" | "auto") => void;
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
