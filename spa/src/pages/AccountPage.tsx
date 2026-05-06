import { Navigate, useOutletContext } from "react-router-dom";
import type {
  LoginFormData,
  Product,
  SubscriptionProductItem,
} from "../types/shop";

interface OutletContext {
  onLogin: (formData: LoginFormData) => Promise<void>;
  isLoggedIn: boolean;
  onAddToSubscription: (product: Product) => void;
  onOpenSubscriptionOverview: () => void;
  onEditSubscriptionItem: (item: SubscriptionProductItem) => void;
  subscriptionItems: SubscriptionProductItem[];
}

export function AccountPage() {
  const { isLoggedIn } = useOutletContext<OutletContext>();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return (
      <div className="home-showcase">

        {/* ── Persönliche Daten ── */}
        <section className="page-card section-space">
          <div className="section-head">
            <div>
              <span className="eyebrow">Mein Konto</span>
              <h2>Persönliche Daten</h2>
              <p className="section-copy">
                Deine hinterlegten Kontaktdaten und Profilinformationen.
              </p>
            </div>
            <button className="button" title="Profil bearbeiten" type="button">
              Profil bearbeiten
            </button>
          </div>

          <div className="product-detail__facts">
            <div>
              <dt>Benutzername</dt>
              <dd>max.mustermann</dd>
            </div>
            <div>
              <dt>E-Mail-Adresse</dt>
              <dd>max.mustermann@firma.de</dd>
            </div>
            <div>
              <dt>Telefonnummer</dt>
              <dd>+49 152 89123123</dd>
            </div>
            <div>
              <dt>Geburtsdatum</dt>
              <dd>01.01.2000</dd>
            </div>
            <div>
              <dt>Position</dt>
              <dd>Mitarbeiter Einkauf</dd>
            </div>
          </div>

          <div className="section-space">
            <h3>Lieferadresse</h3>
            <div className="product-specs__grid">
              <article className="product-specs__item">
                <span>Unternehmen</span>
                <strong>ReStockOffice GmbH</strong>
              </article>
              <article className="product-specs__item">
                <span>Straße &amp; Hausnummer</span>
                <strong>Musterstraße 100</strong>
              </article>
              <article className="product-specs__item">
                <span>PLZ &amp; Ort</span>
                <strong>85049 Ingolstadt</strong>
              </article>
              <article className="product-specs__item">
                <span>Lieferhinweis</span>
                <strong>Warenannahme Tor 2 – Empfang bitte benachrichtigen</strong>
              </article>
            </div>
          </div>
        </section>

        {/* ── Darstellung ── */}
        <section className="page-card section-space">
          <div className="section-head">
            <div>
              <span className="eyebrow">Einstellungen</span>
              <h2>Darstellung &amp; Benachrichtigungen</h2>
              <p className="section-copy">
                Passe die Oberfläche und deine Benachrichtigungsoptionen nach deinen Wünschen an.
              </p>
            </div>
          </div>

          <div className="section-space">
            <h3>Darstellung</h3>
            <div className="product-specs__grid">
              <article className="product-specs__item">
                <span>Dark Mode</span>
                <strong>Systemstandard</strong>
              </article>
              <article className="product-specs__item">
                <span>Sprache</span>
                <strong>Deutsch (DE)</strong>
              </article>
            </div>
          </div>

          <div className="section-space">
            <h3>Benachrichtigungen</h3>
            <div className="product-specs__grid">
              <article className="product-specs__item">
                <span>E-Mail-Benachrichtigungen</span>
                <strong>Aktiviert</strong>
              </article>
              <article className="product-specs__item">
                <span>Bestellbestätigungen</span>
                <strong>Aktiviert</strong>
              </article>
              <article className="product-specs__item">
                <span>Abo-Erinnerungen</span>
                <strong>3 Tage vorher</strong>
              </article>
            </div>
          </div>
        </section>

        {/* ── Konto-Aktionen ── */}
        <section className="page-card section-space">
          <div className="section-head">
            <div>
              <span className="eyebrow">Konto-Verwaltung</span>
              <h2>Sicherheit &amp; Konto</h2>
              <p className="section-copy">
                Verwalte deine Anmeldedaten oder beende dein Konto dauerhaft.
              </p>
            </div>
          </div>

          <div className="section-space">
            <div className="product-specs__grid">
              <strong>
                  <button className="button" type="button">
                    Passwort ändern
                  </button>
              </strong>
              <strong>
                  <button className="button" type="button">
                    Abmelden
                  </button>
              </strong>
            </div>
          </div>

          <div className="section-space">
            <h3>Gefahrenzone</h3>
            <div className="product-specs__grid">
              <strong>
                  <button className="button danger-btn" type="button">
                    Abonnement kündigen
                  </button>
              </strong>
              <strong>
                  <button className="button danger-btn" type="button">
                    Konto löschen
                  </button>
              </strong>
            </div>
          </div>
        </section>

      </div>
  );
}