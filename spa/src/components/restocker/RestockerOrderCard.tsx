import type { RestockMarketplaceOrder } from "../../types/shop";
import {
  formatDeliveryWindow,
  formatRelativeDelivery,
} from "../../pages/restocker-view/restockerOrderUi";

interface RestockerOrderCardProps {
  order: RestockMarketplaceOrder;
  detailLabel: string;
  onClick: () => void;
  statusLabel?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function RestockerOrderCard({
  order,
  detailLabel,
  onClick,
  statusLabel,
  secondaryActionLabel,
  onSecondaryAction,
}: RestockerOrderCardProps) {
  return (
    <article
      className="restocker-order-card"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="restocker-order-card__head">
        <span className="restocker-order-card__id">#{order.orderId}</span>
        <span className="restocker-order-card__articles">{order.articleCount} Artikel</span>
      </div>

      <div className="restocker-order-card__body">
        <span className="restocker-order-card__body-label">Kunde</span>
        <strong>{order.companyName}</strong>
        <span>{order.addressLine1}</span>
        <span>
          {order.postalCode} {order.city}
        </span>
      </div>

      <div className="restocker-order-card__delivery">
        <div className="restocker-order-card__delivery-date">
          <span className="restocker-order-card__delivery-label">Auslieferung</span>

          <div className="restocker-order-card__delivery-main">
            <strong>{order.deliveryDate}</strong>
            <span className="restocker-order-card__delivery-relative">
              {formatRelativeDelivery(order.deliveryDate)}
            </span>
          </div>
        </div>

        <div className="restocker-order-card__delivery-window">
          <span>Lieferfenster</span>
          <strong>{formatDeliveryWindow(order.deliveryTime)}</strong>
        </div>
      </div>

      <div className="restocker-order-card__footer">
        {statusLabel ? (
          <span className="restocker-order-card__status">{statusLabel}</span>
        ) : (
          <span className="restocker-order-card__status-spacer" aria-hidden="true" />
        )}

        <button
          className="restocker-order-card__detail-link"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
        >
          {detailLabel}
        </button>
      </div>

      {secondaryActionLabel && onSecondaryAction ? (
        <button
          className="restocker-order-card__secondary-action"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSecondaryAction();
          }}
        >
          {secondaryActionLabel}
        </button>
      ) : null}
    </article>
  );
}
