import type { RestockMarketplaceOrder } from "../../types/shop";
import { parseDisplayDate } from "../../pages/restocker-view/restockerOrderUi";

interface RestockerTourCardProps {
    orders: RestockMarketplaceOrder[];
    statusLabel?: string;
}

export function RestockerTourCard({
    orders,
    statusLabel,
}: RestockerTourCardProps) {

    if (!orders.length) return null;

    /* Tour-Datum = erstes Order-Datum (alle gleich) */
    const tourDate = parseDisplayDate(orders[0].deliveryDate);

    const formattedDate = tourDate.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
    });

    /* Alle Items der Tour */
    const totalItems = orders.reduce((sum, order) => {
        const orderItems =
            order.items?.reduce(
                (s, item) => s + item.quantity,
                0
            ) ?? 0;

        return sum + orderItems;
    }, 0);

    /* Stops = Anzahl Lieferungen in der Tour */
    const stops = orders.length;

    /* Earnings = pro Lieferung */
    const earningsPerDelivery = 7;
    const earnings = stops * earningsPerDelivery;

    return (
        <article
            className="restocker-order-card"
            role="button"
            tabIndex={0}
        >
            <div className="restocker-order-card__head">
                <span className="restocker-tour-card_money">
                    {earnings}€
                </span>
            </div>

            <div className="restocker-order-card__body">
                <strong>Tour am {formattedDate}</strong>
            </div>

            <div className="restocker-order-card__delivery">

                <div className="restocker-order-card__delivery-window">
                    <span>Stops</span>
                    <strong>{stops}</strong>
                </div>

                <div className="restocker-order-card__delivery-window">
                    <span>Anzahl Artikel</span>
                    <strong>{totalItems}</strong>
                </div>

            </div>

            <div className="restocker-order-card__footer">
                {statusLabel ? (
                    <span className="restocker-order-card__status">
                        {statusLabel}
                    </span>
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