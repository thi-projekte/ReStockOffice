import type { RestockMarketplaceOrder } from "../../types/shop";
import { formatDeliveryWindow } from "../../pages/restocker-view/restockerOrderUi";
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
  const companyName = customer?.companyName || order.companyName;
  const streetLine = customer
    ? [customer.street, customer.houseNumber].filter(Boolean).join(" ").trim()
    : order.addressLine1;
  const cityLine = customer
    ? [customer.postalCode, customer.city].filter(Boolean).join(" ").trim()
    : [order.postalCode, order.city].filter(Boolean).join(" ").trim();
  const deliveryTime = customer?.deliveryTime != null
    ? customer.deliveryTime.toString()
    : order.deliveryTime;

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
        <strong className="restocker-order-card__company-name">{companyName}</strong>
        <span>{streetLine}</span>
        <span>{cityLine}</span>
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
            {formatDeliveryWindow(deliveryTime)}
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
