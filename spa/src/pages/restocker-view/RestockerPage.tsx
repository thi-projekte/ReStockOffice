import "../../styles/restocker-home.css";
import { useEffect, useState } from "react";
import { loadOpenRestockOrders } from "../../services/orders";
import { useAuth } from "../../auth/AuthProvider";
import type { RestockMarketplaceOrder } from "../../types/shop";
import { loadAssignedRestockOrders } from "../../services/orders";
import type { RestockMarketplaceLoadResult } from "../../types/shop";
import { getDaysUntilDelivery } from "./restockerOrderUi";
import { useNavigate } from "react-router-dom";
import { RestockerOrderCard } from "../../components/restocker/RestockerOrderCardDashboard";
import { RestockerStatisticsCard } from "../../components/restocker/RestockerStatisticsCard";
import { loadCustomerProfile } from "../../services/users";
import type { UserProfile } from "../../types/user";


export function RestockerPage() {
    const auth = useAuth();

    const navigate = useNavigate();

    const [openOrders, setOpenOrders] = useState<RestockMarketplaceOrder[]>([]);
    const [openLoading, setOpenLoading] = useState(true);
    const [openError, setOpenError] = useState<string | null>(null);

    const [customerProfiles, setCustomerProfiles] = useState<
        Record<string, UserProfile>
    >({});

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
                    restockerName:
                        auth.user?.username ?? auth.user?.id ?? "",
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
    }, [auth.token, auth.user?.id, auth.user?.username]);

    useEffect(() => {
        async function loadProfiles() {
            if (!auth.token) return;

            const uniqueUserIds = [
                ...new Set(openOrders.map((o) => o.customerId).filter(Boolean)),
            ];

            const results = await Promise.all(
                uniqueUserIds.map(async (userId) => {
                    const profile = await loadCustomerProfile({
                        token: auth.token!,
                        userId,
                    });

                    return [userId, profile] as const;
                })
            );

            setCustomerProfiles(Object.fromEntries(results));
        }

        if (openOrders.length > 0) {
            loadProfiles();
        }
    }, [openOrders, auth.token]);

    const assignedToday = assignedOrdersResult.orders.filter(
        (order) => getDaysUntilDelivery(order.deliveryDate) === 0
    );
    const totalToday = assignedToday.length;

    const completedToday = assignedToday.filter(
        (order) => order.assignment?.status === "completed"
    ).length;


    const earningsPerDelivery = 7;
    const earningsToday = totalToday * earningsPerDelivery;

    //Prozess starten
    async function startTourProcess() {
        const res = await fetch(
            "http://localhost:8080/engine-rest/process-definition/key/Process_0h5mosh/start",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({}),
            }
        );

        const text = await res.text(); // 👈 wichtig zum Debuggen

        if (!res.ok) {
            console.error("Camunda Error Response:", text);
            throw new Error(text);
        }

        return JSON.parse(text);
    }

    const [startingTour, setStartingTour] = useState(false);

    return (
        <>
            <div className="restocker-page">
                <div className="restocker-inner">

                    <button
                        className="tour-btn"
                        disabled={startingTour}
                        onClick={async () => {
                            try {
                                setStartingTour(true);
                                await startTourProcess();
                                navigate("/restocker-deliveries");
                            } catch (err) {
                                console.error(err);
                                alert("Fehler beim Start der Tour");
                            } finally {
                                setStartingTour(false);
                            }
                        }}
                    >
                        {startingTour ? "Tour startet..." : "Tour von heute beginnen"}
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
                                <div className="metric-value">{completedToday}</div>
                                <div className="metric-sub">von {totalToday} Lieferungen</div>
                            </div>

                            <div className="metric-tile">
                                <div className="metric-label">Heutiger Verdienst</div>
                                <div className="metric-value">{earningsToday} €</div>
                                <div className="metric-sub">7€ pro Lieferung</div>
                            </div>

                        </div>

                        <button
                            className="tour-btn"
                            onClick={() => navigate("/restocker-my-orders")}
                        >
                            Alle heutigen Lieferungen anzeigen
                        </button>
                    </div>

                    {/* Offene Aufträge */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <h4>Verfügbare Aufträge</h4>
                                <h2>Offene Lieferungen in deiner Nähe</h2>
                            </div>
                        </div>

                        {openLoading ? (
                            <p>Lade offene Aufträge...</p>
                        ) : openError ? (
                            <p style={{ color: "red" }}>{openError}</p>
                        ) : (
                            <>
                                <p>Es gibt weitere Lieferungen in deiner Nähe. Beispielsweise:</p>
                                <div className="open-orders-carousel">
                                    {openOrders.slice(0, 6).map((order) => (
                                        <RestockerOrderCard
                                            key={order.orderKey}
                                            order={order}
                                            customer={customerProfiles[order.customerId]}
                                        />
                                    ))}
                                </div>
                            </>
                        )}

                        <button
                            className="tour-btn"
                            onClick={() => navigate("/restocker-orders")}
                        >
                            Alle offenen Lieferungen anzeigen
                        </button>
                    </div>

                    {/* Meine Aufträge */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <h4>Deine Aufträge</h4>
                                <h2>Deine Übersicht</h2>
                            </div>
                        </div>

                        {assignedLoading ? (
                            <p>Lade deine Aufträge...</p>
                        ) : assignedError ? (
                            <p style={{ color: "red" }}>{assignedError}</p>
                        ) : assignedOrdersResult.orders.length === 0 ? (
                            <p>Du hast aktuell keine zugeordneten Aufträge.</p>
                        ) : (
                            <>
                                <p>Du hast aktuell {assignedOrdersResult.orders.length} zugeordnete Aufträge.</p>
                                <div className="open-orders-carousel">
                                    {assignedOrdersResult.orders.slice(0, 6).map((order) => (
                                        <RestockerOrderCard
                                            key={order.orderKey}
                                            order={order}
                                            customer={customerProfiles[order.customerId]}
                                        />
                                    ))}
                                </div>
                            </>
                        )}

                        <button
                            className="tour-btn"
                            onClick={() => navigate("/restocker-my-orders")}
                        >
                            Alle dir zugeordneten Aufträge anzeigen
                        </button>
                    </div>

                    <RestockerStatisticsCard
                        assignedLoading={assignedLoading}
                        assignedError={assignedError}
                        assignedOrdersResult={assignedOrdersResult}
                    />


                </div>
            </div >
        </>
    );
}
