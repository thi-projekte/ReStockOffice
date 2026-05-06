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
  const {
    isLoggedIn,
  } = useOutletContext<OutletContext>();

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
            <p className="section-copy">
              Verwalte hier deine persönlichen Daten und Präferenzen.
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
    </div>
  );
}
