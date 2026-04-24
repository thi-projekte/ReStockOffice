import { Navigate, useOutletContext } from "react-router-dom";
import type { LoginFormData, Product } from "../types/shop";

interface OutletContext {
  onLogin: (formData: LoginFormData) => void;
  isLoggedIn: boolean;
  onAddToCart: (product: Product) => void;
}

export function AccountPage() {
  const { isLoggedIn } = useOutletContext<OutletContext>();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="home-showcase">
      <section className="page-card section-space">
        <div className="section-head">
          <div>
            <span className="eyebrow">Profilübersicht</span>
            <h2>Kontodaten und Lieferprofil</h2>
          </div>
          <button
            className={"button"}
            title={"Profil bearbeiten"}
          >
            Profil bearbeiten
          </button>
        </div>

        <div className="product-detail__facts">
          <div>
            <dt>Benutzername</dt>
            <dd>max.mustermann</dd>
          </div>
          <div>
            <dt>E-Mail</dt>
            <dd>max.mustermann@firma.de</dd>
          </div>
          <div>
            <dt>Geburtsdatum</dt>
            <dd>01.01.2000</dd>
          </div>
          <div>
            <dt>Rolle im Unternehmen</dt>
            <dd>Mitarbeiter Einkauf</dd>
          </div>
        </div>

        <div className="section-space">
          <h3>Lieferadresse</h3>
          <div className="product-specs__grid">
            <article className="product-specs__item">
              <span>Firma</span>
              <strong>ReStockOffice</strong>
            </article>
            <article className="product-specs__item">
              <span>Adresse</span>
              <strong>Musterstraße 100, 85049 Ingolstadt</strong>
            </article>
            <article className="product-specs__item">
              <span>Lieferhinweis</span>
              <strong>Warenannahme Tor 2, Empfang benachrichtigen</strong>
            </article>
          </div>
        </div>

        <div className="section-space">
          <h3>Liefer- und Intervall Einstellungen</h3>
          <div className="product-specs__grid">
            <article className="product-specs__item">
              <span>Bevorzugtes Zeitfenster</span>
              <strong>Mo-Fr, 09:00 bis 12:00</strong>
            </article>
            <article className="product-specs__item">
              <span>Aktuelles Intervall</span>
              <strong>2 Wochen</strong>
            </article>
            <article className="product-specs__item">
              <span>Benachrichtigung</span>
              <strong>E-Mail bei Statuswechsel</strong>
            </article>
          </div>
        </div>
      </section>
        <section id="orders" className="hero-card landing-hero">
            <div className="landing-hero__copy">
                <span className="eyebrow">Bestellungen</span>
                <h2>Übersicht deiner letzen Bestellungen</h2>
            </div>
            <div className="hero-highlights">
                <article className="highlight-tile">
                    <strong>Bestellung 300</strong>
                    <span> Bestellt am 24.05.2026 für 159,76€ </span>
                    <small>Status: Auf Liefertermin wird gewartet</small>
                </article>
                <article className="highlight-tile">
                    <strong>Bestellung 200</strong>
                    <span> Bestellt am 14.05.2026 für 59,46€ </span>
                    <small>Status: An Restocker übergeben</small>
                </article>
                <article className="highlight-tile">
                    <strong>Bestellung 100</strong>
                    <span> Bestellt am 23.04.2026 für 257,33€ </span>
                    <small>Status: Zugestellt</small>
                </article>
            </div>
        </section>
    </div>
  );
}
