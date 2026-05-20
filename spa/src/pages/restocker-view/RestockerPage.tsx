import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import {
    loadTodayTours,
    loadTourDetails,
    syncTodayOrders,
    type DeliveryDetail,
    type Tour,
} from "../../services/deliveries";
import {
    loadAssignedRestockOrders,
    loadOpenRestockOrders,
} from "../../services/orders";
import type {
    RestockMarketplaceLoadResult,
    RestockMarketplaceOrder,
} from "../../types/shop";
import "../../styles/restocker-home.css";

const EARNINGS_PER_COMPANY = 7;

function createEmptyMarketplaceResult(): RestockMarketplaceLoadResult {
    return {
        orders: [],
        source: "live",
        hasPlaceholderCustomerData: false,
    };
}

function formatMoney(value: number) {
    return new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
    }).format(value);
}

function getGreetingName(user: ReturnType<typeof useAuth>["user"]) {
    const preferredName =
        user?.firstName ??
        user?.username ??
        user?.email?.split("@")[0];

    return preferredName?.trim() || "Restocker";
}

function getTourStatus(tour: Tour | null) {
    if (!tour) {
        return "Keine Tour";
    }

    if (tour.endTime) {
        return "Abgeschlossen";
    }

    if (tour.startTime) {
        return "Laeuft";
    }

    return "Bereit zur Abholung";
}

async function loadTodayDeliveryData(token: string, restockerName: string) {
    await syncTodayOrders({
        token,
        restockerName,
    });

    const tours = await loadTodayTours({
        token,
        restockerName,
    });
    const todaysTour =
        tours.find((candidate) => !candidate.endTime) ?? tours[0] ?? null;

    if (!todaysTour) {
        return {
            tour: null,
            deliveries: [],
        };
    }

    const deliveries = await loadTourDetails({
        token,
        tourId: todaysTour.id,
    });

    return {
        tour: todaysTour,
        deliveries,
    };
}

function RestockerHomeOrderTile({
    order,
    statusLabel,
}: {
    order: RestockMarketplaceOrder;
    statusLabel?: string;
}) {
    return (
        <div className="order-tile">
            <div className="order-top">
                <span className="order-id">#{order.orderId}</span>
                <span className="order-id">{order.deliveryDate}</span>
            </div>
            <strong className="order-company">{order.companyName}</strong>
            <span className="order-addr">
                {order.addressLine1}, {order.postalCode} {order.city}
            </span>
            <div className="order-meta">
                <span>{order.articleCount} Artikel</span>
                <span>{statusLabel ?? "Offen"}</span>
            </div>
        </div>
    );
}

export function RestockerPage() {
    const auth = useAuth();
    const navigate = useNavigate();
    const restockerName = auth.user?.username ?? auth.user?.id ?? "";
    const [tour, setTour] = useState<Tour | null>(null);
    const [deliveries, setDeliveries] = useState<DeliveryDetail[]>([]);
    const [openOrdersResult, setOpenOrdersResult] =
        useState<RestockMarketplaceLoadResult>(createEmptyMarketplaceResult);
    const [assignedOrdersResult, setAssignedOrdersResult] =
        useState<RestockMarketplaceLoadResult>(createEmptyMarketplaceResult);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let ignoreResult = false;

        async function loadDashboardData() {
            if (!auth.token || !restockerName) {
                if (!ignoreResult) {
                    setTour(null);
                    setDeliveries([]);
                    setOpenOrdersResult(createEmptyMarketplaceResult());
                    setAssignedOrdersResult(createEmptyMarketplaceResult());
                    setIsLoading(false);
                }
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const [deliveryResult, openOrders, assignedOrders] = await Promise.all([
                    loadTodayDeliveryData(auth.token, restockerName),
                    loadOpenRestockOrders({
                        token: auth.token,
                        restockerName,
                    }),
                    auth.user?.id
                        ? loadAssignedRestockOrders({
                            token: auth.token,
                            restockerId: auth.user.id,
                        })
                        : Promise.resolve(createEmptyMarketplaceResult()),
                ]);

                if (!ignoreResult) {
                    setTour(deliveryResult.tour);
                    setDeliveries(deliveryResult.deliveries);
                    setOpenOrdersResult(openOrders);
                    setAssignedOrdersResult(assignedOrders);
                }
            } catch (loadError) {
                if (!ignoreResult) {
                    setError(
                        loadError instanceof Error
                            ? loadError.message
                            : "Die Restocker-Daten konnten nicht geladen werden.",
                    );
                    setTour(null);
                    setDeliveries([]);
                    setOpenOrdersResult(createEmptyMarketplaceResult());
                    setAssignedOrdersResult(createEmptyMarketplaceResult());
                }
            } finally {
                if (!ignoreResult) {
                    setIsLoading(false);
                }
            }
        }

        void loadDashboardData();

        return () => {
            ignoreResult = true;
        };
    }, [auth.token, auth.user?.id, restockerName]);

    const sortedDeliveries = useMemo(
        () => [...deliveries].sort((first, second) => first.stopOrder - second.stopOrder),
        [deliveries],
    );

    const completedDeliveries = sortedDeliveries.filter(
        (delivery) => delivery.deliveredAt,
    );
    const collectedDeliveries = sortedDeliveries.filter(
        (delivery) => delivery.collected,
    );
    const nextDelivery =
        sortedDeliveries.find((delivery) => !delivery.deliveredAt) ?? sortedDeliveries[0];
    const companyCount = new Set(
        sortedDeliveries.map((delivery) => delivery.userId || delivery.companyName),
    ).size;
    const earnings = tour?.earnings ?? companyCount * EARNINGS_PER_COMPANY;
    const previewDeliveries = sortedDeliveries.slice(0, 3);
    const previewOpenOrders = openOrdersResult.orders.slice(0, 2);
    const previewAssignedOrders = assignedOrdersResult.orders.slice(0, 3);
    const greetingName = getGreetingName(auth.user);

    if (!auth.isInitializing && !auth.hasRole("Restocker")) {
        return <Navigate to="/" replace />;
    }

    if (auth.isInitializing || isLoading) {
        return <section className="page-card">Restocker-Daten werden geladen...</section>;
    }

    return (
        <>
            <div className="restocker-page">
                <div className="restocker-inner">
                    <button
                        className="tour-btn"
                        type="button"
                        onClick={() => navigate("/restocker-deliveries")}
                        disabled={!tour}
                    >
                        Tour von heute beginnen
                    </button>

                    {/* Heutige Lieferungen */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <h4>Deine Lieferungen heute</h4>
                                <h2>Uebersicht - Heutige Lieferungen</h2>
                                <p>
                                    Hallo {greetingName}, hier siehst du die wichtigsten Kennzahlen
                                    zu deinen heutigen Lieferungen.
                                </p>
                            </div>
                        </div>

                        {error ? <div className="error-box">{error}</div> : null}

                        <div className="metrics-row-desktop">
                            <div className="metric-tile">
                                <div className="metric-label">Abgeschlossen</div>
                                <div className="metric-value">{completedDeliveries.length}</div>
                                <div className="metric-sub">
                                    von {sortedDeliveries.length} Lieferungen
                                </div>
                            </div>
                            <div className="metric-tile">
                                <div className="metric-label">Heutiger Verdienst</div>
                                <div className="metric-value">{formatMoney(earnings)}</div>
                                <div className="metric-sub">
                                    {companyCount} Unternehmen x {EARNINGS_PER_COMPANY} EUR
                                </div>
                            </div>
                        </div>

                        <div className="metrics-row-desktop">
                            <div className="metric-tile">
                                <div className="metric-label">Eingesammelt</div>
                                <div className="metric-value">{collectedDeliveries.length}</div>
                                <div className="metric-sub">
                                    von {sortedDeliveries.length} Paketen bestaetigt
                                </div>
                            </div>
                            <div className="metric-tile">
                                <div className="metric-label">Tourstatus</div>
                                <div className="metric-value metric-value--compact">
                                    {getTourStatus(tour)}
                                </div>
                            </div>
                        </div>

                        {nextDelivery ? (
                            <div className="order-tile order-tile--highlight">
                                <div className="order-top">
                                    <span className="order-id">Naechster Stopp #{nextDelivery.orderId}</span>
                                    <span className="order-id">Stopp {nextDelivery.stopOrder}</span>
                                </div>
                                <strong className="order-company">{nextDelivery.companyName}</strong>
                                <span className="order-addr">
                                    {nextDelivery.street}
                                    {nextDelivery.houseNumber ? ` ${nextDelivery.houseNumber}` : ""},{" "}
                                    {nextDelivery.postalCode} {nextDelivery.city}
                                </span>
                                <div className="order-meta">
                                    <span>{nextDelivery.items.length} Positionen</span>
                                    <span>{nextDelivery.deliveredAt ? "Erledigt" : "Offen"}</span>
                                </div>
                            </div>
                        ) : (
                            <p className="muted-text">
                                Heute ist aktuell keine Delivery-Tour fuer dich geplant.
                            </p>
                        )}

                        <button
                            className="tour-btn"
                            type="button"
                            onClick={() => navigate("/restocker-deliveries")}
                        >
                            Alle heutigen Lieferungen anzeigen
                        </button>
                    </div>

                    {/* Offene Auftraege */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <h4>Verfuegbare Auftraege</h4>
                                <h2>Offene Lieferungen in deiner Naehe</h2>
                                <p>Es gibt weitere Lieferungen in deiner Naehe. Beispielsweise:</p>
                            </div>
                        </div>

                        {previewOpenOrders.length > 0 ? (
                            <div className="orders-grid">
                                {previewOpenOrders.map((order) => (
                                    <RestockerHomeOrderTile order={order} key={order.orderKey} />
                                ))}
                            </div>
                        ) : (
                            <p className="muted-text">Aktuell sind keine offenen Auftraege verfuegbar.</p>
                        )}

                        <button
                            className="tour-btn"
                            type="button"
                            onClick={() => navigate("/restocker-orders")}
                        >
                            Alle offenen Lieferungen anzeigen
                        </button>
                    </div>

                    {/* Meine Auftraege */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <h4>Deine Auftraege</h4>
                                <h2>Deine Uebersicht</h2>
                                <p>Hier einige Auftraege, die du dir gesichert hast.</p>
                            </div>
                        </div>

                        {previewAssignedOrders.length > 0 ? (
                            <div className="orders-grid">
                                {previewAssignedOrders.map((order) => (
                                    <RestockerHomeOrderTile
                                        order={order}
                                        key={order.orderKey}
                                        statusLabel="Angenommen"
                                    />
                                ))}
                            </div>
                        ) : previewDeliveries.length > 0 ? (
                            <div className="orders-grid">
                                {previewDeliveries.map((delivery) => (
                                    <div className="order-tile" key={delivery.id}>
                                        <div className="order-top">
                                            <span className="order-id">#{delivery.orderId}</span>
                                            <span className="order-id">Stopp {delivery.stopOrder}</span>
                                        </div>
                                        <strong className="order-company">{delivery.companyName}</strong>
                                        <span className="order-addr">
                                            {delivery.street}
                                            {delivery.houseNumber ? ` ${delivery.houseNumber}` : ""},{" "}
                                            {delivery.postalCode} {delivery.city}
                                        </span>
                                        <div className="order-meta">
                                            <span>{delivery.items.length} Positionen</span>
                                            <span>{delivery.deliveredAt ? "Erledigt" : "Offen"}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="muted-text">Noch keine zugeordneten Lieferungen vorhanden.</p>
                        )}

                        <button
                            className="tour-btn"
                            type="button"
                            onClick={() => navigate("/restocker-my-orders")}
                        >
                            Alle dir zugeordneten Auftraege anzeigen
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
