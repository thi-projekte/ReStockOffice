import type { SubscriptionProductItem } from "../types/shop";

interface SubscriptionOverviewProps {
  items: SubscriptionProductItem[];
  open: boolean;
  onClose: () => void;
  onManageSubscription: () => void;
  onUpdateSubscription: () => void;
}

function formatInterval(intervalCount: number) {
  return `Alle ${intervalCount} Woche${intervalCount === 1 ? "" : "n"}`;
}

export function SubscriptionOverview({
  items,
  open,
  onClose,
  onManageSubscription,
  onUpdateSubscription,
}: SubscriptionOverviewProps) {
  if (!open) {
    return null;
  }

  return (
    <>
      <button
        className="subscription-modal__overlay"
        type="button"
        aria-label="Dialog schließen"
        onClick={onClose}
      />

      <section
        className="subscription-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscription-overview-title"
      >
        <div className="subscription-modal__header">
          <div>
            <span className="eyebrow">Abo</span>
            <h2 id="subscription-overview-title">Abo-Übersicht</h2>
          </div>
          <button className="button button--ghost" type="button" onClick={onClose}>
            X
          </button>
        </div>

        <div className="subscription-modal__body">
          <section className="subscription-modal__section">
            <div className="subscription-modal__section-head">
              <h3>Aktuelles Abo</h3>
              <span>{items.length} Artikel</span>
            </div>

            {items.length === 0 ? (
              <p className="empty-state">Aktuell befinden sich keine Produkte im Abo.</p>
            ) : (
              <div className="subscription-overview-list">
                {items.map((item) => (
                  <div key={item.itemId} className="subscription-overview-item">
                    <div>
                      <strong>{item.product.name}</strong>
                      <div className="muted-text">Menge: {item.quantity}</div>
                    </div>
                    <span>{formatInterval(item.intervalCount)}</span>
                  </div>
                ))}
              </div>
            )}

            <p className="subscription-modal__manage-copy">
             Weitere Details findest du in deinem Profil unter{" "}
              <button
                className="subscription-modal__manage-link"
                type="button"
                onClick={onManageSubscription}
              >
                Aboverwaltung
              </button>{" "}
                .
            </p>
          </section>
        </div>

        <div className="subscription-modal__actions">
          <button className="button button--ghost" type="button" onClick={onClose}>
            Änderungen verwerfen
          </button>
          <button className="button" type="button" onClick={onUpdateSubscription}>
            Abo aktualisieren
          </button>
        </div>
      </section>
    </>
  );
}
