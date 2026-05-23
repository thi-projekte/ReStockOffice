import type { RestockMarketplaceOrder } from "../../types/shop";
import {
  formatDeliveryWindow,
  formatRelativeDelivery,
} from "../../pages/restocker-view/restockerOrderUi";
import type { UserProfile } from "../../types/user";

interface RestockerOrderCardProps {
  order: RestockMarketplaceOrder;
  statusLabel?: string;
  customer?: UserProfile;
}



export function RestockerOrderCard({
  order,
  statusLabel,
  customer,
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
        <strong className="restocker-order-card__company-name">{customer?.companyName}</strong>

        <span>{customer?.street}</span>

        <span>
          {customer?.postalCode} {customer?.city}
        </span>
        <span>
          <span>{order.postalCode} {order.city}</span>
        </span>
      </div>

      <div className="restocker-order-card__delivery">
        <div className="restocker-order-card__delivery-date">
          <span className="restocker-order-card__delivery-label">
            Auslieferung
          </span>

          <div className="restocker-order-card__delivery-main">
            <strong>{order.deliveryDate}</strong>
          </div>
        </div>

        <div className="restocker-order-card__delivery-window">
          <span>Lieferfenster</span>

          <strong>
            {customer?.deliveryTime != null
              ? formatDeliveryWindow(customer.deliveryTime.toString())
              : "-"}
          </strong>
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
