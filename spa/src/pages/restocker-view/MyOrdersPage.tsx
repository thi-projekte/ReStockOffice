import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { FaFilter, FaSearch, FaTruck } from "react-icons/fa";
import { RestockerOrderCard } from "../../components/restocker/RestockerOrderCard";
import { RestockerOrderDetailDialog } from "../../components/restocker/RestockerOrderDetailDialog";
import { useAuth } from "../../auth/AuthProvider";
import { loadAssignedRestockOrders } from "../../services/orders";
import type {
  RestockMarketplaceLoadResult,
  RestockMarketplaceOrder,
} from "../../types/shop";
import {
  type DeliveryWindowOption,
  type RelativeDayOption,
  type SortOption,
  formatAcceptedAtDate,
  formatDeliveryWindowOption,
  getDaysUntilDelivery,
  getDeliveryWindowKey,
  matchesRelativeDayFilter,
  sortOrders,
} from "./restockerOrderUi";

function getGreetingName(user: ReturnType<typeof useAuth>["user"]) {
  const preferredName =
    user?.firstName ??
    user?.username ??
    user?.email?.split("@")[0];

  return preferredName?.trim() || "Restocker";
}

export function MyOrdersPage() {
  const auth = useAuth();
  const restockerName = auth.user?.username ?? auth.user?.id ?? "";
  const [assignedOrdersResult, setAssignedOrdersResult] =
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
  const [selectedRelativeDay, setSelectedRelativeDay] = useState<"" | RelativeDayOption>("");
  const [sortOption, setSortOption] = useState<SortOption>("delivery-asc");
  const [selectedOrder, setSelectedOrder] = useState<RestockMarketplaceOrder | null>(null);

  useEffect(() => {
    let ignoreResult = false;

    async function loadOrders() {
      if (!auth.token || !auth.user?.id) {
        if (!ignoreResult) {
          setAssignedOrdersResult({
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
        const loadedOrders = await loadAssignedRestockOrders({
          token: auth.token,
          restockerId: auth.user.id,
          restockerName,
        });

        if (!ignoreResult) {
          setAssignedOrdersResult(loadedOrders);
        }
      } catch (loadError) {
        if (!ignoreResult) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Deine angenommenen Aufträge konnten nicht geladen werden.",
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
  }, [auth.token, auth.user?.id, restockerName]);

  const availableCities = useMemo(
    () =>
      Array.from(new Set(assignedOrdersResult.orders.map((order) => order.city))).sort(
        (firstCity, secondCity) => firstCity.localeCompare(secondCity, "de"),
      ),
    [assignedOrdersResult.orders],
  );

  const availableDeliveryWindows = useMemo(
    () =>
      Array.from(
        new Set(
          assignedOrdersResult.orders
            .map((order) => getDeliveryWindowKey(order.deliveryDate))
            .filter(
              (windowKey): windowKey is DeliveryWindowOption => windowKey !== null,
            ),
        ),
      ).sort((firstWindow, secondWindow) => firstWindow.localeCompare(secondWindow, "de")),
    [assignedOrdersResult.orders],
  );

  const filteredOrders = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const visibleOrders = assignedOrdersResult.orders.filter((order) => {
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
      const matchesRelativeDay = matchesRelativeDayFilter(
        order.deliveryDate,
        selectedRelativeDay,
      );

      return matchesQuery && matchesCity && matchesDeliveryWindow && matchesRelativeDay;
    });

    return sortOrders(visibleOrders, sortOption);
  }, [
    assignedOrdersResult.orders,
    searchQuery,
    selectedCity,
    selectedDeliveryWindow,
    selectedRelativeDay,
    sortOption,
  ]);

  const greetingName = getGreetingName(auth.user);
  const dueTodayCount = filteredOrders.filter(
    (order) => getDaysUntilDelivery(order.deliveryDate) === 0,
  ).length;
  const dueTomorrowCount = filteredOrders.filter(
    (order) => getDaysUntilDelivery(order.deliveryDate) === 1,
  ).length;
  const priorityFilterOptions: Array<{
    value: "" | RelativeDayOption;
    label: string;
    eyebrow: string;
    count: number;
  }> = [
    {
      value: "",
      label: "Alle",
      eyebrow: "Gesamter Überblick",
      count: assignedOrdersResult.orders.length,
    },
    {
      value: "today",
      label: "Heute",
      eyebrow: "Priorität heute",
      count: assignedOrdersResult.orders.filter(
        (order) => getDaysUntilDelivery(order.deliveryDate) === 0,
      ).length,
    },
    {
      value: "tomorrow",
      label: "Morgen",
      eyebrow: "Priorität morgen",
      count: assignedOrdersResult.orders.filter(
        (order) => getDaysUntilDelivery(order.deliveryDate) === 1,
      ).length,
    },
  ];

  if (!auth.isInitializing && !auth.hasRole("Restocker")) {
    return <Navigate to="/" replace />;
  }

  if (auth.isInitializing || isLoading) {
    return <section className="page-card">Deine Aufträge werden geladen...</section>;
  }

  return (
    <div className="home-showcase restocker-marketplace-page">
      <section className="hero-card home-hero restocker-marketplace-hero restocker-marketplace-hero--orders">
        <div className="home-hero__top">
          <span className="eyebrow">Restocker</span>
        </div>

        <div className="hero-copy">
          <h1>MEINE AUFTRÄGE</h1>
          <p className="section-copy">
            Hallo {greetingName}, hier sind deine Aufträge für die nächsten 4 Wochen.
          </p>

          <div className="dashboard-strip" aria-label="Meine Aufträge Übersicht">
            <article className="dashboard-stat">
              <span className="dashboard-stat__label">Angenommene Aufträge</span>
              <strong>{filteredOrders.length}</strong>
            </article>

            <article className="dashboard-stat">
              <span className="dashboard-stat__label">Heute / Morgen</span>
              <strong>
                {dueTodayCount} / {dueTomorrowCount}
              </strong>
            </article>
          </div>
        </div>
      </section>

      <section className="page-card section-space">
        <div className="section-head">
          <div>
            <span className="eyebrow">Meine Aufträge</span>
            <h2>Deine Übersicht</h2>
            <p className="section-copy">
              Diese Ansicht zeigt nur Aufträge, die du bereits angenommen hast
              und die noch nicht als abgeschlossen markiert sind.
            </p>
          </div>
        </div>

        {assignedOrdersResult.source === "demo" ? (
          <div className="mock-box">
            <strong>Demo-Daten aktiv</strong>
            <span>
              Die Orders-API war nicht erreichbar. Deine angenommenen Aufträge
              werden deshalb aktuell mit klar gekennzeichneten Demo-Daten gerendert.
            </span>
          </div>
        ) : null}

        {assignedOrdersResult.hasPlaceholderCustomerData ? (
          <div className="mock-box">
            <strong>Unvollständige Delivery-Service-Daten</strong>
            <span>
              Verfügbare Firmen-, Adress- und Lieferhinweise werden aus dem
              Delivery Service angereichert. Felder, die dort aktuell noch
              fehlen, zeigen wir sichtbar als "Fehlt noch" an.
            </span>
          </div>
        ) : null}

        {error ? <div className="error-box">{error}</div> : null}

        <div className="restocker-marketplace-toolbar">
          <label className="restocker-marketplace-search" htmlFor="restocker-my-orders-search">
            <FaSearch aria-hidden="true" />
            <input
              id="restocker-my-orders-search"
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

        <div className="restocker-priority-filters" aria-label="Schnellfilter für Auslieferungen">
          {priorityFilterOptions.map((filterOption) => {
            const isActive = selectedRelativeDay === filterOption.value;

            return (
              <button
                key={filterOption.value || "all"}
                className={`restocker-priority-filter ${isActive ? "is-active" : ""}`.trim()}
                type="button"
                onClick={() => setSelectedRelativeDay(filterOption.value)}
              >
                <span className="restocker-priority-filter__eyebrow">
                  {filterOption.eyebrow}
                </span>
                <strong>{filterOption.label}</strong>
                <small>{filterOption.count} Aufträge</small>
              </button>
            );
          })}
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
                <option value="delivery-asc">Frühester Liefertermin</option>
                <option value="delivery-desc">Spätester Liefertermin</option>
                <option value="company-asc">Unternehmen (A-Z)</option>
              </select>
            </label>
          </div>
        ) : null}

        {filteredOrders.length === 0 ? (
          <div className="restocker-empty-state restocker-empty-state--assigned">
            <FaTruck aria-hidden="true" />
            <div>
              <strong>Du hast aktuell keine Aufträge angenommen.</strong>
              <p className="muted-text">
                Sobald du im Marktplatz einen Auftrag übernimmst, erscheint er hier
                in deiner persönlichen Übersicht.
              </p>
            </div>
          </div>
        ) : (
          <div className="restocker-order-grid">
            {filteredOrders.map((order) => (
              <RestockerOrderCard
                key={order.orderKey}
                order={order}
                detailLabel="Details ansehen"
                onClick={() => setSelectedOrder(order)}
              />
            ))}
          </div>
        )}
      </section>

      {selectedOrder ? (
        <RestockerOrderDetailDialog
          order={selectedOrder}
          backLabel="Zurück zu deinen Aufträgen"
          onClose={() => setSelectedOrder(null)}
          actions={
            <button
              className="button button--ghost"
              type="button"
              onClick={() => setSelectedOrder(null)}
            >
              Zurück zur Übersicht
            </button>
          }
          infoRows={
            <div className="restocker-order-dialog__info-row">
              <span className="restocker-order-dialog__info-label">Angenommen am</span>
              <span className="restocker-order-dialog__info-value restocker-order-dialog__info-value--plain">
                {formatAcceptedAtDate(selectedOrder.assignment?.acceptedAt)}
              </span>
            </div>
          }
        />
      ) : null}
    </div>
  );
}
