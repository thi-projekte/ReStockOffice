import type { ReactNode } from "react";
import { FaArrowLeft } from "react-icons/fa";
import type { RestockMarketplaceOrder } from "../../types/shop";
import {
  formatDeliveryBanner,
  formatDeliveryWindow,
} from "../../pages/restocker-view/restockerOrderUi";

interface RestockerOrderDetailDialogProps {
  order: RestockMarketplaceOrder;
  backLabel: string;
  onClose: () => void;
  actions?: ReactNode;
  children?: ReactNode;
  infoRows?: ReactNode;
}

const EMPTY_DELIVERY_NOTES_LABEL = "Keine zusätzlichen Hinweise";
const MISSING_DELIVERY_NOTES_LABEL = "Fehlt noch";

function formatDeliveryNotes(value: string) {
  const normalizedValue = value.trim();
  return !normalizedValue || normalizedValue === MISSING_DELIVERY_NOTES_LABEL
    ? EMPTY_DELIVERY_NOTES_LABEL
    : normalizedValue;
}

export function RestockerOrderDetailDialog({
  order,
  backLabel,
  onClose,
  actions,
  children,
  infoRows,
}: Readonly<RestockerOrderDetailDialogProps>) {
  return (
    <>
      <button
        className="subscription-modal__overlay"
        type="button"
        aria-label="Detailansicht schliessen"
        onClick={onClose}
      />

      <dialog
        open
        className="subscription-modal restocker-order-dialog"
        aria-labelledby="restocker-order-dialog-title"
      >
        <div className="restocker-order-dialog__nav">
          <div className="restocker-order-dialog__nav-main">
            <button
              className="restocker-order-dialog__nav-back"
              type="button"
              onClick={onClose}
              aria-label={backLabel}
            >
              <FaArrowLeft aria-hidden="true" />
            </button>

            <div className="restocker-order-dialog__title-block">
              <h2 id="restocker-order-dialog-title">Lieferung #{order.orderId}</h2>
            </div>
          </div>

          <button
            className="button button--ghost restocker-order-dialog__close"
            type="button"
            onClick={onClose}
          >
            Schliessen
          </button>
        </div>

        <div className="subscription-modal__body restocker-order-dialog__body">
          <div className="restocker-order-dialog__status-banner">
            <strong>{formatDeliveryBanner(order.deliveryDate)}</strong>
          </div>

          <div className="restocker-order-dialog__info-card">
            <div className="restocker-order-dialog__info-row">
              <span className="restocker-order-dialog__info-label">Kunde</span>
              <strong className="restocker-order-dialog__info-value">{order.companyName}</strong>
            </div>

            <div className="restocker-order-dialog__info-row">
              <span className="restocker-order-dialog__info-label">Adresse</span>
              <div className="restocker-order-dialog__info-stack">
                <strong className="restocker-order-dialog__info-value">
                  {order.addressLine1}
                </strong>
                <span className="restocker-order-dialog__info-subline">
                  {order.postalCode} {order.city}
                </span>
              </div>
            </div>

            <div className="restocker-order-dialog__info-row">
              <span className="restocker-order-dialog__info-label">Lieferfenster</span>
              <span className="restocker-order-dialog__info-value restocker-order-dialog__info-value--plain">
                {formatDeliveryWindow(order.deliveryTime)}
              </span>
            </div>

            <div className="restocker-order-dialog__info-row restocker-order-dialog__info-row--notes">
              <span className="restocker-order-dialog__info-label">Hinweise</span>
              <p className="restocker-order-dialog__notes-copy">
                {formatDeliveryNotes(order.deliveryNotes)}
              </p>
            </div>

            {infoRows}
          </div>

          {children}

          <div className="restocker-order-dialog__table-shell">
            <div className="restocker-order-dialog__article-head">
              <span className="eyebrow">Artikel</span>
            </div>

            <div className="restocker-order-dialog__table">
              <div className="restocker-order-dialog__table-row restocker-order-dialog__table-row--head">
                <span>Menge</span>
                <span>Artikelnr.</span>
                <span>Bezeichnung</span>
              </div>

              {order.items.map((item) => (
                <div
                  key={`${order.orderKey}-${item.position}`}
                  className="restocker-order-dialog__table-row"
                >
                  <span data-label="Menge">{item.quantityLabel}</span>
                  <span data-label="Artikelnr.">{item.articleNumber}</span>
                  <span data-label="Bezeichnung">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {actions ? <div className="subscription-modal__actions">{actions}</div> : null}
      </dialog>
    </>
  );
}
