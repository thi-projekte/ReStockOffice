import { useState } from "react";
import { RestockerTourCard } from "../../components/restocker/RestockerTourCard";
import { parseDisplayDate } from "../../pages/restocker-view/restockerOrderUi";
import type { RestockMarketplaceLoadResult } from "../../types/shop";
import type { RestockMarketplaceOrder } from "../../types/shop";
import "../../styles/restocker-home.css";


type Props = {
    assignedLoading: boolean;
    assignedError: string | null;
    assignedOrdersResult: RestockMarketplaceLoadResult;
};



export function RestockerStatisticsCard({
    assignedLoading,
    assignedError,
    assignedOrdersResult,
}: Props) {

    const earningsPerDelivery = 7;

    /* Aktuellen Monat vorauswählen */
    const today = new Date();

    const [selectedMonth, setSelectedMonth] = useState(
        `${today.getFullYear()}-${String(
            today.getMonth() + 1
        ).padStart(2, "0")}`
    );

    /* Monat + Jahr aus Input lesen */
    const [year, month] = selectedMonth
        .split("-")
        .map(Number);

    /* Orders nach ausgewähltem Monat filtern */
    const monthlyOrders = assignedOrdersResult.orders.filter((order) => {

        const deliveryDate = parseDisplayDate(order.deliveryDate);
        const orderYear = deliveryDate.getFullYear();
        const orderMonth = deliveryDate.getMonth() + 1;

        return (
            orderMonth === month &&
            orderYear === year
        );
    });

    /* Nur abgeschlossene Orders */
    const completedOrders = monthlyOrders;
    /*.filter(
        (order) => order.assignment?.status === "completed"
    );*/

    /* Gesamtverdienst */
    const totalEarnings =
        completedOrders.length * earningsPerDelivery;

    /* Gefahrene Tourtage */
    const uniqueTourDays = new Set(
        completedOrders.map((order) => {
            const date = parseDisplayDate(order.deliveryDate);

            return date.toDateString();
        })
    ).size;

    /* Zustellungen */
    const totalDeliveries = completedOrders.length;

    /* Artikel zählen */
    const totalItems = completedOrders.reduce((sum, order) => {

        const orderItemCount =
            order.items?.reduce(
                (itemSum, item) =>
                    itemSum + item.quantity,
                0
            ) ?? 0;

        return sum + orderItemCount;

    }, 0);

    const groupedTours = Object.values(
        completedOrders.reduce((acc, order) => {

            const dateKey = parseDisplayDate(order.deliveryDate)
                .toDateString();

            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }

            acc[dateKey].push(order);

            return acc;

        }, {} as Record<string, RestockMarketplaceOrder[]>)
    );

    return (
        <div className="card">

            <div className="card-header">
                <div>
                    <h2>Deine Restocker-Statistik</h2>

                    <p>
                        Hallo, hier siehst du deine Performance,
                        Verdienst und Details zu deinen
                        abgeschlossenen und geplanten Touren.
                    </p>
                </div>
            </div>

            {/* Monatsfilter */}
            <div className="statistics-filter">

                <strong>Monat auswählen:</strong>

                <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) =>
                        setSelectedMonth(e.target.value)
                    }
                />
            </div>

            {/* Statistik Tiles */}
            <div className="metrics-row-desktop">

                <div className="metric-tile">

                    <div className="metric-label">
                        Gesamtverdienst
                    </div>

                    <div className="metric-value">
                        {totalEarnings}€
                    </div>

                    <div className="metric-sub">
                        7€ pro abgeschlossener Lieferung
                    </div>
                </div>

                <div className="metric-tile">

                    <div className="metric-label">
                        Angenommene Touren
                    </div>

                    <div className="metric-value">
                        {uniqueTourDays}
                    </div>

                    <div className="metric-sub">
                        Tage mit angenommenen Touren
                    </div>
                </div>

                <div className="metric-tile">

                    <div className="metric-label">
                        Zustellungen
                    </div>

                    <div className="metric-value">
                        {totalDeliveries}
                    </div>

                    <div className="metric-sub">
                        Ausgewählte Lieferungen
                    </div>
                </div>

                <div className="metric-tile">

                    <div className="metric-label">
                        Ausgelieferte Artikel
                    </div>

                    <div className="metric-value">
                        {totalItems}
                    </div>

                    <div className="metric-sub">
                        Gesamtanzahl ausgelieferter Produkte
                    </div>
                </div>

            </div>

            {/* Orders */}
            {assignedLoading ? (

                <p>Lade deine Aufträge...</p>

            ) : assignedError ? (

                <p style={{ color: "red" }}>
                    {assignedError}
                </p>

            ) : completedOrders.length === 0 ? (

                <strong>
                    Du hast in diesem Monat
                    keine Touren abgeschlossen oder geplant.
                </strong>

            ) : (

                <>
                    <strong className="statistics-tour-summary">
                        Du hast in diesem Monat{" "}
                        {completedOrders.length}{" "}
                        {completedOrders.length === 1 ? "Tour" : "Touren"} abgeschlossen oder geplant.
                    </strong>

                    <p className="mobile-swipe-hint">Swipe um mehr zu sehen:</p>

                    <div className="open-orders-carousel statistics-tour-grid">


                        {groupedTours.map((tourOrders) => (
                            <RestockerTourCard
                                key={tourOrders[0].deliveryDate}
                                orders={tourOrders}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
