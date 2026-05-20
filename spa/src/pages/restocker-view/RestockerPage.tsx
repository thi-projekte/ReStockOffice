import "../../styles/restocker-home.css";
import { useEffect, useState } from "react";
import { loadOpenRestockOrders } from "../../services/orders";
import { useAuth } from "../../auth/AuthProvider";
import type { RestockMarketplaceOrder } from "../../types/shop";
import { loadAssignedRestockOrders } from "../../services/orders";
import type { RestockMarketplaceLoadResult } from "../../types/shop";


export function RestockerPage() {
    const auth = useAuth();

    const [openOrders, setOpenOrders] = useState<RestockMarketplaceOrder[]>([]);
    const [openLoading, setOpenLoading] = useState(true);
    const [openError, setOpenError] = useState<string | null>(null);

    const [assignedOrdersResult, setAssignedOrdersResult] =
        useState<RestockMarketplaceLoadResult>({
            orders: [],
            source: "live",
            hasPlaceholderCustomerData: false,
        });

    const [assignedLoading, setAssignedLoading] = useState(true);
    const [assignedError, setAssignedError] = useState<string | null>(null);



    /*Daten laden */
    useEffect(() => {
        async function load() {
            if (!auth.token) return;

            try {
                setOpenLoading(true);

                const result = await loadOpenRestockOrders({
                    token: auth.token,
                    restockerName: auth.user?.username ?? auth.user?.id ?? "",
                });

                setOpenOrders(result.orders);
            } catch (err) {
                setOpenError(
                    err instanceof Error
                        ? err.message
                        : "Fehler beim Laden der offenen Aufträge"
                );
            } finally {
                setOpenLoading(false);
            }
        }

        load();
    }, [auth.token]);

    useEffect(() => {
        async function load() {
            if (!auth.token || !auth.user?.id) return;

            setAssignedLoading(true);
            setAssignedError(null);

            try {
                const result = await loadAssignedRestockOrders({
                    token: auth.token,
                    restockerId: auth.user.id,
                });

                setAssignedOrdersResult(result);
            } catch (err) {
                setAssignedError(
                    err instanceof Error
                        ? err.message
                        : "Fehler beim Laden deiner zugeordneten Aufträge"
                );
            } finally {
                setAssignedLoading(false);
            }
        }

        load();
    }, [auth.token, auth.user?.id]);

    return (
        <>
            <div className="restocker-page">
                <div className="restocker-inner">

                    <button className="tour-btn">
                        Tour von heute beginnen
                    </button>

                    {/* Heutige Lieferungen */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <h4>Deine Lieferungen heute</h4>
                                <h2>Übersicht – Heutige Lieferungen</h2>
                                <p> Hallo, hier siehst du die wichtigsten Kennzahlen zu deinen heutigen Lieferungen.</p>
                            </div>
                        </div>

                        <div className="metrics-row-desktop">
                            <div className="metric-tile">
                                <div className="metric-label">Abgeschlossen</div>
                                <div className="metric-value">2</div>
                                <div className="metric-sub">von 10 Lieferungen</div>
                            </div>
                            <div className="metric-tile">
                                <div className="metric-label">Heutiger Verdienst</div>
                                <div className="metric-value">30 €</div>
                            </div>

                        </div>

                        <button className="tour-btn">
                            Alle heutigen Lieferungen anzeigen
                        </button>
                    </div>

                    {/* Offene Aufträge */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <h4>Verfügbare Aufträge</h4>
                                <h2>Offene Lieferungen in deiner Nähe</h2>
                                {openLoading ? (
                                    <p>Lade offene Aufträge...</p>
                                ) : openError ? (
                                    <p style={{ color: "red" }}>{openError}</p>
                                ) : (
                                    <>
                                        <p>Es gibt weitere Lieferungen in deiner Nähe. Beispielsweise:</p>

                                        <ul>
                                            {openOrders.slice(0, 3).map((order) => (
                                                <li key={order.orderKey}>
                                                    <strong>{order.companyName}</strong> – {order.city} –{" "}
                                                    {order.articleCount} Artikel
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </div>
                        </div>


                        <button className="tour-btn">
                            Alle offenen Lieferungen anzeigen
                        </button>
                    </div>

                    {/* Meine Aufträge */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <h4>Deine Aufträge</h4>
                                <h2>Deine Übersicht</h2>
                                {assignedLoading ? (
                                    <p>Lade deine Aufträge...</p>
                                ) : assignedError ? (
                                    <p style={{ color: "red" }}>{assignedError}</p>
                                ) : assignedOrdersResult.orders.length === 0 ? (
                                    <p>Du hast aktuell keine zugeordneten Aufträge.</p>
                                ) : (
                                    <>
                                        <p>Du hast aktuell {assignedOrdersResult.orders.length} zugeordnete Aufträge.</p>

                                        <ul>
                                            {assignedOrdersResult.orders.slice(0, 3).map((order) => (
                                                <li key={order.orderKey}>
                                                    <strong>{order.companyName}</strong> – {order.city} –{" "}
                                                    {order.articleCount} Artikel
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </div>
                        </div>



                        <button className="tour-btn">
                            Alle dir zugeordneten Aufträge anzeigen
                        </button>
                    </div>


                </div>
            </div>
        </>
    );
}
