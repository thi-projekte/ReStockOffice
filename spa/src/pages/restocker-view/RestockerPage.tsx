// Restocker-Startseite: 
// - Starten der heutigen Tour (Prozessstart im Hintergrund und Weiterleitung zu DeliveryPage)
// - Anzeige der Kennzahlen für heutige Lieferungen (Anzahl, Verdienst)
// - Anzeige offene Lieferungen
// - Anzeige Restocker zugeordnete Lieferungen
// - Anzeige der monatlichen Kennzahlen des Restockers (geplant / erledigte Lieferungen, Verdienst, Artikel etc.)

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { acceptRestockOrder, loadAssignedRestockOrders, loadOpenRestockOrders } from "../../services/orders";
import { useAuth } from "../../auth/AuthProvider";
import type { RestockMarketplaceOrder, RestockMarketplaceLoadResult } from "../../types/shop";
import { getDaysUntilDelivery, formatDeliveryWindow } from "./restockerOrderUi";
import { useNavigate } from "react-router-dom";
import { RestockerOrderCard } from "../../components/restocker/RestockerOrderCardDashboard";
import { RestockerStatisticsCard } from "../../components/restocker/RestockerStatisticsCard";
import { RestockerOrderDetailDialog } from "../../components/restocker/RestockerOrderDetailDialog";

const RESTOCKER_TOUR_PROCESS_API_URL =
    import.meta.env.VITE_RESTOCKER_TOUR_PROCESS_API_URL ??
    "https://pe.restockoffice.de/api/restocker-tour-process";

// Interface, um zu prüfen, ob bereits ein Prozess läuft
interface RestockerTourProcessResponse {
    id: string;
    started: boolean;
}

// Erzeugen einer Restocker Tour Prozess Id
function currentTourProcessStorageKey(restockerId: string) {
    const date = new Date();
    const today = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");

    return `restocker-tour-process:${restockerId}:${today}`;
}

//Auslesen der Stored Tour Prozess Id
function loadStoredTourProcessId(restockerId?: string) {
    if (!restockerId) {
        return null;
    }

    return sessionStorage.getItem(currentTourProcessStorageKey(restockerId));
}

// Abspeichern der Tour Prozess ID
function storeTourProcessId(restockerId: string, processInstanceId: string) {
    sessionStorage.setItem(
        currentTourProcessStorageKey(restockerId),
        processInstanceId,
    );
}

// Startet den BPMN-Tourprozess über die Process-Engine-API-Wrapper -> siehe Button Tour starten
async function startTourProcess(
    restockerId: string,
    todayDeliveryCount: number,
) {
    const res = await fetch(`${RESTOCKER_TOUR_PROCESS_API_URL}/start`, {
        method: "POST",
        body: new URLSearchParams({
            restockerId,
            todayDeliveryCount: String(todayDeliveryCount),
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Tour-Prozess konnte nicht gestartet werden: ${res.status}`);
    }

    const processInstance = (await res.json()) as RestockerTourProcessResponse;

    if (!processInstance.id) {
        throw new Error("Die Process-Engine hat keine Prozessinstanz-ID geliefert.");
    }

    return processInstance.id;
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
    const [selectedOrder, setSelectedOrder] = useState<RestockMarketplaceOrder | null>(null);
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);



    // Lädt verfügbare Marktplatz-Aufträge, die der Restocker noch annehmen kann
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

    // Lädt Aufträge, die diesem Restocker bereits zugeordnet sind
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

    //Filterung der Aufträge des Restockers nach heutigen Lieferungen
    const assignedToday = assignedOrdersResult.orders.filter(
        (order) => getDaysUntilDelivery(order.deliveryDate) === 0
    );
    const totalToday = assignedToday.length;

    //Anzahl der heutigen Lieferungen des Restockers, welche bereits completed sind
    const completedToday = assignedToday.filter(
        (order) => order.assignment?.status === "completed"
    ).length;
    const openAssignedToday = assignedToday.filter(
        (order) =>
            Boolean(order.assignment && order.assignment.status !== "completed")
    );
    const openAssignedOrders = assignedOrdersResult.orders.filter(
        (order) =>
            Boolean(order.assignment && order.assignment.status !== "completed")
    );
    const openAssignedTodayCount = openAssignedToday.length;
    const hasOpenAssignedToday = openAssignedTodayCount > 0;


    const earningsPerDelivery = 7;
    const earningsToday = totalToday * earningsPerDelivery;

    const startTourRequestInFlight = useRef(false);
    const [startingTour, setStartingTour] = useState(false);
    const [tourProcessId, setTourProcessId] = useState<string | null>(() =>
        loadStoredTourProcessId(auth.user?.id),
    );

    // Setzen der gespeicherte Prozess-ID für den eingeloggten Restocker 
    useEffect(() => {
        setTourProcessId(loadStoredTourProcessId(auth.user?.id));
    }, [auth.user?.id]);

    //Anzeigen für den Button Tour starten -> Ändert sie je nach dem, ob der Prozess bereits gestartet wurde
    function getStartTourButtonLabel() {
        if (startingTour) {
            return "Tour startet...";
        }

        if (assignedLoading) {
            return "Lieferungen werden geladen...";
        }

        if (!hasOpenAssignedToday) {
            return "Keine offenen Lieferungen heute";
        }

        if (tourProcessId) {
            return "Zur laufenden Tour wechseln";
        }

        return "Tour von heute beginnen";
    }

    const startTourButtonLabel = getStartTourButtonLabel();

    async function handleStartTourProcess() {
        // Verhindert, dass ein Doppelklick zwei Prozess-Start-Requests sendet.
        if (startTourRequestInFlight.current) {
            return;
        }

        // Eine Tour ergibt nur Sinn, wenn es heute noch offene zugeordnete Lieferungen gibt.
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

            // Speichert die ID lokal, damit das Dashboard in dieser Browser-Sitzung
            // wieder zur laufenden Tour wechseln kann.
            if (tourProcessId !== processInstanceId) {
                storeTourProcessId(auth.user.id, processInstanceId);
                setTourProcessId(processInstanceId);
            }

            // Die DeliveryPage nutzt die processInstanceId, um BPMN-User-Tasks
            // abzuschließen. Die eigentlichen Lieferdaten kommen weiter vom Delivery-Service.
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

    async function handleAcceptOrder(orderToAccept: RestockMarketplaceOrder) {
        if (!auth.user?.id || !auth.token) {
            return;
        }

        try {
            await acceptRestockOrder({
                orderKey: orderToAccept.orderKey,
                restockerId: auth.user.id,
                restockerName: auth.user?.username ?? auth.user.id,
                token: auth.token,
            });

            // Verschiebt den angenommenen Auftrag direkt aus der Marktplatzliste
            // in die zugeordneten Aufträge, damit die UI sofort den neuen Zustand zeigt.
            setOpenOrders((currentOrders) =>
                currentOrders.filter((order) => order.orderKey !== orderToAccept.orderKey),
            );
            setAssignedOrdersResult((currentResult) => ({
                ...currentResult,
                orders: [
                    {
                        ...orderToAccept,
                        assignment: {
                            restockerId: auth.user!.id,
                            acceptedAt: new Date().toISOString(),
                            status: "accepted",
                        },
                    },
                    ...currentResult.orders,
                ],
            }));
            setIsConfirmDialogOpen(false);
            setSelectedOrder(null);
            toast.success(`Du hast Auftrag #${orderToAccept.orderId} erfolgreich übernommen.`);
        } catch (acceptError) {
            toast.error(
                acceptError instanceof Error
                    ? acceptError.message
                    : "Der Auftrag konnte nicht übernommen werden.",
            );
        }
    }

    function openAcceptConfirmation(orderToAccept: RestockMarketplaceOrder) {
        setSelectedOrder(orderToAccept);
        setIsConfirmDialogOpen(true);
    }

    function handleCloseDetailDialog() {
        setSelectedOrder(null);
        setIsConfirmDialogOpen(false);
    }

    function handleAcceptSelectedOrder() {
        if (!selectedOrder) {
            return;
        }

        void handleAcceptOrder(selectedOrder);
    }

    function renderOpenOrdersContent() {
        if (openLoading) {
            return <p>Lade offene Aufträge...</p>;
        }

        if (openError) {
            return <p style={{ color: "red" }}>{openError}</p>;
        }

        return (
            <>
                <p>Es gibt weitere Lieferungen in deiner Nähe. </p>
                <p className="mobile-swipe-hint">Swipe um mehr zu sehen:</p>
                {/*Karusell mit RestockOrderCard (sind in Components definiert)*/}
                <div className="open-orders-carousel">
                    {openOrders.slice(0, 6).map((order) => (
                        <RestockerOrderCard
                            key={order.orderKey}
                            order={order}
                            detailLabel="Auftrag ansehen"
                            onClick={() => setSelectedOrder(order)}
                            secondaryActionLabel="Fahrt annehmen"
                            onSecondaryAction={() => openAcceptConfirmation(order)}
                        />
                    ))}
                </div>
            </>
        );
    }

    function renderAssignedOrdersContent() {
        if (assignedLoading) {
            return <p>Lade deine Aufträge...</p>;
        }

        if (assignedError) {
            return <p style={{ color: "red" }}>{assignedError}</p>;
        }

        if (openAssignedOrders.length === 0) {
            return <p>Du hast aktuell keine offenen zugeordneten Aufträge.</p>;
        }

        return (
            <>
                <p>Du hast aktuell {openAssignedOrders.length} offene zugeordnete Aufträge.</p>
                <p className="mobile-swipe-hint">Swipe um mehr zu sehen:</p>
                <div className="open-orders-carousel">
                    {openAssignedOrders.slice(0, 6).map((order) => (
                        <RestockerOrderCard
                            key={order.orderKey}
                            order={order}
                            detailLabel="Auftrag ansehen"
                            onClick={() => setSelectedOrder(order)}
                        />
                    ))}
                </div>
            </>
        );
    }

    return (
        <div className="restocker-page">
            <div className="restocker-inner">

                {/*Tour starten Button*/}
                <button
                    className="tour-btn"
                    disabled={startingTour || assignedLoading || !hasOpenAssignedToday}
                    onClick={() => void handleStartTourProcess()}
                >
                    {startTourButtonLabel}
                </button>

                {/* Anzeige Kennzahlen für heutigen Lieferungen */}
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
                            <div className="metric-label">Geplanter Verdienst</div>
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

                {/* Anzeige offene Aufträge */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <h4>Verfügbare Aufträge</h4>
                            <h2>Offene Lieferungen in deiner Nähe</h2>
                        </div>
                    </div>

                    {renderOpenOrdersContent()}

                    <button
                        className="tour-btn"
                        onClick={() => navigate("/restocker-orders")}
                    >
                        Alle offenen Lieferungen anzeigen
                    </button>
                </div>

                {/*Anzeige aller Aufträge, welcher dem Restocker zugeordnet sind */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <h4>Deine Aufträge</h4>
                            <h2>Deine Übersicht</h2>
                        </div>
                    </div>

                    {renderAssignedOrdersContent()}
                    <button
                        className="tour-btn"
                        onClick={() => navigate("/restocker-my-orders")}
                    >
                        Alle dir zugeordneten Aufträge anzeigen
                    </button>
                </div>

                {/*RestockStatisticsCard (sind in Components definiert, um es wieder verwenden zu können)*/}
                <RestockerStatisticsCard
                    assignedLoading={assignedLoading}
                    assignedError={assignedError}
                    assignedOrdersResult={assignedOrdersResult}
                />

                {/*RestockerOrderDetailDialog (sind in Components definiert)*/}
                {selectedOrder && !isConfirmDialogOpen ? (
                    <RestockerOrderDetailDialog
                        order={selectedOrder}
                        backLabel="Zurück zur Übersicht"
                        onClose={handleCloseDetailDialog}
                        actions={
                            selectedOrder.assignment ? null : (
                                <button
                                    className="button"
                                    type="button"
                                    onClick={() => setIsConfirmDialogOpen(true)}
                                >
                                    Fahrt annehmen
                                </button>
                            )
                        }
                    />
                ) : null}

                {selectedOrder && isConfirmDialogOpen ? (
                    <>
                        <button
                            className="subscription-modal__overlay"
                            type="button"
                            aria-label="Bestätigungsdialog schließen"
                            onClick={() => setIsConfirmDialogOpen(false)}
                        />

                        <section
                            className="subscription-modal restocker-confirm-dialog"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="restocker-confirm-dialog-title"
                        >
                            <div className="subscription-modal__header">
                                <div>
                                    <span className="eyebrow">Bereit für deinen nächsten Einsatz?</span>
                                    <h2 id="restocker-confirm-dialog-title">Auftrag wirklich übernehmen?</h2>
                                </div>
                            </div>

                            <div className="subscription-modal__body restocker-confirm-dialog__body">
                                <p>
                                    Du bist dabei, die Lieferung für <strong>{selectedOrder.companyName}</strong>{" "}
                                    am <strong>{selectedOrder.deliveryDate}</strong> zu übernehmen.
                                </p>

                                <div className="restocker-confirm-dialog__facts">
                                    <div>
                                        <span>Ziel</span>
                                        <strong>
                                            {selectedOrder.addressLine1}, {selectedOrder.postalCode}{" "}
                                            {selectedOrder.city}
                                        </strong>
                                    </div>
                                    <div>
                                        <span>Lieferfenster</span>
                                        <strong>{formatDeliveryWindow(selectedOrder.deliveryTime)}</strong>
                                    </div>
                                    <div>
                                        <span>Artikel</span>
                                        <strong>{selectedOrder.articleCount}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="subscription-modal__actions">
                                <button
                                    className="button button--ghost"
                                    type="button"
                                    onClick={() => setIsConfirmDialogOpen(false)}
                                >
                                    Zurück zur Lieferung
                                </button>

                                <button className="button" type="button" onClick={handleAcceptSelectedOrder}>
                                    Ja, Fahrt annehmen
                                </button>
                            </div>
                        </section>
                    </>
                ) : null}


            </div>
        </div>
    );
}
