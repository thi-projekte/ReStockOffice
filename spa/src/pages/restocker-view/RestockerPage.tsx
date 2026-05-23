import "../../styles/restocker-home.css";
import { useEffect, useRef, useState } from "react";
import { loadOpenRestockOrders } from "../../services/orders";
import { useAuth } from "../../auth/AuthProvider";
import type { RestockMarketplaceOrder } from "../../types/shop";
import { loadAssignedRestockOrders } from "../../services/orders";
import type { RestockMarketplaceLoadResult } from "../../types/shop";
import { getDaysUntilDelivery } from "./restockerOrderUi";
import { useNavigate } from "react-router-dom";
import { RestockerOrderCard } from "../../components/restocker/RestockerOrderCardDashboard";
import { RestockerStatisticsCard } from "../../components/restocker/RestockerStatisticsCard";

const CAMUNDA_BASE_URL = "https://pe.restockoffice.de/engine-rest";
const RESTOCKER_TOUR_PROCESS_DEFINITION_KEY = "Process_0h5mosh";

interface CamundaProcessInstance {
    id: string;
}

function currentTourProcessStorageKey(restockerId: string) {
    const date = new Date();
    const today = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");

    return `restocker-tour-process:${restockerId}:${today}`;
}

function loadStoredTourProcessId(restockerId?: string) {
    if (!restockerId) {
        return null;
    }

    return sessionStorage.getItem(currentTourProcessStorageKey(restockerId));
}

function storeTourProcessId(restockerId: string, processInstanceId: string) {
    sessionStorage.setItem(
        currentTourProcessStorageKey(restockerId),
        processInstanceId,
    );
}

export function RestockerPage() {
    const auth = useAuth();

    const navigate = useNavigate();

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

    const assignedToday = assignedOrdersResult.orders.filter(
        (order) => getDaysUntilDelivery(order.deliveryDate) === 0
    );
    const totalToday = assignedToday.length;

    const completedToday = assignedToday.filter(
        (order) => order.assignment?.status === "completed"
    ).length;
    const openAssignedToday = assignedToday.filter(
        (order) =>
            Boolean(order.assignment && order.assignment.status !== "completed")
    );
    const openAssignedTodayCount = openAssignedToday.length;
    const hasOpenAssignedToday = openAssignedTodayCount > 0;


    const earningsPerDelivery = 7;
    const earningsToday = totalToday * earningsPerDelivery;

    async function loadActiveTourProcess(restockerId: string) {
        const query = new URLSearchParams({
            processDefinitionKey: RESTOCKER_TOUR_PROCESS_DEFINITION_KEY,
            businessKey: restockerId,
            active: "true",
        });
        const res = await fetch(`${CAMUNDA_BASE_URL}/process-instance?${query.toString()}`);

        if (!res.ok) {
            throw new Error(`Aktiver Tour-Prozess konnte nicht geladen werden: ${res.status}`);
        }

        const processInstances = (await res.json()) as CamundaProcessInstance[];
        return processInstances[0]?.id ?? null;
    }

    async function startTourProcessThroughEngineRest(
        restockerId: string,
        todayDeliveryCount: number,
    ) {
        const activeProcessId = await loadActiveTourProcess(restockerId);

        if (activeProcessId) {
            await updateTourProcessVariables(activeProcessId, todayDeliveryCount);

            return activeProcessId;
        }

        const res = await fetch(
            `${CAMUNDA_BASE_URL}/process-definition/key/${RESTOCKER_TOUR_PROCESS_DEFINITION_KEY}/start`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    businessKey: restockerId,
                    variables: {
                        restockerId: {
                            value: restockerId,
                            type: "String",
                        },
                        todayDeliveryCount: {
                            value: todayDeliveryCount,
                            type: "Integer",
                        },
                    },
                }),
            },
        );

        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || `Tour-Prozess konnte nicht gestartet werden: ${res.status}`);
        }

        const processInstance = (await res.json()) as CamundaProcessInstance;

        if (!processInstance.id) {
            throw new Error("Camunda hat keine Prozessinstanz-ID geliefert.");
        }

        return processInstance.id;
    }

    async function updateTourProcessVariables(
        processInstanceId: string,
        todayDeliveryCount: number,
    ) {
        const res = await fetch(
            `${CAMUNDA_BASE_URL}/process-instance/${processInstanceId}/variables`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    modifications: {
                        todayDeliveryCount: {
                            value: todayDeliveryCount,
                            type: "Integer",
                        },
                    },
                    deletions: [],
                }),
            },
        );

        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || `Tour-Prozessvariablen konnten nicht aktualisiert werden: ${res.status}`);
        }
    }

    async function startTourProcess(
        restockerId: string,
        todayDeliveryCount: number,
    ) {
        return startTourProcessThroughEngineRest(
            restockerId,
            todayDeliveryCount,
        );
    }

    const startTourRequestInFlight = useRef(false);
    const [startingTour, setStartingTour] = useState(false);
    const [tourProcessId, setTourProcessId] = useState<string | null>(() =>
        loadStoredTourProcessId(auth.user?.id),
    );

    useEffect(() => {
        setTourProcessId(loadStoredTourProcessId(auth.user?.id));
    }, [auth.user?.id]);

    const startTourButtonLabel = startingTour
        ? "Tour startet..."
        : assignedLoading
            ? "Lieferungen werden geladen..."
            : !hasOpenAssignedToday
                ? "Keine offenen Lieferungen heute"
                : tourProcessId
                    ? "Zur laufenden Tour wechseln"
                    : "Tour von heute beginnen";

    async function handleStartTourProcess() {
        if (startTourRequestInFlight.current) {
            return;
        }

        if (!hasOpenAssignedToday) {
            return;
        }

        try {
            startTourRequestInFlight.current = true;
            setStartingTour(true);

            if (!auth.user?.id) {
                throw new Error("Eingeloggter Restocker konnte nicht ermittelt werden.");
            }

            const processInstanceId = await startTourProcess(
                auth.user.id,
                openAssignedTodayCount,
            );

            if (tourProcessId !== processInstanceId) {
                storeTourProcessId(auth.user.id, processInstanceId);
                setTourProcessId(processInstanceId);
            }

            const query = new URLSearchParams({ processInstanceId });
            navigate(`/restocker-deliveries?${query.toString()}`);
        } catch (err) {
            console.error(err);
            alert("Fehler beim Start der Tour");
        } finally {
            startTourRequestInFlight.current = false;
            setStartingTour(false);
        }
    }

    return (
        <>
            <div className="restocker-page">
                <div className="restocker-inner">

                    <button
                        className="tour-btn"
                        disabled={startingTour || assignedLoading || !hasOpenAssignedToday}
                        onClick={() => void handleStartTourProcess()}
                    >
                        {startTourButtonLabel}
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
                                <p>Es gibt weitere Lieferungen in deiner Nähe. </p>
                                <p className="mobile-swipe-hint">Swipe um mehr zu sehen:</p>
                                <div className="open-orders-carousel">
                                    {openOrders.slice(0, 6).map((order) => (
                                        <RestockerOrderCard
                                            key={order.orderKey}
                                            order={order}
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
                                <p className="mobile-swipe-hint">Swipe um mehr zu sehen:</p>
                                <div className="open-orders-carousel">
                                    {assignedOrdersResult.orders.slice(0, 6).map((order) => (
                                        <RestockerOrderCard
                                            key={order.orderKey}
                                            order={order}
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
