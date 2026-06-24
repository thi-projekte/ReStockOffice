// Dashboard-Auftragskarte für Restocker.
// Zeigt kompakte Lieferinformationen zu einem Auftrag und bietet optional
// Aktionen wie Detailansicht oder Fahrt annehmen.
// Fast identisch zu RestockerOrderCard wird aber im Dashboard genutzt

import type { RestockMarketplaceOrder } from "../../types/shop";
import { formatDeliveryWindow } from "../../pages/restocker-view/restockerOrderUi";
import type { CustomerUser } from "../../services/users";

interface RestockerOrderCardProps {
  order: RestockMarketplaceOrder;
  statusLabel?: string;
  customer?: CustomerUser;
  detailLabel?: string;
  onClick?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function RestockerOrderCard({
  order,
  statusLabel,
  customer,
  detailLabel,
  onClick,
  secondaryActionLabel,
  onSecondaryAction,
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
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="restocker-order-card__head">
        <span className="restocker-order-card__id">
          #
          {order.orderId}
        </span>
        <span className="restocker-order-card__articles">
          {order.articleCount}
          {" "}
          Artikel
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
        {statusLabel
          ? (
              <span className="restocker-order-card__status">{statusLabel}</span>
            )
          : (
              <span
                className="restocker-order-card__status-spacer"
                aria-hidden="true"
              />
            )}

        {(detailLabel && onClick) || (secondaryActionLabel && onSecondaryAction)
          ? (
              <div
                className={`restocker-order-card__actions ${statusLabel ? "restocker-order-card__actions--with-status" : ""
                }`.trim()}
              >
                {detailLabel && onClick
                  ? (
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
                    )
                  : null}

                {secondaryActionLabel && onSecondaryAction
                  ? (
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
                    )
                  : null}
              </div>
            )
          : null}

      </div>
    </article>
  );
}
