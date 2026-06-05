import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  FaChevronDown,
  FaFilter,
  FaSearch,
  FaTruck,
} from "react-icons/fa";
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

interface Option<Value extends string> {
  value: Value;
  label: string;
}

interface DeliveryWindowDisplayOption {
  value: DeliveryWindowOption;
  labelTop: string;
  labelBottom: string;
}

const DELIVERY_WINDOW_OPTIONS: DeliveryWindowDisplayOption[] = [
  {
    value: "week-1",
    labelTop: "Diese",
    labelBottom: "Woche",
  },
  {
    value: "week-2",
    labelTop: "Nächste",
    labelBottom: "Woche",
  },
];

const SORT_OPTIONS: Array<Option<SortOption>> = [
  { value: "delivery-asc", label: "Frühester Liefertermin" },
  { value: "delivery-desc", label: "Spätester Liefertermin" },
  { value: "company-asc", label: "Unternehmen (A-Z)" },
];

function isDeliveryWindowOption(value: string): value is DeliveryWindowOption {
  return value === "week-1" || value === "week-2";
}

function isSortOption(value: string): value is SortOption {
  return value === "delivery-asc" || value === "delivery-desc" || value === "company-asc";
}

function getSelectedDeliveryWindows(value: string): DeliveryWindowOption[] {
  return isDeliveryWindowOption(value) ? [value] : [];
}

function matchesDeliveryWindow(
  deliveryDate: string,
  selectedDeliveryWindows: DeliveryWindowOption[],
) {
  const deliveryWindowKey = getDeliveryWindowKey(deliveryDate);

  return (
    selectedDeliveryWindows.length === 0 ||
    (deliveryWindowKey !== null && selectedDeliveryWindows.includes(deliveryWindowKey))
  );
}

function matchesMarketplaceFilters({
  order,
  normalizedQuery,
  selectedCity,
  selectedDeliveryWindows,
}: {
  order: RestockMarketplaceOrder;
  normalizedQuery: string;
  selectedCity: string;
  selectedDeliveryWindows: DeliveryWindowOption[];
}) {
  const matchesQuery =
    normalizedQuery.length === 0 ||
    [order.companyName, order.city, order.addressLine1, order.orderId]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  const matchesCity = selectedCity.length === 0 || order.city === selectedCity;

  return matchesQuery && matchesCity && matchesDeliveryWindow(
    order.deliveryDate,
    selectedDeliveryWindows,
  );
}

function DesktopFilters({
  availableCities,
  cityOptions,
  desktopDeliveryWindowOptions,
  hasActiveFilters,
  selectedCity,
  selectedDeliveryWindows,
  sortOption,
  onCityChange,
  onDeliveryWindowsChange,
  onReset,
  onSortChange,
  onToggleDeliveryWindow,
}: Readonly<{
  availableCities: string[];
  cityOptions: Array<Option<string>>;
  desktopDeliveryWindowOptions: Array<Option<DeliveryWindowOption>>;
  hasActiveFilters: boolean;
  selectedCity: string;
  selectedDeliveryWindows: DeliveryWindowOption[];
  sortOption: SortOption;
  onCityChange: (city: string) => void;
  onDeliveryWindowsChange: (deliveryWindows: DeliveryWindowOption[]) => void;
  onReset: () => void;
  onSortChange: (sortOption: SortOption) => void;
  onToggleDeliveryWindow: (deliveryWindow: DeliveryWindowOption) => void;
}>) {
  return (
    <div className="restocker-my-orders-desktop-filters">
      <div className="restocker-my-orders-desktop-filters__header">
        <div className="restocker-my-orders-desktop-filters__heading">
          <span className="restocker-my-orders-desktop-filters__eyebrow">Filter</span>
          <strong>Weitere Filter</strong>
        </div>

        <button
          className="restocker-my-orders-desktop-filters__reset-link"
          type="button"
          onClick={onReset}
          disabled={!hasActiveFilters}
        >
          Zurücksetzen
        </button>
      </div>

      <div className="restocker-my-orders-desktop-filters__toolbar">
        <div className="restocker-my-orders-desktop-filters__filter-row">
          <label className="restocker-my-orders-desktop-field restocker-my-orders-desktop-field--delivery">
            <span className="restocker-my-orders-desktop-field__label">
              Lieferzeitraum
            </span>

            <fieldset className="restocker-my-orders-desktop-segmented-control" aria-label="Lieferzeitraum auswählen">
              {desktopDeliveryWindowOptions.map((deliveryWindow) => {
                const isActive = selectedDeliveryWindows.includes(deliveryWindow.value);

                return (
                  <button
                    key={deliveryWindow.value}
                    className={`restocker-my-orders-desktop-segment ${isActive ? "is-active" : ""}`.trim()}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => onToggleDeliveryWindow(deliveryWindow.value)}
                  >
                    {deliveryWindow.label}
                  </button>
                );
              })}
            </fieldset>
          </label>

          <label className="restocker-my-orders-desktop-field restocker-my-orders-desktop-field--city">
            <span className="restocker-my-orders-desktop-field__label">Stadt</span>

            <span className="restocker-my-orders-desktop-select-shell">
              <select
                className="restocker-my-orders-desktop-select"
                value={selectedCity}
                onChange={(event) => onCityChange(event.target.value)}
              >
                {cityOptions.map((cityOption) => (
                  <option key={cityOption.value || "all-cities"} value={cityOption.value}>
                    {cityOption.label}
                  </option>
                ))}
              </select>

              <FaChevronDown aria-hidden="true" />
            </span>
          </label>
        </div>

        <div className="restocker-my-orders-desktop-filters__sort-row">
          <label className="restocker-my-orders-desktop-field restocker-my-orders-desktop-field--sort">
            <span className="restocker-my-orders-desktop-field__label">Sortieren nach</span>

            <span className="restocker-my-orders-desktop-select-shell restocker-my-orders-desktop-select-shell--sort">
              <select
                className="restocker-my-orders-desktop-select restocker-my-orders-desktop-select--sort"
                value={sortOption}
                onChange={(event) => {
                  if (isSortOption(event.target.value)) {
                    onSortChange(event.target.value);
                  }
                }}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <FaChevronDown aria-hidden="true" />
            </span>
          </label>
        </div>
      </div>

      <div className="restocker-my-orders-desktop-filters__legacy" aria-hidden="true">
        <label className="restocker-filter-field">
          <span>Lieferzeitraum</span>
          <select
            value={selectedDeliveryWindows[0] ?? ""}
            onChange={(event) =>
              onDeliveryWindowsChange(getSelectedDeliveryWindows(event.target.value))
            }
          >
            <option value="">Alle Zeiträume</option>
            {desktopDeliveryWindowOptions.map((deliveryWindow) => (
              <option key={deliveryWindow.value} value={deliveryWindow.value}>
                {deliveryWindow.label}
              </option>
            ))}
          </select>
        </label>

        <label className="restocker-filter-field">
          <span>Stadt</span>
          <select
            value={selectedCity}
            onChange={(event) => onCityChange(event.target.value)}
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
            onChange={(event) => {
              if (isSortOption(event.target.value)) {
                onSortChange(event.target.value);
              }
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function MobileFilterSheet({
  cityOptions,
  deliveryWindowOptions,
  draftSearchQuery,
  draftSelectedCity,
  draftSelectedDeliveryWindows,
  draftSortOption,
  onApply,
  onClose,
  onDraftCityChange,
  onDraftSearchChange,
  onDraftSortChange,
  onReset,
  onToggleDraftDeliveryWindow,
}: Readonly<{
  cityOptions: Array<Option<string>>;
  deliveryWindowOptions: DeliveryWindowDisplayOption[];
  draftSearchQuery: string;
  draftSelectedCity: string;
  draftSelectedDeliveryWindows: DeliveryWindowOption[];
  draftSortOption: SortOption;
  onApply: () => void;
  onClose: () => void;
  onDraftCityChange: (city: string) => void;
  onDraftSearchChange: (searchQuery: string) => void;
  onDraftSortChange: (sortOption: SortOption) => void;
  onReset: () => void;
  onToggleDraftDeliveryWindow: (deliveryWindow: DeliveryWindowOption) => void;
}>) {
  return (
    <>
      <button
        className="subscription-modal__overlay"
        type="button"
        aria-label="Filter schließen"
        onClick={onClose}
      />

      <dialog
        open
        className="restocker-mobile-filter-sheet"
        aria-modal="true"
        aria-labelledby="restocker-mobile-filter-title"
      >
        <div className="restocker-mobile-filter-sheet__handle" aria-hidden="true" />

        <div className="restocker-mobile-filter-sheet__header">
          <h2 id="restocker-mobile-filter-title">Filter</h2>
        </div>

        <div className="restocker-mobile-filter-sheet__body">
          <label
            className="restocker-marketplace-search restocker-marketplace-search--sheet"
            htmlFor="restocker-marketplace-search-mobile"
          >
            <FaSearch aria-hidden="true" />
            <input
              id="restocker-marketplace-search-mobile"
              type="search"
              placeholder="Nach Unternehmen suchen ..."
              value={draftSearchQuery}
              onChange={(event) => onDraftSearchChange(event.target.value)}
            />
          </label>

          <div className="restocker-mobile-filter-group">
            <span className="restocker-mobile-filter-group__label">Lieferzeitraum</span>
            <div className="restocker-mobile-filter-chip-grid restocker-mobile-filter-chip-grid--weeks">
              {deliveryWindowOptions.map((deliveryWindow) => (
                <button
                  key={deliveryWindow.value}
                  className={`restocker-mobile-filter-chip restocker-mobile-filter-week-chip ${draftSelectedDeliveryWindows.includes(deliveryWindow.value) ? "is-active" : ""}`.trim()}
                  type="button"
                  onClick={() => onToggleDraftDeliveryWindow(deliveryWindow.value)}
                >
                  <span className="restocker-mobile-filter-week-chip__label">
                    <span>{deliveryWindow.labelTop}</span>
                    <span>{deliveryWindow.labelBottom}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="restocker-mobile-filter-group">
            <span className="restocker-mobile-filter-group__label">Stadt</span>
            <span className="restocker-mobile-select-shell">
              <select
                className="restocker-mobile-select-trigger"
                value={draftSelectedCity}
                onChange={(event) => onDraftCityChange(event.target.value)}
                aria-label="Stadt auswählen"
              >
                {cityOptions.map((cityOption) => (
                  <option key={cityOption.value || "all-cities"} value={cityOption.value}>
                    {cityOption.label}
                  </option>
                ))}
              </select>
            </span>
          </div>

          <div className="restocker-mobile-filter-group">
            <span className="restocker-mobile-filter-group__label">Sortieren</span>
            <div className="restocker-mobile-sort-shell">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`restocker-mobile-sort-option restocker-mobile-sort-option--stacked ${draftSortOption === option.value ? "is-active" : ""}`.trim()}
                  type="button"
                  onClick={() => onDraftSortChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="restocker-mobile-filter-sheet__actions">
          <button
            className="button button--ghost"
            type="button"
            onClick={onReset}
          >
            Zurücksetzen
          </button>

          <button className="button" type="button" onClick={onApply}>
            Anwenden
          </button>
        </div>
      </dialog>
    </>
  );
}

function ConfirmAcceptDialog({
  selectedOrder,
  onBack,
  onClose,
  onConfirm,
}: Readonly<{
  selectedOrder: RestockMarketplaceOrder;
  onBack: () => void;
  onClose: () => void;
  onConfirm: () => void;
}>) {
  return (
    <>
      <button
        className="subscription-modal__overlay"
        type="button"
        aria-label="Bestätigungsdialog schließen"
        onClick={onClose}
      />

      <dialog
        open
        className="subscription-modal restocker-confirm-dialog"
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
            onClick={onBack}
          >
            Zurück zur Lieferung
          </button>

          <button className="button" type="button" onClick={onConfirm}>
            Ja, Fahrt annehmen
          </button>
        </div>
      </dialog>
    </>
  );
}

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
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedDeliveryWindows, setSelectedDeliveryWindows] = useState<DeliveryWindowOption[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>("delivery-asc");
  const [draftSearchQuery, setDraftSearchQuery] = useState("");
  const [draftSelectedCity, setDraftSelectedCity] = useState("");
  const [draftSelectedDeliveryWindows, setDraftSelectedDeliveryWindows] =
    useState<DeliveryWindowOption[]>([]);
  const [draftSortOption, setDraftSortOption] = useState<SortOption>("delivery-asc");
  const [selectedOrder, setSelectedOrder] = useState<RestockMarketplaceOrder | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  useEffect(() => {
    const mediaQuery = globalThis.matchMedia("(max-width: 720px)");

    const updateViewportMatch = () => {
      setIsMobileViewport(mediaQuery.matches);
    };

    updateViewportMatch();
    mediaQuery.addEventListener("change", updateViewportMatch);

    return () => {
      mediaQuery.removeEventListener("change", updateViewportMatch);
    };
  }, []);

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

  useEffect(() => {
    if (isMobileViewport && isFilterOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }

    return undefined;
  }, [isFilterOpen, isMobileViewport]);

  const availableCities = useMemo(
    () =>
      Array.from(new Set(marketplaceResult.orders.map((order) => order.city))).sort(
        (firstCity, secondCity) => firstCity.localeCompare(secondCity, "de"),
      ),
    [marketplaceResult.orders],
  );

  const desktopDeliveryWindowOptions = useMemo(
    () =>
      DELIVERY_WINDOW_OPTIONS.map((deliveryWindow) => ({
        value: deliveryWindow.value,
        label: formatDeliveryWindowOption(deliveryWindow.value),
      })),
    [],
  );

  const cityOptions = useMemo(
    () => [
      { value: "", label: "Alle Städte" },
      ...availableCities.map((city) => ({ value: city, label: city })),
    ],
    [availableCities],
  );

  const filteredOrders = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const visibleOrders = marketplaceResult.orders.filter((order) =>
      matchesMarketplaceFilters({
        order,
        normalizedQuery,
        selectedCity,
        selectedDeliveryWindows,
      }),
    );

    return sortOrders(visibleOrders, sortOption);
  }, [marketplaceResult.orders, searchQuery, selectedCity, selectedDeliveryWindows, sortOption]);

  const hasActiveDesktopFilters =
    searchQuery.trim().length > 0 ||
    selectedCity !== "" ||
    selectedDeliveryWindows.length > 0 ||
    sortOption !== "delivery-asc";

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

  async function handleAcceptOrder(orderToAccept: RestockMarketplaceOrder) {
    if (!auth.user?.id || !auth.token) {
      return;
    }

    try {
      await acceptRestockOrder({
        orderKey: orderToAccept.orderKey,
        restockerId: auth.user.id,
        restockerName,
        token: auth.token,
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
        `Du hast Auftrag #${orderToAccept.orderId} erfolgreich übernommen.`,
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

    void handleAcceptOrder(selectedOrder);
  }

  function openAcceptConfirmation(orderToAccept: RestockMarketplaceOrder) {
    setSelectedOrder(orderToAccept);
    setIsConfirmDialogOpen(true);
  }

  function openMobileFilter() {
    setDraftSearchQuery(searchQuery);
    setDraftSelectedCity(selectedCity);
    setDraftSelectedDeliveryWindows(selectedDeliveryWindows);
    setDraftSortOption(sortOption);
    setIsFilterOpen(true);
  }

  function closeMobileFilter() {
    setIsFilterOpen(false);
  }

  function handleFilterToggle() {
    if (isMobileViewport) {
      if (isFilterOpen) {
        closeMobileFilter();
        return;
      }

      openMobileFilter();
      return;
    }

    setIsFilterOpen((currentState) => !currentState);
  }

  function handleApplyMobileFilters() {
    setSearchQuery(draftSearchQuery);
    setSelectedCity(draftSelectedCity);
    setSelectedDeliveryWindows(draftSelectedDeliveryWindows);
    setSortOption(draftSortOption);
    closeMobileFilter();
  }

  function handleResetMobileFilters() {
    setDraftSearchQuery("");
    setDraftSelectedCity("");
    setDraftSelectedDeliveryWindows([]);
    setDraftSortOption("delivery-asc");
  }

  function handleResetDesktopFilters() {
    setSearchQuery("");
    setSelectedCity("");
    setSelectedDeliveryWindows([]);
    setSortOption("delivery-asc");
  }

  function toggleDesktopDeliveryWindow(deliveryWindow: DeliveryWindowOption) {
    setSelectedDeliveryWindows((currentWindows) =>
      currentWindows.includes(deliveryWindow)
        ? currentWindows.filter((windowValue) => windowValue !== deliveryWindow)
        : [...currentWindows, deliveryWindow],
    );
  }

  function toggleDraftDeliveryWindow(deliveryWindow: DeliveryWindowOption) {
    setDraftSelectedDeliveryWindows((currentWindows) =>
      currentWindows.includes(deliveryWindow)
        ? currentWindows.filter((windowValue) => windowValue !== deliveryWindow)
        : [...currentWindows, deliveryWindow],
    );
  }

  let selectedOrderDialog = null;

  if (selectedOrder && isConfirmDialogOpen) {
    selectedOrderDialog = (
      <ConfirmAcceptDialog
        selectedOrder={selectedOrder}
        onBack={() => setIsConfirmDialogOpen(false)}
        onClose={() => setIsConfirmDialogOpen(false)}
        onConfirm={handleAcceptSelectedOrder}
      />
    );
  } else if (selectedOrder) {
    selectedOrderDialog = (
      <RestockerOrderDetailDialog
        order={selectedOrder}
        backLabel="Zurück zu allen Aufträgen"
        onClose={handleCloseDetailDialog}
        actions={
          <button
            className="button"
            type="button"
            onClick={() => setIsConfirmDialogOpen(true)}
          >
            Fahrt annehmen
          </button>
        }
      />
    );
  }

  return (
    <div className="home-showcase restocker-marketplace-page">
      <section className="hero-card home-hero restocker-marketplace-hero restocker-marketplace-hero--orders">
        <div className="home-hero__top">
          <span className="eyebrow">Restocker</span>
        </div>

        <div className="hero-copy">
          <h1>RESTOCKORDER - MARKTPLATZ</h1>
          <p>Alle verfügbaren Aufträge für die nächsten zwei Wochen.</p>

          <div className="dashboard-strip" aria-label="Marktplatz Üœbersicht">
            <article className="dashboard-stat">
              <span className="dashboard-stat__label">Offene Aufträge</span>
              <strong>{filteredOrders.length}</strong>
            </article>

            <article className="dashboard-stat">
              <span className="dashboard-stat__label">Unternehmen</span>
              <strong>{new Set(filteredOrders.map((order) => order.companyName)).size}</strong>
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
              Sichere dir offene Lieferaufträge mit einem Liefertermin in den
              kommenden zwei Wochen.
            </p>
          </div>
        </div>


        <div className="restocker-earnings-note" aria-label="Information zu deinem Verdienst">
          <div className="restocker-earnings-note__copy">
            <span className="restocker-earnings-note__eyebrow">Dein Verdienst</span>
            <strong>7 € pro erfolgreich abgeschlossener Unternehmenslieferung</strong>
            <p>
              Die Vergütung wird dir für jeden angenommenen und erfolgreich erledigten
              Lieferauftrag gutgeschrieben.
            </p>
          </div>
        </div>

        {error ? <div className="error-box">{error}</div> : null}

        <div className="restocker-marketplace-toolbar">
          {isMobileViewport ? null : (
            <label
              className="restocker-marketplace-search"
              htmlFor="restocker-marketplace-search"
            >
              <FaSearch aria-hidden="true" />
              <input
                id="restocker-marketplace-search"
                type="search"
                placeholder="Nach Unternehmen suchen ..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
          )}

          <button
            className={`button button--ghost restocker-filter-button ${isFilterOpen ? "active" : ""}`.trim()}
            type="button"
            onClick={handleFilterToggle}
          >
            <FaFilter />
            Filter
          </button>
        </div>

        {isFilterOpen && isMobileViewport === false ? (
          <DesktopFilters
            availableCities={availableCities}
            cityOptions={cityOptions}
            desktopDeliveryWindowOptions={desktopDeliveryWindowOptions}
            hasActiveFilters={hasActiveDesktopFilters}
            selectedCity={selectedCity}
            selectedDeliveryWindows={selectedDeliveryWindows}
            sortOption={sortOption}
            onCityChange={setSelectedCity}
            onDeliveryWindowsChange={setSelectedDeliveryWindows}
            onReset={handleResetDesktopFilters}
            onSortChange={setSortOption}
            onToggleDeliveryWindow={toggleDesktopDeliveryWindow}
          />
        ) : null}

        {filteredOrders.length === 0 ? (
          <div className="restocker-empty-state">
            <FaTruck aria-hidden="true" />
            <div>
              <strong>Keine offenen Aufträge gefunden.</strong>
              <p className="muted-text">
                Passe deine Filter an oder versuche es später noch einmal, wenn
                neue Liefertermine verfügbar sind.
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
                secondaryActionLabel="Fahrt annehmen"
                onSecondaryAction={() => openAcceptConfirmation(order)}
              />
            ))}
          </div>
        )}
      </section>

      {isMobileViewport && isFilterOpen ? (
        <MobileFilterSheet
          cityOptions={cityOptions}
          deliveryWindowOptions={DELIVERY_WINDOW_OPTIONS}
          draftSearchQuery={draftSearchQuery}
          draftSelectedCity={draftSelectedCity}
          draftSelectedDeliveryWindows={draftSelectedDeliveryWindows}
          draftSortOption={draftSortOption}
          onApply={handleApplyMobileFilters}
          onClose={closeMobileFilter}
          onDraftCityChange={setDraftSelectedCity}
          onDraftSearchChange={setDraftSearchQuery}
          onDraftSortChange={setDraftSortOption}
          onReset={handleResetMobileFilters}
          onToggleDraftDeliveryWindow={toggleDraftDeliveryWindow}
        />
      ) : null}

      {selectedOrderDialog}
    </div>
  );
}


