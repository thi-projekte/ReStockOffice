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
import "../../styles/restocker-home.css";

const EARNINGS_PER_COMPANY = 7;

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

export function RestockerPage() {
    const auth = useAuth();
    const navigate = useNavigate();
    const restockerName = auth.user?.username ?? auth.user?.id ?? "";
    const [tour, setTour] = useState<Tour | null>(null);
    const [deliveries, setDeliveries] = useState<DeliveryDetail[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let ignoreResult = false;

        async function loadDeliveries() {
            if (!auth.token || !restockerName) {
                if (!ignoreResult) {
                    setTour(null);
                    setDeliveries([]);
                    setIsLoading(false);
                }
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                await syncTodayOrders({
                    token: auth.token,
                    restockerName,
                });

                const tours = await loadTodayTours({
                    token: auth.token,
                    restockerName,
                });
                const todaysTour =
                    tours.find((candidate) => !candidate.endTime) ?? tours[0] ?? null;

                if (!todaysTour) {
                    if (!ignoreResult) {
                        setTour(null);
                        setDeliveries([]);
                    }
                    return;
                }

                const details = await loadTourDetails({
                    token: auth.token,
                    tourId: todaysTour.id,
                });

                if (!ignoreResult) {
                    setTour(todaysTour);
                    setDeliveries(details);
                }
            } catch (loadError) {
                if (!ignoreResult) {
                    setError(
                        loadError instanceof Error
                            ? loadError.message
                            : "Die Lieferungen konnten nicht geladen werden.",
                    );
                    setTour(null);
                    setDeliveries([]);
                }
            } finally {
                if (!ignoreResult) {
                    setIsLoading(false);
                }
            }
        }

        void loadDeliveries();

        return () => {
            ignoreResult = true;
        };
    }, [auth.token, restockerName]);

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
    const greetingName = getGreetingName(auth.user);

    if (!auth.isInitializing && !auth.hasRole("Restocker")) {
        return <Navigate to="/" replace />;
    }

    if (auth.isInitializing || isLoading) {
        return <section className="page-card">Lieferungen werden geladen...</section>;
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
                                <h2>Übersicht - Heutige Lieferungen</h2>
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
                            <p className="muted-text">Heute ist aktuell keine Tour fuer dich geplant.</p>
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
                                <p>
                                    Es gibt weitere Lieferungen in deiner Naehe. Diese findest du im
                                    Marktplatz.
                                </p>
                            </div>
                        </div>

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
                                <h2>Deine Übersicht</h2>
                                <p>Hier einige Lieferungen aus deiner heutigen Tour.</p>
                            </div>
                        </div>

                        {previewDeliveries.length > 0 ? (
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
