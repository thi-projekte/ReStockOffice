// Restocker-Statistik: berechnet Monatswerte für Verdienst, Fortschritt,
// abgeschlossene/geplante Lieferungen und zeigt die Touren nach Tagen gruppiert an.
// Wiederverwendbare Komponente (aktuell nur in RestockerPage verwendet)

import { useState } from "react";
import { RestockerTourCard } from "../../components/restocker/RestockerTourCard";
import { parseDisplayDate } from "../../pages/restocker-view/restockerOrderUi";
import type { RestockMarketplaceLoadResult, RestockMarketplaceOrder } from "../../types/shop";
import "../../styles/restocker-home.css";

type Props = {
    assignedLoading: boolean;
    assignedError: string | null;
    assignedOrdersResult: RestockMarketplaceLoadResult;
};

function isCompletedOrder(order: RestockMarketplaceOrder) {
    return order.assignment?.status === "completed";
}

function countOrderItems(orders: RestockMarketplaceOrder[]) {
    return orders.reduce((sum, order) => {
        const orderItemCount =
            order.items?.reduce((itemSum, item) => itemSum + item.quantity, 0) ?? 0;

        return sum + orderItemCount;
    }, 0);
}

function countTourDays(orders: RestockMarketplaceOrder[]) {
    return new Set(
        orders.map((order) => parseDisplayDate(order.deliveryDate).toDateString()),
    ).size;
}

function groupOrdersByTourDay(orders: RestockMarketplaceOrder[]) {
    return Object.values(
        orders.reduce((acc, order) => {
            const dateKey = parseDisplayDate(order.deliveryDate).toDateString();

            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }

            acc[dateKey].push(order);
            return acc;
        }, {} as Record<string, RestockMarketplaceOrder[]>),
    );
}

function deliveryLabel(count: number) {
    return count === 1 ? "Lieferung" : "Lieferungen";
}

export function RestockerStatisticsCard({
    assignedLoading,
    assignedError,
    assignedOrdersResult,
}: Props) {
    const earningsPerDelivery = 7;
    const today = new Date();

    const [selectedMonth, setSelectedMonth] = useState(
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`,
    );

    const [year, month] = selectedMonth.split("-").map(Number);

    const monthlyOrders = assignedOrdersResult.orders.filter((order) => {
        const deliveryDate = parseDisplayDate(order.deliveryDate);
        const orderYear = deliveryDate.getFullYear();
        const orderMonth = deliveryDate.getMonth() + 1;

        return orderMonth === month && orderYear === year;
    });

    const completedOrders = monthlyOrders.filter(isCompletedOrder);
    const plannedOrders = monthlyOrders.filter((order) => !isCompletedOrder(order));

    const completedTours = groupOrdersByTourDay(completedOrders);
    const plannedTours = groupOrdersByTourDay(plannedOrders);
    const totalTours = completedTours.length + plannedTours.length;

    const totalCompletedDeliveries = completedOrders.length;
    const totalPlannedDeliveries = plannedOrders.length;
    const totalMonthlyDeliveries = monthlyOrders.length;
    const completedTourDays = countTourDays(completedOrders);
    const plannedTourDays = countTourDays(plannedOrders);
    const totalDeliveredItems = countOrderItems(completedOrders);
    const totalPlannedItems = countOrderItems(plannedOrders);
    const totalEarnings = totalCompletedDeliveries * earningsPerDelivery;
    const completionRate =
        totalMonthlyDeliveries > 0
            ? Math.round((totalCompletedDeliveries / totalMonthlyDeliveries) * 100)
            : 0;

    return (
        <div className="card">
            <div className="card-header">
                <div>
                    <h2>Deine Restocker-Statistik</h2>
                    <p>
                        Hallo, hier siehst du deine Performance, Verdienst und Details zu
                        deinen abgeschlossenen und geplanten Touren.
                    </p>
                </div>
            </div>

            <div className="statistics-filter">
                <strong>Monat auswählen:</strong>
                <input
                    type="month"
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(event.target.value)}
                />
            </div>

            <div className="metrics-row-desktop statistics-metrics">
                <div className="metric-tile">
                    <div className="metric-label">Verdienst</div>
                    <div className="metric-value">{totalEarnings} EUR</div>
                    <div className="metric-sub">7 EUR pro Lieferung</div>
                </div>

                <div className="metric-tile">
                    <div className="metric-label">Abgeschlossen</div>
                    <div className="metric-value">{totalCompletedDeliveries}</div>
                    <div className="metric-sub">{completedTourDays} Tourtage</div>
                </div>

                <div className="metric-tile">
                    <div className="metric-label">Geplant</div>
                    <div className="metric-value">{totalPlannedDeliveries}</div>
                    <div className="metric-sub">{plannedTourDays} Tourtage</div>
                </div>

                <div className="metric-tile">
                    <div className="metric-label">Fortschritt</div>
                    <div className="metric-value">{completionRate}%</div>
                    <div className="metric-sub">
                        {totalCompletedDeliveries} von {totalMonthlyDeliveries} erledigt
                    </div>
                </div>
            </div>

            {assignedLoading ? (
                <p>Lade deine Aufträge...</p>
            ) : assignedError ? (
                <p style={{ color: "red" }}>{assignedError}</p>
            ) : totalTours === 0 ? (
                <strong>
                    Du hast in diesem Monat keine Touren abgeschlossen oder geplant.
                </strong>
            ) : (
                <>
                    <strong className="statistics-tour-summary">
                        In diesem Monat sind {totalCompletedDeliveries}{" "}
                        {deliveryLabel(totalCompletedDeliveries)} abgeschlossen und{" "}
                        {totalPlannedDeliveries} {deliveryLabel(totalPlannedDeliveries)} geplant.
                    </strong>

                    <div className="statistics-breakdown">
                        <div className="statistics-breakdown__item statistics-breakdown__item--completed">
                            <span>Abgeschlossen</span>
                            <strong>{totalCompletedDeliveries}</strong>
                            <small>{totalDeliveredItems} ausgelieferte Artikel</small>
                        </div>

                        <div className="statistics-breakdown__item statistics-breakdown__item--planned">
                            <span>Geplant</span>
                            <strong>{totalPlannedDeliveries}</strong>
                            <small>{totalPlannedItems} geplante Artikel</small>
                        </div>
                    </div>

                    <p className="mobile-swipe-hint">Swipe um mehr zu sehen:</p>

                    {completedTours.length > 0 ? (
                        <section className="statistics-tour-section">
                            <div className="statistics-tour-section__header">
                                <h3>Abgeschlossene Lieferungen</h3>
                                <span>
                                    {completedTours.length}{" "}
                                    {completedTours.length === 1 ? "Tourtag" : "Tourtage"}
                                </span>
                            </div>

                            <div className="open-orders-carousel statistics-tour-grid">
                                {completedTours.map((tourOrders) => (
                                    <RestockerTourCard
                                        key={`completed-${tourOrders[0].deliveryDate}`}
                                        orders={tourOrders}
                                        statusLabel="Abgeschlossen"
                                    />
                                ))}
                            </div>
                        </section>
                    ) : null}

                    {plannedTours.length > 0 ? (
                        <section className="statistics-tour-section">
                            <div className="statistics-tour-section__header">
                                <h3>Geplante Lieferungen</h3>
                                <span>
                                    {plannedTours.length}{" "}
                                    {plannedTours.length === 1 ? "Tourtag" : "Tourtage"}
                                </span>
                            </div>

                            <div className="open-orders-carousel statistics-tour-grid">
                                {plannedTours.map((tourOrders) => (
                                    <RestockerTourCard
                                        key={`planned-${tourOrders[0].deliveryDate}`}
                                        orders={tourOrders}
                                        statusLabel="Geplant"
                                    />
                                ))}
                            </div>
                        </section>
                    ) : null}
                </>
            )}
        </div>
    );
}
