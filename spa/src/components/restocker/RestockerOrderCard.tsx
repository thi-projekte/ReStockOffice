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
}

export function RestockerOrderCard({
  order,
  detailLabel,
  onClick,
  statusLabel,
}: RestockerOrderCardProps) {
  return (
    <button className="restocker-order-card" type="button" onClick={onClick}>
      <div className="restocker-order-card__head">
        <span className="restocker-order-card__id">#{order.orderId}</span>
        <span className="restocker-order-card__articles">{order.articleCount} Artikel</span>
      </div>

      <div className="restocker-order-card__body">
        <strong>{order.companyName}</strong>
        <span>{order.addressLine1}</span>
        <span>
          {order.postalCode} {order.city}
        </span>
      </div>

      <div className="restocker-order-card__delivery">
        <span className="restocker-order-card__delivery-label">Auslieferung</span>

        <div className="restocker-order-card__delivery-main">
          <strong>{order.deliveryDate}</strong>
          <span className="restocker-order-card__delivery-relative">
            {formatRelativeDelivery(order.deliveryDate)}
          </span>
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
          <span />
        )}
        <span className="restocker-order-card__detail-link">{detailLabel}</span>
      </div>
    </button>
  );
}
