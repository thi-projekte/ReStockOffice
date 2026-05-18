import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FaBoxOpen,
  FaCheck,
  FaMapMarkedAlt,
  FaPhoneAlt,
  FaRoute,
  FaTruck,
} from "react-icons/fa";
import { useAuth } from "../../auth/AuthProvider";
import {
  collectDelivery,
  confirmDelivery,
  endTour,
  loadTodayTours,
  loadTourDetails,
  markDeliveryItemDelivered,
  startTour,
  syncTodayOrders,
  type DeliveryDetail,
  type Tour,
} from "../../services/deliveries";
import "../../styles/restocker-deliveries.css";

const EARNINGS_PER_STOP = 11.425;

function formatDate(value: string | null) {
  if (!value) return "Heute";

  return new Intl.DateTimeFormat("de-DE").format(new Date(value));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function sortDeliveries(deliveries: DeliveryDetail[]) {
  return [...deliveries].sort((a, b) => a.stopOrder - b.stopOrder);
}

export function DeliveryPage() {
  const auth = useAuth();
  const [tour, setTour] = useState<Tour | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryDetail[]>([]);
  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDoneDialog, setShowDoneDialog] = useState(false);

  const restockerName = auth.user?.username ?? auth.user?.id ?? "";
  const sortedDeliveries = useMemo(() => sortDeliveries(deliveries), [deliveries]);
  const activeDelivery = sortedDeliveries[activeStopIndex] ?? sortedDeliveries[0];
  const allCollected = sortedDeliveries.length > 0 && sortedDeliveries.every((delivery) => delivery.collected);
  const completedStops = sortedDeliveries.filter((delivery) => delivery.deliveredAt).length;
  const calculatedEarnings = Number((sortedDeliveries.length * EARNINGS_PER_STOP).toFixed(2));
  const isTourStarted = Boolean(tour?.startTime);
  const isTourFinished = Boolean(tour?.endTime);
  const phase = !isTourStarted ? "warehouse" : isTourFinished ? "finished" : "route";
  const currentItemsReady =
    activeDelivery?.items.length > 0 &&
    activeDelivery.items.every((item) => item.delivered);
  const isLastStop = activeStopIndex >= sortedDeliveries.length - 1;

  async function reloadDeliveries(nextTour = tour) {
    if (!nextTour) return;

    const details = await loadTourDetails({
      tourId: nextTour.id,
      token: auth.token,
    });
    const sorted = sortDeliveries(details);

    setDeliveries(sorted);
    const nextOpenIndex = sorted.findIndex((delivery) => !delivery.deliveredAt);
    setActiveStopIndex(nextOpenIndex >= 0 ? nextOpenIndex : Math.max(sorted.length - 1, 0));
  }

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!auth.token || !restockerName) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        await syncTodayOrders({
          restockerName,
          token: auth.token,
        });

        const tours = await loadTodayTours({
          restockerName,
          token: auth.token,
        });
        const todaysTour =
          tours.find((candidate) => !candidate.endTime) ?? tours[0] ?? null;

        if (!isMounted) return;

        setTour(todaysTour);

        if (todaysTour) {
          const details = await loadTourDetails({
            tourId: todaysTour.id,
            token: auth.token,
          });
          if (!isMounted) return;
          setDeliveries(sortDeliveries(details));
        } else {
          setDeliveries([]);
        }
      } catch (loadError) {
        if (!isMounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Lieferungen konnten nicht geladen werden.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [auth.token, restockerName]);

  async function handleCollect(delivery: DeliveryDetail) {
    if (delivery.collected || isBusy) return;

    setIsBusy(true);
    try {
      await collectDelivery({ deliveryId: delivery.id, token: auth.token });
      setDeliveries((current) =>
        current.map((item) =>
          item.id === delivery.id
            ? { ...item, collected: true, collectedAt: new Date().toISOString() }
            : item,
        ),
      );
      toast.success("Paket wurde eingesammelt.");
    } catch (collectError) {
      toast.error(
        collectError instanceof Error
          ? collectError.message
          : "Paket konnte nicht eingesammelt werden.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleStartTour() {
    if (!tour || !allCollected || isBusy) return;

    setIsBusy(true);
    try {
      const updatedTour = await startTour({ tourId: tour.id, token: auth.token });
      setTour(updatedTour);
      await reloadDeliveries(updatedTour);
      toast.success("Tour wurde gestartet.");
    } catch (startError) {
      toast.error(
        startError instanceof Error
          ? startError.message
          : "Tour konnte nicht gestartet werden.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleMarkItem(deliveryId: string, itemId: string) {
    if (isBusy) return;

    setIsBusy(true);
    try {
      await markDeliveryItemDelivered({ deliveryId, itemId, token: auth.token });
      setDeliveries((current) =>
        current.map((delivery) =>
          delivery.id === deliveryId
            ? {
                ...delivery,
                items: delivery.items.map((item) =>
                  item.id === itemId ? { ...item, delivered: true } : item,
                ),
              }
            : delivery,
        ),
      );
    } catch (itemError) {
      toast.error(
        itemError instanceof Error
          ? itemError.message
          : "Artikel konnte nicht abgehakt werden.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAdvance() {
    if (!tour || !activeDelivery || !currentItemsReady || isBusy) return;

    setIsBusy(true);
    try {
      await confirmDelivery({ deliveryId: activeDelivery.id, token: auth.token });

      const deliveredAt = new Date().toISOString();
      setDeliveries((current) =>
        current.map((delivery) =>
          delivery.id === activeDelivery.id ? { ...delivery, deliveredAt } : delivery,
        ),
      );

      if (isLastStop) {
        const finishedTour = await endTour({
          tourId: tour.id,
          earnings: calculatedEarnings,
          token: auth.token,
        });
        setTour(finishedTour);
        setShowDoneDialog(true);
        toast.success("Tour wurde beendet.");
      } else {
        setActiveStopIndex((current) => current + 1);
        toast.success("Zustellung wurde bestaetigt.");
      }
    } catch (advanceError) {
      toast.error(
        advanceError instanceof Error
          ? advanceError.message
          : "Zustellung konnte nicht bestaetigt werden.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  if (isLoading) {
    return (
      <section className="page-card restocker-delivery-page">
        <span className="eyebrow">Aktuelle Tour</span>
        <h1>Auslieferungen werden geladen</h1>
        <p className="muted-text">Die heutigen Lieferstopps werden vorbereitet.</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-card restocker-delivery-page">
        <span className="eyebrow">Aktuelle Tour</span>
        <h1>Lieferungen nicht verfuegbar</h1>
        <p className="error-box">{error}</p>
      </section>
    );
  }

  if (!tour) {
    return (
      <section className="page-card restocker-delivery-page">
        <span className="eyebrow">Aktuelle Tour</span>
        <h1>Heute ist keine Tour geplant</h1>
        <p className="muted-text">Sobald dir Lieferungen zugeteilt werden, erscheinen sie hier.</p>
      </section>
    );
  }

  return (
    <section className="page-card restocker-delivery-page">
      {phase === "warehouse" ? (
        <div className="delivery-flow">
          <div className="delivery-flow__head">
            <div>
              <span className="eyebrow">Lager-Dashboard</span>
              <h1>Pakete einsammeln</h1>
              <p>Alle Pakete fuer deine heutige Tour im Lager bereitstellen.</p>
            </div>
            <div className="delivery-summary-pill">
              <FaBoxOpen />
              <span>{sortedDeliveries.filter((delivery) => delivery.collected).length} / {sortedDeliveries.length}</span>
            </div>
          </div>

          <div className="delivery-table delivery-table--warehouse">
            <div className="delivery-table__row delivery-table__row--head">
              <span>Eingesammelt</span>
              <span>Auftrag</span>
            </div>
            {sortedDeliveries.map((delivery) => (
              <div className="delivery-table__row" key={delivery.id}>
                <button
                  className={`delivery-check ${delivery.collected ? "active" : ""}`}
                  type="button"
                  onClick={() => void handleCollect(delivery)}
                  disabled={delivery.collected || isBusy}
                  aria-label={`Auftrag ${delivery.orderId} einsammeln`}
                  title="Paket einsammeln"
                >
                  {delivery.collected ? <FaCheck /> : null}
                </button>
                <span className={delivery.collected ? "delivery-line-muted" : ""}>#{delivery.orderId}</span>
              </div>
            ))}
          </div>

          <div className="delivery-action-row">
            <button
              className="button delivery-primary-action"
              type="button"
              disabled={!allCollected || isBusy}
              onClick={() => void handleStartTour()}
            >
              <FaTruck />
              Tour beginnen
            </button>
          </div>
        </div>
      ) : null}

      {phase !== "warehouse" && activeDelivery ? (
        <div className="delivery-flow">
          <div className="delivery-flow__head">
            <div>
              <span className="eyebrow">Aktuelle Tour</span>
              <h1>Zustellung laeuft</h1>
              <p>Naechster Stopp: {Math.min(activeStopIndex + 1, sortedDeliveries.length)} von {sortedDeliveries.length}</p>
            </div>
            <a
              className="button button--ghost delivery-map-link"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${activeDelivery.street}, ${activeDelivery.postalCode} ${activeDelivery.city}`,
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              <FaMapMarkedAlt />
              Navigation
            </a>
          </div>

          <div className="delivery-info-grid">
            <div className="delivery-info-card">
              <span>Unternehmen</span>
              <strong>{activeDelivery.companyName}</strong>
            </div>
            <div className="delivery-info-card">
              <span>Adresse</span>
              <strong>{activeDelivery.street}</strong>
              <small>{activeDelivery.postalCode} {activeDelivery.city}</small>
            </div>
            <div className="delivery-info-card">
              <span>Lieferzeit</span>
              <strong>{formatDate(activeDelivery.deliveryDate)}</strong>
              <small>11:00 Uhr</small>
            </div>
            <div className="delivery-info-card">
              <span>Ansprechpartner</span>
              <strong>{activeDelivery.contactPerson || "Vor Ort"}</strong>
              {activeDelivery.phoneNumber ? (
                <a href={`tel:${activeDelivery.phoneNumber}`}>
                  <FaPhoneAlt /> {activeDelivery.phoneNumber}
                </a>
              ) : null}
            </div>
          </div>

          {activeDelivery.deliveryHint ? (
            <p className="delivery-hint"><strong>Hinweis:</strong> {activeDelivery.deliveryHint}</p>
          ) : null}

          <div className="delivery-table delivery-table--items">
            <div className="delivery-table__row delivery-table__row--head">
              <span>Eingeraeumt</span>
              <span>Artikelnr</span>
              <span>Bezeichnung</span>
              <span>Menge</span>
            </div>
            {activeDelivery.items.map((item) => (
              <div className="delivery-table__row" key={item.id}>
                <button
                  className={`delivery-check ${item.delivered ? "active" : ""}`}
                  type="button"
                  onClick={() => void handleMarkItem(activeDelivery.id, item.id)}
                  disabled={item.delivered || isBusy || Boolean(activeDelivery.deliveredAt)}
                  aria-label={`${item.name} einraeumen`}
                  title="Artikel einraeumen"
                >
                  {item.delivered ? <FaCheck /> : null}
                </button>
                <span className={item.delivered ? "delivery-line-muted" : ""}>{item.articleNumber}</span>
                <span className={item.delivered ? "delivery-line-muted" : ""}>{item.name}</span>
                <span>{item.quantity} {item.unit}</span>
              </div>
            ))}
          </div>

          <div className="delivery-action-row">
            <button
              className="button delivery-primary-action"
              type="button"
              disabled={!currentItemsReady || isBusy || Boolean(activeDelivery.deliveredAt)}
              onClick={() => void handleAdvance()}
            >
              {isLastStop ? <FaRoute /> : <FaTruck />}
              {isLastStop ? "Tour beenden" : "Naechste Zustellung"}
            </button>
          </div>
        </div>
      ) : null}

      {showDoneDialog || isTourFinished ? (
        <div className="delivery-complete-overlay" role="presentation">
          <div className="delivery-complete-modal" role="dialog" aria-modal="true" aria-labelledby="delivery-complete-title">
            <h2 id="delivery-complete-title">Alle Lieferungen erledigt</h2>
            <p>Starke Leistung. Du hast alle Auftraege fuer heute erfolgreich zugestellt.</p>
            <div className="delivery-complete-stats">
              <span>Abgeschlossene Stopps: {completedStops || sortedDeliveries.length} von {sortedDeliveries.length}</span>
              <span>Gesammelte Verguetung: {formatMoney(tour.earnings || calculatedEarnings)}</span>
              <span>Status: Tour beendet</span>
            </div>
            <button
              className="button"
              type="button"
              onClick={() => setShowDoneDialog(false)}
            >
              Zurueck zum Dashboard
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
