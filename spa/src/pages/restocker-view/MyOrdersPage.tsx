import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { FaCheck, FaChevronDown, FaFilter, FaSearch, FaTruck } from "react-icons/fa";
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
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedDeliveryWindows, setSelectedDeliveryWindows] = useState<DeliveryWindowOption[]>([]);
  const [selectedRelativeDay, setSelectedRelativeDay] = useState<"" | RelativeDayOption>("");
  const [sortOption, setSortOption] = useState<SortOption>("delivery-asc");
  const [draftSearchQuery, setDraftSearchQuery] = useState("");
  const [draftSelectedCity, setDraftSelectedCity] = useState("");
  const [draftSelectedDeliveryWindows, setDraftSelectedDeliveryWindows] =
    useState<DeliveryWindowOption[]>([]);
  const [draftSelectedRelativeDay, setDraftSelectedRelativeDay] =
    useState<"" | RelativeDayOption>("");
  const [draftSortOption, setDraftSortOption] = useState<SortOption>("delivery-asc");
  const [isCityMenuOpen, setIsCityMenuOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<RestockMarketplaceOrder | null>(null);

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
      Array.from(new Set(assignedOrdersResult.orders.map((order) => order.city))).sort(
        (firstCity, secondCity) => firstCity.localeCompare(secondCity, "de"),
      ),
    [assignedOrdersResult.orders],
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
      {
        value: "week-3" as DeliveryWindowOption,
        labelTop: "Woche",
        labelBottom: "3",
      },
      {
        value: "week-4" as DeliveryWindowOption,
        labelTop: "Woche",
        labelBottom: "4",
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

    const visibleOrders = assignedOrdersResult.orders.filter((order) => {
      const matchesQuery =
        !normalizedQuery ||
        [order.companyName, order.city, order.addressLine1, order.orderId]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesCity = !selectedCity || order.city === selectedCity;
      const matchesDeliveryWindow =
        selectedDeliveryWindows.length === 0 ||
        selectedDeliveryWindows.includes(
          getDeliveryWindowKey(order.deliveryDate) as DeliveryWindowOption,
        );
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
    selectedDeliveryWindows,
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
  const mobilePriorityFilterOptions: Array<{ value: RelativeDayOption; label: string }> = [
    { value: "today", label: "Heute" },
    { value: "tomorrow", label: "Morgen" },
  ];
  const selectedDraftCityLabel =
    cityOptions.find((cityOption) => cityOption.value === draftSelectedCity)?.label ??
    "Alle Städte";

  const hasActiveDesktopFilters =
    searchQuery.trim().length > 0 ||
    selectedCity !== "" ||
    selectedDeliveryWindows.length > 0 ||
    selectedRelativeDay !== "" ||
    sortOption !== "delivery-asc";

  if (!auth.isInitializing && !auth.hasRole("Restocker")) {
    return <Navigate to="/" replace />;
  }

  if (auth.isInitializing || isLoading) {
    return <section className="page-card">Deine Aufträge werden geladen...</section>;
  }

  function openMobileFilter() {
    setDraftSearchQuery(searchQuery);
    setDraftSelectedCity(selectedCity);
    setDraftSelectedDeliveryWindows(selectedDeliveryWindows);
    setDraftSelectedRelativeDay(selectedRelativeDay);
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
    setSelectedRelativeDay(draftSelectedRelativeDay);
    setSortOption(draftSortOption);
    closeMobileFilter();
  }

  function handleResetMobileFilters() {
    setDraftSearchQuery("");
    setDraftSelectedCity("");
    setDraftSelectedDeliveryWindows([]);
    setDraftSelectedRelativeDay("");
    setDraftSortOption("delivery-asc");
    setIsCityMenuOpen(false);
  }

  function handleResetDesktopFilters() {
    setSearchQuery("");
    setSelectedCity("");
    setSelectedDeliveryWindows([]);
    setSelectedRelativeDay("");
    setSortOption("delivery-asc");
  }

  function handlePriorityFilterSelection(nextValue: "" | RelativeDayOption) {
    setSelectedRelativeDay(nextValue);

    if (nextValue) {
      setSelectedDeliveryWindows([]);
      return;
    }

    setSelectedDeliveryWindows([]);
    setSelectedCity("");
  }

  function handleDeliveryWindowSelection(nextValue: DeliveryWindowOption | "") {
    setSelectedDeliveryWindows(nextValue ? [nextValue] : []);

    if (nextValue) {
      setSelectedRelativeDay("");
    }
  }

  function toggleDesktopDeliveryWindow(deliveryWindow: DeliveryWindowOption) {
    setSelectedDeliveryWindows((currentWindows) => {
      const updatedWindows = currentWindows.includes(deliveryWindow)
        ? currentWindows.filter((windowValue) => windowValue !== deliveryWindow)
        : [...currentWindows, deliveryWindow];

      if (updatedWindows.length > 0) {
        setSelectedRelativeDay("");
      }

      return updatedWindows;
    });
  }

  function handleDraftPriorityFilterSelection(nextValue: RelativeDayOption) {
    setDraftSelectedRelativeDay((currentValue) => {
      const updatedValue = currentValue === nextValue ? "" : nextValue;

      if (updatedValue) {
        setDraftSelectedDeliveryWindows([]);
      }

      return updatedValue;
    });
  }

  function toggleDraftDeliveryWindow(deliveryWindow: DeliveryWindowOption) {
    setDraftSelectedDeliveryWindows((currentWindows) => {
      const updatedWindows = currentWindows.includes(deliveryWindow)
        ? currentWindows.filter((windowValue) => windowValue !== deliveryWindow)
        : [...currentWindows, deliveryWindow];

      if (updatedWindows.length > 0) {
        setDraftSelectedRelativeDay("");
      }

      return updatedWindows;
    });
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
              Hier findest du all deine aktiven und angenommenen Aufträge.
            </p>
          </div>
        </div>


        {error ? <div className="error-box">{error}</div> : null}

        <div className="restocker-marketplace-toolbar">
          {!isMobileViewport ? (
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

        {!isMobileViewport ? (
          <div className="restocker-priority-filters" aria-label="Schnellfilter für Auslieferungen">
            {priorityFilterOptions.map((filterOption) => {
              const isOverviewFilterActive =
                filterOption.value === "" &&
                selectedRelativeDay === "" &&
                selectedDeliveryWindows.length === 0 &&
                selectedCity === "";
              const isActive =
                filterOption.value === ""
                  ? isOverviewFilterActive
                  : selectedRelativeDay === filterOption.value;

              return (
                <button
                  key={filterOption.value || "all"}
                  className={`restocker-priority-filter ${isActive ? "is-active" : ""}`.trim()}
                  type="button"
                  onClick={() => handlePriorityFilterSelection(filterOption.value)}
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
        ) : null}

        {isFilterOpen && !isMobileViewport ? (
          <div className="restocker-my-orders-desktop-filters">
            <div className="restocker-my-orders-desktop-filters__header">
              <div className="restocker-my-orders-desktop-filters__heading">
                <span className="restocker-my-orders-desktop-filters__eyebrow">Filter</span>
                <strong>Deine Aufträge gezielt eingrenzen</strong>
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

              <div className="restocker-my-orders-desktop-filters__legacy" aria-hidden="true">
                <div className="restocker-my-orders-desktop-filter-group">
                <span className="restocker-my-orders-desktop-filter-group__label">
                  Lieferzeitraum
                </span>

                <div className="restocker-my-orders-desktop-chip-grid restocker-my-orders-desktop-chip-grid--weeks">
                  <button
                    className={`restocker-my-orders-desktop-chip restocker-my-orders-desktop-week-chip ${selectedDeliveryWindows.length === 0 ? "is-active" : ""}`.trim()}
                    type="button"
                    aria-pressed={selectedDeliveryWindows.length === 0}
                    onClick={() => handleDeliveryWindowSelection("")}
                  >
                    Alle Zeiträume
                  </button>

                  {desktopDeliveryWindowOptions.map((deliveryWindow) => {
                    const isActive = selectedDeliveryWindows.includes(deliveryWindow.value);

                    return (
                      <button
                        key={deliveryWindow.value}
                        className={`restocker-my-orders-desktop-chip restocker-my-orders-desktop-week-chip ${isActive ? "is-active" : ""}`.trim()}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() =>
                          handleDeliveryWindowSelection(isActive ? "" : deliveryWindow.value)
                        }
                      >
                        {deliveryWindow.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="restocker-my-orders-desktop-filter-group restocker-my-orders-desktop-filter-group--city">
                <span className="restocker-my-orders-desktop-filter-group__label">Stadt</span>

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

              <div className="restocker-my-orders-desktop-filter-group restocker-my-orders-desktop-filter-group--wide restocker-my-orders-desktop-filter-group--sort">
                <span className="restocker-my-orders-desktop-filter-group__label">Sortieren</span>

                <div className="restocker-my-orders-desktop-sort-grid">
                  {sortOptions.map((option) => {
                    const isActive = sortOption === option.value;

                    return (
                      <button
                        key={option.value}
                        className={`restocker-my-orders-desktop-chip restocker-my-orders-desktop-sort-chip ${isActive ? "is-active" : ""}`.trim()}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => setSortOption(option.value)}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            </div>
          </div>
        ) : null}

        {filteredOrders.length === 0 ? (
          <div className="restocker-empty-state restocker-empty-state--assigned">
            <FaTruck aria-hidden="true" />
            <div>
              <strong>Keine passenden Aufträge gefunden.</strong>
              <p className="muted-text">
                Ändere deine Filtereinstellungen oder schaue im Marktplatz vorbei,
                um neue Aufträge anzunehmen.
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
            aria-labelledby="restocker-my-orders-mobile-filter-title"
          >
            <div className="restocker-mobile-filter-sheet__handle" aria-hidden="true" />

            <div className="restocker-mobile-filter-sheet__header">
              <h2 id="restocker-my-orders-mobile-filter-title">Filter</h2>
            </div>

            <div className="restocker-mobile-filter-sheet__body">
              <label
                className="restocker-marketplace-search restocker-marketplace-search--sheet"
                htmlFor="restocker-my-orders-search-mobile"
              >
                <FaSearch aria-hidden="true" />
                <input
                  id="restocker-my-orders-search-mobile"
                  type="search"
                  placeholder="Nach Unternehmen suchen ..."
                  value={draftSearchQuery}
                  onChange={(event) => setDraftSearchQuery(event.target.value)}
                />
              </label>

              <div className="restocker-mobile-filter-group">
                <span className="restocker-mobile-filter-group__label">Priorität</span>
                <div className="restocker-mobile-filter-chip-grid restocker-mobile-filter-chip-grid--priority">
                  {mobilePriorityFilterOptions.map((filterOption) => (
                    <button
                      key={filterOption.value}
                      className={`restocker-mobile-filter-chip restocker-mobile-filter-priority-chip ${draftSelectedRelativeDay === filterOption.value ? "is-active" : ""}`.trim()}
                      type="button"
                      onClick={() => handleDraftPriorityFilterSelection(filterOption.value)}
                    >
                      {filterOption.label}
                    </button>
                  ))}
                </div>
              </div>

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
