import { useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { MdEdit, MdSave } from "react-icons/md";
import { SubscriptionProfileProgress } from "../components/SubscriptionProfileProgress";
import type { Product, RestockOrderWithProduct } from "../types/shop";
import type { SubscriptionProfileStatus } from "../utils/subscriptionProfile";

interface OutletContext {
  isLoggedIn: boolean;
  onAddToSubscription: (product: Product) => void;
  onOpenSubscriptionOverview: () => void;
  onEditSubscriptionItem: (item: RestockOrderWithProduct) => void;
  subscriptionItems: RestockOrderWithProduct[];
  canModifySubscription: boolean;
  subscriptionProfileStatus: SubscriptionProfileStatus | null;
  onLogout: () => void;
  theme: "light" | "dark" | "auto";
  onToggleTheme: () => void;
  onSetTheme: (theme: "light" | "dark" | "auto") => void;
}

function formatInterval(intervalCount: number) {
  return `Alle ${intervalCount} Woche${intervalCount === 1 ? "" : "n"}`;
}

export function SubscriptionPage() {
  const {
    isLoggedIn,
    onEditSubscriptionItem,
    subscriptionItems,
    canModifySubscription,
    subscriptionProfileStatus,
  } = useOutletContext<OutletContext>();
  const [isEditMode, setIsEditMode] = useState(false);

  const canEditSubscription = canModifySubscription && isEditMode;

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="home-showcase">
      <section id="sub" className="page-card section-space">
        <div className="section-head">
          <div>
            <span className="eyebrow">Aboverwaltung</span>
            <h2>Dein aktuelles Abonnement</h2>
            <p className="section-copy">
              Verwalte hier Produkte, Mengen und Lieferintervalle deines Abos.
            </p>
          </div>
          <button
            className={`button ${canModifySubscription && isEditMode ? "" : "button--ghost"}`.trim()}
            type="button"
            title={
              canModifySubscription
                ? isEditMode
                  ? "Änderungen speichern"
                  : "Abo bearbeiten"
                : "Profil vervollständigen, um Änderungen am Abo vorzunehmen"
            }
            onClick={() => {
              if (!canModifySubscription) {
                return;
              }

              setIsEditMode((value) => !value);
            }}
            disabled={!canModifySubscription}
          >
            {isEditMode ? <MdSave /> : <MdEdit />}
            {canModifySubscription ? (
              isEditMode ? (
                "Bearbeitung beenden"
              ) : (
                "Abo bearbeiten"
              )
            ) : (
              "Profil vervollständigen"
            )}
          </button>
        </div>

        <SubscriptionProfileProgress
          status={subscriptionProfileStatus}
          message="Solange Pflichtfelder fehlen, sind Änderungen am Abo gesperrt."
        />

        <div className="section-space">
          <div className="product-specs__grid">
            {subscriptionItems.length === 0 ? (
              <p className="empty-state">Du hast aktuell noch keine Artikel in deinem Abo.</p>
            ) : (
              <div className="subscription-account-list">
                {subscriptionItems.map((item) => (
                  <button
                    key={`${item.customerId}-${item.productId}-${item.createdAt}`}
                    className={`subscription-account-item ${
                      canEditSubscription ? "" : "subscription-account-item--disabled"
                    }`.trim()}
                    type="button"
                    disabled={!canEditSubscription}
                    onClick={() => onEditSubscriptionItem(item)}
                  >
                    <div>
                      <strong>{item.product.name}</strong>
                      <div className="muted-text">Menge: {item.quantity}</div>
                    </div>
                    <span>{formatInterval(item.interval)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
