import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { FaFilter, FaSearch, FaTruckLoading } from "react-icons/fa";
import toast from "react-hot-toast";
import { RestockerOrderCard } from "../../components/restocker/RestockerOrderCard";
import { RestockerOrderDetailDialog } from "../../components/restocker/RestockerOrderDetailDialog";
import { useAuth } from "../../auth/AuthProvider";
import { acceptRestockOrder, loadOpenRestockOrders } from "../../services/orders";
import type {
  RestockMarketplaceLoadResult,
  RestockMarketplaceOrder,
} from "../../types/shop";
import {
  type DeliveryWindowOption,
  type SortOption,
  formatDeliveryWindow,
  formatDeliveryWindowOption,
  getDeliveryWindowKey,
  sortOrders,
} from "./restockerOrderUi";

export function OrderPage() {
  const auth = useAuth();
  const restockerName = auth.user?.username ?? auth.user?.id ?? "";
  const [marketplaceResult, setMarketplaceResult] =
    useState<RestockMarketplaceLoadResult>({
      orders: [],
      source: "live",
      hasPlaceholderCustomerData: false,
    });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedDeliveryWindow, setSelectedDeliveryWindow] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("delivery-asc");
  const [selectedOrder, setSelectedOrder] = useState<RestockMarketplaceOrder | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  useEffect(() => {
    let ignoreResult = false;

    async function loadOrders() {
      if (!auth.token) {
        if (!ignoreResult) {
          setMarketplaceResult({
            orders: [],
            source: "live",
            hasPlaceholderCustomerData: false,
          });
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const loadedOrders = await loadOpenRestockOrders({
          token: auth.token,
          restockerName,
        });

        if (!ignoreResult) {
          setMarketplaceResult(loadedOrders);
        }
      } catch (loadError) {
        if (!ignoreResult) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Die offenen Aufträge konnten nicht geladen werden.",
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      ignoreResult = true;
    };
  }, [auth.token, restockerName]);

  const availableCities = useMemo(
    () =>
      Array.from(new Set(marketplaceResult.orders.map((order) => order.city))).sort(
        (firstCity, secondCity) => firstCity.localeCompare(secondCity, "de"),
      ),
    [marketplaceResult.orders],
  );

  const availableDeliveryWindows = useMemo(
    () =>
      Array.from(
        new Set(
          marketplaceResult.orders
            .map((order) => getDeliveryWindowKey(order.deliveryDate))
            .filter(
              (windowKey): windowKey is DeliveryWindowOption => windowKey !== null,
            ),
        ),
      ).sort((firstWindow, secondWindow) => firstWindow.localeCompare(secondWindow, "de")),
    [marketplaceResult.orders],
  );

  const filteredOrders = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const visibleOrders = marketplaceResult.orders.filter((order) => {
      const matchesQuery =
        !normalizedQuery ||
        [order.companyName, order.city, order.addressLine1, order.orderId]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesCity = !selectedCity || order.city === selectedCity;
      const matchesDeliveryWindow =
        !selectedDeliveryWindow ||
        getDeliveryWindowKey(order.deliveryDate) === selectedDeliveryWindow;

      return matchesQuery && matchesCity && matchesDeliveryWindow;
    });

    return sortOrders(visibleOrders, sortOption);
  }, [marketplaceResult.orders, searchQuery, selectedCity, selectedDeliveryWindow, sortOption]);

  if (!auth.isInitializing && !auth.hasRole("Restocker")) {
    return <Navigate to="/" replace />;
  }

  if (auth.isInitializing || isLoading) {
    return <section className="page-card">Aufträge werden geladen...</section>;
  }

  function handleCloseDetailDialog() {
    setSelectedOrder(null);
    setIsConfirmDialogOpen(false);
  }

  function handleAcceptOrder(orderToAccept: RestockMarketplaceOrder) {
    if (!auth.user?.id) {
      return;
    }

    try {
      acceptRestockOrder({
        orderKey: orderToAccept.orderKey,
        restockerId: auth.user.id,
      });

      setMarketplaceResult((currentResult) => ({
        ...currentResult,
        orders: currentResult.orders.filter(
          (order) => order.orderKey !== orderToAccept.orderKey,
        ),
      }));
      setIsConfirmDialogOpen(false);
      setSelectedOrder(null);
      toast.success(
        `Auftrag #${orderToAccept.orderId} wurde deinem Restocker-Konto zugeordnet.`,
      );
    } catch (acceptError) {
      toast.error(
        acceptError instanceof Error
          ? acceptError.message
          : "Der Auftrag konnte nicht übernommen werden.",
      );
    }
  }

  function handleAcceptSelectedOrder() {
    if (!selectedOrder) {
      return;
    }

    handleAcceptOrder(selectedOrder);
  }

  return (
    <div className="home-showcase restocker-marketplace-page">
      <section className="hero-card home-hero restocker-marketplace-hero restocker-marketplace-hero--orders">
        <div className="home-hero__top">
          <span className="eyebrow">Restocker</span>
        </div>

        <div className="hero-copy">
          <h1>RESTOCKORDER - MARKTPLATZ</h1>
          <p>Alle verfügbaren Aufträge</p>

          <div className="dashboard-strip" aria-label="Marktplatz Übersicht">
            <article className="dashboard-stat">
              <span className="dashboard-stat__label">Offene Aufträge</span>
              <strong>{filteredOrders.length}</strong>
              <small>Fällig in den nächsten 4 Wochen</small>
            </article>

            <article className="dashboard-stat">
              <span className="dashboard-stat__label">Unternehmen</span>
              <strong>{new Set(filteredOrders.map((order) => order.companyName)).size}</strong>
              <small>Aktuell im Marktplatz verfügbar</small>
            </article>

          </div>
        </div>
      </section>

      <section className="page-card section-space">
        <div className="section-head">
          <div>
            <span className="eyebrow">Offene Aufträge</span>
            <h2>Alle verfügbaren Aufträge</h2>
            <p className="section-copy">
              Ein offener Lieferauftrag entsteht aus aktiven Bestellungen, deren
              nächster Liefertermin innerhalb der kommenden 4 Wochen liegt.
            </p>
          </div>
        </div>

        {marketplaceResult.source === "demo" ? (
          <div className="mock-box">
            <strong>Demo-Daten aktiv</strong>
            <span>
              Die Orders-API war nicht erreichbar. Deshalb wird der Marktplatz aktuell
              mit klar gekennzeichneten Demo-Aufträgen gerendert.
            </span>
          </div>
        ) : null}

        {marketplaceResult.hasPlaceholderCustomerData ? (
          <div className="mock-box">
            <strong>Unvollständige Delivery-Service-Daten</strong>
            <span>
              Verfügbare Firmen- und Adressdaten werden aus dem Delivery Service
              angereichert. Felder, die dort aktuell noch fehlen, zeigen wir
              sichtbar als "Fehlt noch" an.
            </span>
          </div>
        ) : null}

        <div className="mock-box">
          <strong>Dein Verdienst</strong>
          <span>
            {"Für jede erfolgreich abgeschlossene Unternehmenslieferung erhältst du 7 €."}
          </span>
        </div>

        {error ? <div className="error-box">{error}</div> : null}

        <div className="restocker-marketplace-toolbar">
          <label className="restocker-marketplace-search" htmlFor="restocker-marketplace-search">
            <FaSearch aria-hidden="true" />
            <input
              id="restocker-marketplace-search"
              type="search"
              placeholder="Nach Unternehmen suchen ..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>

          <button
            className={`button button--ghost restocker-filter-button ${isFilterOpen ? "active" : ""}`.trim()}
            type="button"
            onClick={() => setIsFilterOpen((currentState) => !currentState)}
          >
            <FaFilter />
            Filter
          </button>
        </div>

        {isFilterOpen ? (
          <div className="restocker-marketplace-filters">
            <label className="restocker-filter-field">
              <span>Lieferzeitraum</span>
              <select
                value={selectedDeliveryWindow}
                onChange={(event) => setSelectedDeliveryWindow(event.target.value)}
              >
                <option value="">Alle Zeiträume</option>
                {availableDeliveryWindows.map((deliveryWindow) => (
                  <option key={deliveryWindow} value={deliveryWindow}>
                    {formatDeliveryWindowOption(deliveryWindow)}
                  </option>
                ))}
              </select>
            </label>

            <label className="restocker-filter-field">
              <span>Stadt</span>
              <select
                value={selectedCity}
                onChange={(event) => setSelectedCity(event.target.value)}
              >
                <option value="">Alle Städte</option>
                {availableCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>

            <label className="restocker-filter-field">
              <span>Sortieren</span>
              <select
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value as SortOption)}
              >
                <option value="delivery-asc">Lieferdatum zuerst</option>
                <option value="company-asc">Unternehmen A-Z</option>
                <option value="articles-desc">Meiste Artikel zuerst</option>
              </select>
            </label>
          </div>
        ) : null}

        {filteredOrders.length === 0 ? (
          <div className="restocker-empty-state">
            <FaTruckLoading aria-hidden="true" />
            <div>
              <strong>Aktuell sind keine offenen Aufträge verfügbar.</strong>
              <p className="muted-text">
                Prüfe die Filter oder warte auf neue Liefertermine innerhalb des
                4-Wochen-Fensters.
              </p>
            </div>
          </div>
        ) : (
          <div className="restocker-order-grid">
            {filteredOrders.map((order) => (
              <RestockerOrderCard
                key={order.orderKey}
                order={order}
                detailLabel="Auftrag ansehen"
                onClick={() => setSelectedOrder(order)}
                secondaryActionLabel="Fahrt akzeptieren"
                onSecondaryAction={() => handleAcceptOrder(order)}
              />
            ))}
          </div>
        )}
      </section>

      {selectedOrder && !isConfirmDialogOpen ? (
        <RestockerOrderDetailDialog
          order={selectedOrder}
          backLabel="Zurück zu allen Aufträgen"
          onClose={handleCloseDetailDialog}
          actions={
            <>
              <button
                className="button button--ghost"
                type="button"
                onClick={handleCloseDetailDialog}
              >
                Abbrechen
              </button>

              <button
                className="button"
                type="button"
                onClick={() => setIsConfirmDialogOpen(true)}
              >
                Auftrag annehmen
              </button>
            </>
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

              <p className="muted-text">
                Sobald du bestätigst, taucht der Auftrag nicht mehr im Marktplatz auf.
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

              <p className="muted-text">
                Nach der Bestätigung wird der Auftrag deinem eingeloggten
                Restocker-Konto zugeordnet und nicht mehr im offenen Marktplatz
                angezeigt.
              </p>
            </div>

            <div className="subscription-modal__actions">
              <button
                className="button button--ghost"
                type="button"
                onClick={() => setIsConfirmDialogOpen(false)}
              >
                Abbrechen
              </button>

              <button className="button" type="button" onClick={handleAcceptSelectedOrder}>
                Ja, Auftrag annehmen
              </button>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
