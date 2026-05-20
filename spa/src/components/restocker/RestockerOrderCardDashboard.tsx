import type { RestockMarketplaceOrder } from "../../types/shop";
import {
  formatDeliveryWindow,
  formatRelativeDelivery,
} from "../../pages/restocker-view/restockerOrderUi";

interface RestockerOrderCardProps {
  order: RestockMarketplaceOrder;
  statusLabel?: string;
}

export function RestockerOrderCard({
  order,
  statusLabel,
}: RestockerOrderCardProps) {
  return (
    <article
      className="restocker-order-card"
      role="button"
      tabIndex={0}
    >
      <div className="restocker-order-card__head">
        <span className="restocker-order-card__id">#{order.orderId}</span>
        <span className="restocker-order-card__articles">
          {order.articleCount} Artikel
        </span>
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
          <span className="restocker-order-card__delivery-label">
            Auslieferung
          </span>

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
          <span
            className="restocker-order-card__status-spacer"
            aria-hidden="true"
          />
        )}

      </div>
    </article>
  );
}