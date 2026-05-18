import type { ReactNode } from "react";
import type { RestockMarketplaceOrder } from "../../types/shop";
import {
  formatDeliveryEta,
  formatDeliveryWindow,
} from "../../pages/restocker-view/restockerOrderUi";

interface RestockerOrderDetailDialogProps {
  order: RestockMarketplaceOrder;
  backLabel: string;
  onClose: () => void;
  actions?: ReactNode;
  children?: ReactNode;
}

export function RestockerOrderDetailDialog({
  order,
  backLabel,
  onClose,
  actions,
  children,
}: RestockerOrderDetailDialogProps) {
  return (
    <>
      <button
        className="subscription-modal__overlay"
        type="button"
        aria-label="Detailansicht schliessen"
        onClick={onClose}
      />

      <section
        className="subscription-modal restocker-order-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="restocker-order-dialog-title"
      >
        <div className="subscription-modal__header">
          <div>
            <span className="eyebrow">{backLabel}</span>
            <h2 id="restocker-order-dialog-title">Lieferung #{order.orderId}</h2>
          </div>

          <button className="button button--ghost" type="button" onClick={onClose}>
            Schliessen
          </button>
        </div>

        <div className="subscription-modal__body restocker-order-dialog__body">
          <div className="restocker-order-dialog__hero">
            <div className="restocker-order-dialog__summary">
              <span className="eyebrow">Unternehmen</span>
              <strong>{order.companyName}</strong>
            </div>

            <div className="restocker-order-dialog__summary">
              <span className="eyebrow">Adresse</span>
              <strong>{order.addressLine1}</strong>
              <span>
                {order.postalCode} {order.city}
              </span>
            </div>

            <div className="restocker-order-dialog__summary">
              <span className="eyebrow">Lieferdatum</span>
              <strong>{order.deliveryDate}</strong>
              <span>{formatDeliveryEta(order.deliveryDate)}</span>
            </div>

            <div className="restocker-order-dialog__summary">
              <span className="eyebrow">Lieferfenster</span>
              <strong>{formatDeliveryWindow(order.deliveryTime)}</strong>
            </div>
          </div>

          {children}

          <div className="restocker-order-dialog__notes">
            <span className="eyebrow">Hinweise zur Lieferung</span>
            <p>{order.deliveryNotes}</p>
          </div>

          <div className="restocker-order-dialog__table-shell">
            <div className="section-head restocker-order-dialog__table-head">
              <div>
                <span className="eyebrow">Inhalt dieser Lieferung</span>
                <h3>Artikeldetails</h3>
              </div>
            </div>

            <div className="restocker-order-dialog__table">
              <div className="restocker-order-dialog__table-row restocker-order-dialog__table-row--head">
                <span>Position</span>
                <span>Artikelnr.</span>
                <span>Bezeichnung</span>
                <span>Menge</span>
              </div>

              {order.items.map((item) => (
                <div
                  key={`${order.orderKey}-${item.position}`}
                  className="restocker-order-dialog__table-row"
                >
                  <span data-label="Position">{item.position}</span>
                  <span data-label="Artikelnr.">{item.articleNumber}</span>
                  <span data-label="Bezeichnung">{item.name}</span>
                  <span data-label="Menge">{item.quantityLabel}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {actions ? <div className="subscription-modal__actions">{actions}</div> : null}
      </section>
    </>
  );
}
