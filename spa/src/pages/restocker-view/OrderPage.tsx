import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  FaCheck,
  FaChevronDown,
  FaFilter,
  FaSearch,
  FaTruck,
  FaTruckLoading,
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
  const [isCityMenuOpen, setIsCityMenuOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<RestockMarketplaceOrder | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 720px)");

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
    if (!isMobileViewport || !isFilterOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFilterOpen, isMobileViewport]);

  const availableCities = useMemo(
    () =>
      Array.from(new Set(marketplaceResult.orders.map((order) => order.city))).sort(
        (firstCity, secondCity) => firstCity.localeCompare(secondCity, "de"),
      ),
    [marketplaceResult.orders],
  );

  const deliveryWindowOptions = useMemo(
    () => [
      {
        value: "week-1" as DeliveryWindowOption,
        labelTop: "Diese",
        labelBottom: "Woche",
      },
      {
        value: "week-2" as DeliveryWindowOption,
        labelTop: "Nächste",
        labelBottom: "Woche",
      },
    ],
    [],
  );

  const desktopDeliveryWindowOptions = useMemo(
    () =>
      deliveryWindowOptions.map((deliveryWindow) => ({
        value: deliveryWindow.value,
        label: formatDeliveryWindowOption(deliveryWindow.value),
      })),
    [deliveryWindowOptions],
  );

  const cityOptions = useMemo(
    () => [
      { value: "", label: "Alle Städte" },
      ...availableCities.map((city) => ({ value: city, label: city })),
    ],
    [availableCities],
  );

  const sortOptions: Array<{ value: SortOption; label: string }> = [
    { value: "delivery-asc", label: "Frühester Liefertermin" },
    { value: "delivery-desc", label: "Spätester Liefertermin" },
    { value: "company-asc", label: "Unternehmen (A-Z)" },
  ];

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
        selectedDeliveryWindows.length === 0 ||
        selectedDeliveryWindows.includes(getDeliveryWindowKey(order.deliveryDate) as DeliveryWindowOption);

      return matchesQuery && matchesCity && matchesDeliveryWindow;
    });

    return sortOrders(visibleOrders, sortOption);
  }, [marketplaceResult.orders, searchQuery, selectedCity, selectedDeliveryWindows, sortOption]);

  const selectedDraftCityLabel =
    cityOptions.find((cityOption) => cityOption.value === draftSelectedCity)?.label ??
    "Alle Städte";

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
    setIsCityMenuOpen(false);
    setIsFilterOpen(true);
  }

  function closeMobileFilter() {
    setIsCityMenuOpen(false);
    setIsFilterOpen(false);
  }

  function handleFilterToggle() {
    if (!isMobileViewport) {
      setIsFilterOpen((currentState) => !currentState);
      return;
    }

    if (isFilterOpen) {
      closeMobileFilter();
      return;
    }

    openMobileFilter();
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
    setIsCityMenuOpen(false);
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
          {!isMobileViewport ? (
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
          ) : null}

          <button
            className={`button button--ghost restocker-filter-button ${isFilterOpen ? "active" : ""}`.trim()}
            type="button"
            onClick={handleFilterToggle}
          >
            <FaFilter />
            Filter
          </button>
        </div>

        {isFilterOpen && !isMobileViewport ? (
          <div className="restocker-my-orders-desktop-filters">
            <div className="restocker-my-orders-desktop-filters__header">
              <div className="restocker-my-orders-desktop-filters__heading">
                <span className="restocker-my-orders-desktop-filters__eyebrow">Filter</span>
                <strong>Weitere Filter</strong>
              </div>

              <button
                className="restocker-my-orders-desktop-filters__reset-link"
                type="button"
                onClick={handleResetDesktopFilters}
                disabled={!hasActiveDesktopFilters}
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

                  <div className="restocker-my-orders-desktop-segmented-control" role="group" aria-label="Lieferzeitraum auswählen">
                    {desktopDeliveryWindowOptions.map((deliveryWindow) => {
                      const isActive = selectedDeliveryWindows.includes(deliveryWindow.value);

                      return (
                        <button
                          key={deliveryWindow.value}
                          className={`restocker-my-orders-desktop-segment ${isActive ? "is-active" : ""}`.trim()}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => toggleDesktopDeliveryWindow(deliveryWindow.value)}
                        >
                          {deliveryWindow.label}
                        </button>
                      );
                    })}
                  </div>
                </label>

                <label className="restocker-my-orders-desktop-field restocker-my-orders-desktop-field--city">
                  <span className="restocker-my-orders-desktop-field__label">Stadt</span>

                  <span className="restocker-my-orders-desktop-select-shell">
                    <select
                      className="restocker-my-orders-desktop-select"
                      value={selectedCity}
                      onChange={(event) => setSelectedCity(event.target.value)}
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
                      onChange={(event) => setSortOption(event.target.value as SortOption)}
                    >
                      {sortOptions.map((option) => (
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
                  setSelectedDeliveryWindows(
                    event.target.value
                      ? [event.target.value as DeliveryWindowOption]
                      : [],
                  )
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
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            </div>
          </div>
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
        <>
          <button
            className="subscription-modal__overlay"
            type="button"
            aria-label="Filter schließen"
            onClick={closeMobileFilter}
          />

          <section
            className="restocker-mobile-filter-sheet"
            role="dialog"
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
                  onChange={(event) => setDraftSearchQuery(event.target.value)}
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
                      onClick={() => toggleDraftDeliveryWindow(deliveryWindow.value)}
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
                <div className="restocker-mobile-select-shell">
                  <button
                    className={`restocker-mobile-select-trigger ${isCityMenuOpen ? "is-open" : ""}`.trim()}
                    type="button"
                    onClick={() => setIsCityMenuOpen((currentState) => !currentState)}
                    aria-expanded={isCityMenuOpen}
                    aria-haspopup="listbox"
                  >
                    <span>{selectedDraftCityLabel}</span>
                    <FaChevronDown aria-hidden="true" />
                  </button>

                  {isCityMenuOpen ? (
                    <div
                      className="restocker-mobile-select-menu"
                      role="listbox"
                      aria-label="Stadt auswählen"
                    >
                      {cityOptions.map((cityOption) => (
                        <button
                          key={cityOption.value || "all-cities"}
                          className={`restocker-mobile-select-option ${draftSelectedCity === cityOption.value ? "is-active" : ""}`.trim()}
                          type="button"
                          onClick={() => {
                            setDraftSelectedCity(cityOption.value);
                            setIsCityMenuOpen(false);
                          }}
                        >
                          <span>{cityOption.label}</span>
                          {draftSelectedCity === cityOption.value ? <FaCheck aria-hidden="true" /> : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="restocker-mobile-filter-group">
                <span className="restocker-mobile-filter-group__label">Sortieren</span>
                <div className="restocker-mobile-sort-shell">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`restocker-mobile-sort-option restocker-mobile-sort-option--stacked ${draftSortOption === option.value ? "is-active" : ""}`.trim()}
                      type="button"
                      onClick={() => setDraftSortOption(option.value)}
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
                onClick={handleResetMobileFilters}
              >
                Zurücksetzen
              </button>

              <button className="button" type="button" onClick={handleApplyMobileFilters}>
                Anwenden
              </button>
            </div>
          </section>
        </>
      ) : null}

      {selectedOrder && !isConfirmDialogOpen ? (
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
  );
}


