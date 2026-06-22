import {type FocusEvent, type KeyboardEvent, type ReactElement, type ReactNode, useEffect, useRef, useState} from "react";
import {Link, NavLink, useLocation, useNavigate} from "react-router-dom";
import {
  FaBars,
  FaChevronRight,
  FaHome,
  FaSearch,
  FaSlidersH,
  FaTimes,
  FaUser,
  FaCalendarAlt,
  FaArchive, FaClipboardList, FaTruck, FaShieldAlt, FaPaintBrush, FaSignOutAlt, FaFileInvoiceDollar
} from "react-icons/fa";
import toast, {Toaster} from "react-hot-toast";
import iconColored from "../assets/logos/icon_colored.png";
import {useAuth} from "../auth/AuthProvider";
import {useSubscriptionCart} from "../hooks/useSubscriptionCart";
import {getProducts} from "../services/products";
import {getMyUser, type UserProfile} from "../services/users";
import type {
  Product,
  RestockOrderWithProduct,
} from "../types/shop";
import {
  getSubscriptionProfileStatus,
  type SubscriptionProfileStatus,
} from "../utils/subscriptionProfile";
import {ProductGrid} from "./ProductGrid";
import {SubscriptionDialog} from "./SubscriptionDialog";
import {SubscriptionProfileProgress} from "./SubscriptionProfileProgress";

interface AppShellProps {
  readonly children: (context: Readonly<{
    isLoggedIn: boolean;
    onAddToSubscription: (product: Product) => void;
    onOpenSubscriptionOverview: () => void;
    onEditSubscriptionItem: (item: RestockOrderWithProduct) => void;
    onRemoveSubscriptionItem: (item: RestockOrderWithProduct) => Promise<void>;
    subscriptionItems: readonly RestockOrderWithProduct[];
    canModifySubscription: boolean;
    subscriptionProfileStatus: SubscriptionProfileStatus | null;
    onSubscriptionProfileUpdated: (user: UserProfile) => void;
    onLogout: () => void;
    theme: "light" | "dark";
    onToggleTheme: () => void;
    onSetTheme: (theme: "light" | "dark") => void;
  }>) => ReactNode;
}

type ActiveSubscriptionLayer = "overview" | "dialog" | null;

const INCOMPLETE_PROFILE_SUBSCRIPTION_MESSAGE =
  "Dein Profil ist noch nicht vollständig. Bitte vervollständige die Pflichtfelder, bevor du dein Abo änderst.";

function showIncompleteProfileWarning(): void {
  toast.error(INCOMPLETE_PROFILE_SUBSCRIPTION_MESSAGE);
}

export function AppShell({children}: Readonly<AppShellProps>): ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [query, setQuery] = useState("");
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);
  const [selectedArticleType, setSelectedArticleType] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [isHeaderAssistOpen, setIsHeaderAssistOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | undefined>();
  const [subscriptionProfileStatus, setSubscriptionProfileStatus] =
    useState<SubscriptionProfileStatus | null>(null);
  const {hasRole} = useAuth();
  const [activeSubscriptionLayer, setActiveSubscriptionLayer] =
    useState<ActiveSubscriptionLayer>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSavingSubscription, setIsSavingSubscription] = useState(false);
  const [selectedSubscriptionItem, setSelectedSubscriptionItem] =
    useState<RestockOrderWithProduct | undefined>(undefined);
  const auth = useAuth();
  const isLoggedIn = auth.isAuthenticated;
  const subscriptionCart = useSubscriptionCart({
    customerId: auth.user?.id,
    token: auth.token,
  });
  const location = useLocation();
  const navigate = useNavigate();
  const headerSearchRef = useRef<HTMLDivElement | null>(null);
  const profileMenuCloseTimerRef = useRef<number | null>(null);

  const articleTypeOptions = Array.from(
    new Set(products.map((product) => product.category)),
  ).sort((a, b) => a.localeCompare(b, "de"));
  const articleTypeBrandMap = new Map(
    articleTypeOptions.map((articleType) => [
      articleType,
      Array.from(
        new Set(
          products
            .filter((product) => product.category === articleType)
            .map((product) => product.brand),
        ),
      ).sort((a, b) => a.localeCompare(b, "de")),
    ]),
  );
  const brandOptions = Array.from(
    new Set(
      products
        .filter(
          (product) =>
            !selectedArticleType || product.category === selectedArticleType,
        )
        .map((product) => product.brand),
    ),
  ).sort((a, b) => a.localeCompare(b, "de"));

  const normalizedQuery = query.trim().toLowerCase();
  const queryLength = query.trim().length;
  const quickArticleTypeMatches = normalizedQuery
    ? articleTypeOptions
      .filter((articleType) => articleType.toLowerCase().includes(normalizedQuery))
      .slice(0, 6)
    : [];
  const hasBrands = (articleType: string): boolean =>
    (articleTypeBrandMap.get(articleType)?.length ?? 0) > 1;
  const activeAssistArticleType =
    quickArticleTypeMatches.includes(selectedArticleType) &&
    hasBrands(selectedArticleType)
      ? selectedArticleType
      : "";
  const quickBrandMatches = activeAssistArticleType
    ? (articleTypeBrandMap.get(activeAssistArticleType) ?? []).slice(0, 6)
    : [];
  const filteredProducts = products.filter((product) => {
    const matchesText =
      !normalizedQuery ||
      [product.name, product.description, product.category, product.brand]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    const matchesArticleType =
      !selectedArticleType || product.category === selectedArticleType;
    const matchesBrand = !selectedBrand || product.brand === selectedBrand;

    return matchesText && matchesArticleType && matchesBrand;
  });

  const isRestocker = hasRole("Restocker");
  const userKind = isRestocker ? "restocker" : "customer";
  const canModifySubscription = subscriptionProfileStatus?.isComplete !== false;

  function resetSubscriptionLayer(): void {
    setActiveSubscriptionLayer(null);
    setSelectedProduct(null);
    setSelectedSubscriptionItem(undefined);
  }

  function handleLogout(): void {
    resetSubscriptionLayer();
    void auth.logout();
  }

  function handleAddToSubscription(product: Product): void {
    if (!canModifySubscription) {
      showIncompleteProfileWarning();
      return;
    }

    setSelectedProduct(product);
    setSelectedSubscriptionItem(undefined);
    setActiveSubscriptionLayer("dialog");
  }

  function openSubscriptionOverview(): void {
    setSelectedProduct(null);
    setSelectedSubscriptionItem(undefined);
    setActiveSubscriptionLayer("overview");
  }

  function handleEditSubscriptionItem(item: RestockOrderWithProduct): void {
    if (!canModifySubscription) {
      showIncompleteProfileWarning();
      return;
    }

    setSelectedProduct(item.product);
    setSelectedSubscriptionItem(item);
    setActiveSubscriptionLayer("dialog");
  }

  async function handleRemoveSubscriptionItem(item: RestockOrderWithProduct): Promise<void> {
    if (!canModifySubscription) {
      showIncompleteProfileWarning();
      return;
    }

    try {
      await subscriptionCart.removeItem(item);
      toast.success(`${item.product.name} wurde aus dem Abo entfernt`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Das Produkt konnte nicht aus dem Abo entfernt werden.",
      );
    }
  }

  function handleSubscriptionProfileUpdated(user: UserProfile): void {
    setSubscriptionProfileStatus(getSubscriptionProfileStatus(user));
  }

  function handleQueryChange(value: string): void {
    setQuery(value);
  }

  function handleArticleTypeChange(value: string): void {
    setSelectedArticleType(value);
    setSelectedBrand("");
  }

  function handleBrandChange(value: string): void {
    setSelectedBrand(value);
  }

  function closeProfileMenu(): void {
    setIsProfileMenuOpen(false);
  }

  function openProfileMenu(): void {
    if (profileMenuCloseTimerRef.current) {
      globalThis.clearTimeout(profileMenuCloseTimerRef.current);
      profileMenuCloseTimerRef.current = null;
    }

    setIsProfileMenuOpen(true);
  }

  function closeProfileMenuWithDelay(): void {
    if (profileMenuCloseTimerRef.current) {
      globalThis.clearTimeout(profileMenuCloseTimerRef.current);
    }

    profileMenuCloseTimerRef.current = globalThis.setTimeout(() => {
      setIsProfileMenuOpen(false);
      profileMenuCloseTimerRef.current = null;
    }, 180);
  }

  function handleProfileMenuBlur(event: FocusEvent<HTMLElement>): void {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      closeProfileMenu();
    }
  }

  function handleSearchToggle(): void {
    setIsAdvancedSearch((current) => {
      const next = !current;

      if (!next) {
        setSelectedArticleType("");
        setSelectedBrand("");
      }

      return next;
    });
  }

  useEffect(() => {
    async function loadProducts(): Promise<void> {
      const loadedProducts = await getProducts();
      setProducts(loadedProducts);
      subscriptionCart.registerProducts(loadedProducts);
    }

    void loadProducts();
  }, []);

  useEffect(() => {
    if (auth.isInitializing) {
      return;
    }

    if (isLoggedIn && location.pathname === "/login") {
      navigate("/", {replace: true});
    }
  }, [auth.isInitializing, isLoggedIn, location.pathname, navigate]);

  useEffect(() => {
    if (!isLoggedIn) {
      setProfilePictureUrl(undefined);
      setSubscriptionProfileStatus(null);
      return;
    }

    if (!auth.user) {
      return;
    }

    getMyUser({
      token: auth.token,
      kind: userKind,
    })
      .then((loadedUser) => {
        setProfilePictureUrl(loadedUser.profilePictureUrl);
        setSubscriptionProfileStatus(getSubscriptionProfileStatus(loadedUser));
      })
      .catch(() => {
        setProfilePictureUrl(undefined);
        setSubscriptionProfileStatus(null);
      });
  }, [auth.token, auth.user, isLoggedIn, location.pathname, userKind]);

  useEffect(() => {
    setMenuOpen(false);
    setIsHeaderAssistOpen(false);
    setIsProfileMenuOpen(false);
    window.scrollTo({top: 0, behavior: "instant"});
  }, [location.pathname]);

  useEffect(() => {
    return () => {
      if (profileMenuCloseTimerRef.current) {
        globalThis.clearTimeout(profileMenuCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      const target = event.target as Node;

      if (headerSearchRef.current && !headerSearchRef.current.contains(target)) {
        setIsHeaderAssistOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setIsHeaderAssistOpen(false);
    }
  }, [query]);

  useEffect(() => {
    const savedTheme = globalThis.localStorage.getItem("restockoffice-theme");

    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
      return;
    }

    const systemPrefersDark = globalThis.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    setTheme(systemPrefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    globalThis.localStorage.setItem("restockoffice-theme", theme);
  }, [theme]);

  const onSearchPage = location.pathname === "/products";
  const isDarkMode = theme === "dark";
  const isHomeActive = isRestocker ? location.pathname === "/restocker" : location.pathname === "/home";
  const restockerMobileNavItems = [
    {
      to: "/restocker",
      label: "Startseite",
      icon: <FaHome/>,
      activePaths: ["/restocker-deliveries"],
    },
    {
      to: "/restocker-orders",
      label: "Offene Auftr\u00e4ge",
      icon: <FaClipboardList/>,
    },
    {
      to: "/restocker-my-orders",
      label: "Meine Auftr\u00e4ge",
      icon: <FaTruck/>,
    },
    {
      to: "/account",
      label: "Konto",
      icon: <FaUser/>,
    },
  ];

  function openProductsPage(): void {
    if (location.pathname !== "/products") {
      navigate("/products");
    }
  }

  function handleHeaderAssistOpen(isHeader: boolean): void {
    if (isHeader) {
      setIsHeaderAssistOpen(true);
    }
  }

  function handleSearchInputChange(value: string, isHeader: boolean): void {
    handleQueryChange(value);
    handleHeaderAssistOpen(isHeader);
  }

  function handleSearchInputKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    isHeader: boolean,
  ): void {
    if (event.key === "Escape" && isHeader) {
      setIsHeaderAssistOpen(false);
      return;
    }

    if (event.key === "Enter" && queryLength >= 2) {
      openProductsPage();
    }
  }

  function handleQuickArticleTypeSelect(articleType: string): void {
    setSelectedArticleType(articleType);
    setSelectedBrand("");
    setIsHeaderAssistOpen(false);
    openProductsPage();
  }

  function handleQuickBrandSelect(brand: string): void {
    setSelectedBrand(brand);
    setIsHeaderAssistOpen(false);
    openProductsPage();
  }

  function renderQuickSearchAssist(
    isHeader: boolean,
    showBrandColumn: boolean,
  ): ReactElement {
    return (
      <fieldset
        className={`search-quick-table ${isHeader ? "search-quick-table--floating" : ""} ${showBrandColumn ? "search-quick-table--two-cols" : "search-quick-table--single-col"}`}
        aria-label="Schnellauswahl"
      >
        <div className="search-quick-column">
          {quickArticleTypeMatches.map((articleType) => (
            <button
              key={articleType}
              className={`search-quick-row ${activeAssistArticleType === articleType ? "active" : ""}`}
              type="button"
              onClick={() => handleQuickArticleTypeSelect(articleType)}
            >
              <span>{articleType}</span>
              {hasBrands(articleType) ? (
                <FaChevronRight
                  className="search-quick-row__arrow"
                  aria-hidden="true"
                />
              ) : null}
            </button>
          ))}
        </div>

        {showBrandColumn ? (
          <div className="search-quick-column">
            {quickBrandMatches.map((brand) => (
              <button
                key={brand}
                className={`search-quick-row ${selectedBrand === brand ? "active" : ""}`}
                type="button"
                onClick={() => handleQuickBrandSelect(brand)}
              >
                <span>{brand}</span>
              </button>
            ))}
          </div>
        ) : null}
      </fieldset>
    );
  }

  function renderAdvancedSearch(isHeader: boolean): ReactElement | null {
    if (!isAdvancedSearch || isHeader) {
      return null;
    }

    return (
      <div className="search-controls__advanced">
        <select
          className="search-select"
          value={selectedArticleType}
          onChange={(event) => handleArticleTypeChange(event.target.value)}
          aria-label="Kategorie auswÃ¤hlen"
        >
          <option value="">Alle Kategorien</option>
          {articleTypeOptions.map((articleType) => (
            <option key={articleType} value={articleType}>
              {articleType}
            </option>
          ))}
        </select>

        <select
          className="search-select"
          value={selectedBrand}
          onChange={(event) => handleBrandChange(event.target.value)}
          aria-label="Unterkategorie auswÃ¤hlen"
        >
          <option value="">Alle Marken</option>
          {brandOptions.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </div>
    );
  }

  function renderSearchControls(source: "header" | "page"): ReactElement {
    const isHeader = source === "header";
    const showToggle = !isHeader;
    const showQuickAssist =
      isHeader &&
      isHeaderAssistOpen &&
      queryLength >= 2 &&
      quickArticleTypeMatches.length > 0;
    const showBrandColumn = quickBrandMatches.length > 0;

    return (
      <div className={`search-controls search-controls--${source}`}>
        <div className="search-controls__main">
          <div className="search-input-shell">
            <input
              className={`search-input ${isHeader ? "header-search-input" : ""}`.trim()}
              type="search"
              placeholder="Artikel oder Kategorie suchen"
              value={query}
              onChange={(event) => handleSearchInputChange(event.target.value, isHeader)}
              onFocus={() => handleHeaderAssistOpen(isHeader)}
              onKeyDown={(event) => handleSearchInputKeyDown(event, isHeader)}
              aria-label="Artikel oder Kategorie suchen"
            />

            <button
              className="search-inline-button"
              type="button"
              onClick={openProductsPage}
              aria-label="Suche starten"
              title="Suche starten"
            >
              <FaSearch/>
            </button>
          </div>

          {showToggle ? (
            <button
              className={`button button--ghost search-toggle ${isAdvancedSearch ? "active" : ""}`}
              type="button"
              onClick={handleSearchToggle}
              aria-label={
                isAdvancedSearch
                  ? "Filter schließen"
                  : "Filter öffnen"
              }
              title={
                isAdvancedSearch
                  ? "Filter schließen"
                  : "Filter öffnen"
              }
            >
              <FaSlidersH/>
              <span>Filter</span>
            </button>
          ) : null}
        </div>

        {showQuickAssist ? renderQuickSearchAssist(isHeader, showBrandColumn) : null}

        {renderAdvancedSearch(isHeader)}
      </div>
    );
  }

  async function handleConfirmSubscription({
    quantity,
    intervalCount,
  }: Readonly<{ quantity: number; intervalCount: number }>): Promise<void> {
    if (!selectedProduct) {
      return;
    }

    if (!canModifySubscription) {
      showIncompleteProfileWarning();
      return;
    }

    if (isSavingSubscription) {
      return;
    }

    setIsSavingSubscription(true);

    try {
      const action = await subscriptionCart.addOrUpdateItem({
        product: selectedProduct,
        quantity,
        intervalCount,
      });

      toast.success(
        action === "updated"
          ? `${selectedProduct.name} wurde im Abo aktualisiert`
          : `${selectedProduct.name} wurde zum Abo hinzugefügt`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Das Abo konnte nicht gespeichert werden.",
      );
    } finally {
      setIsSavingSubscription(false);
    }
  }

  function renderProfileMenu(): ReactElement {
    return (
      <nav
        className="header-profile-menu"
        aria-label="Kontomenu"
        onMouseEnter={openProfileMenu}
        onMouseLeave={closeProfileMenuWithDelay}
        onFocus={openProfileMenu}
        onBlur={handleProfileMenuBlur}
      >
        <NavLink
          className={`button button--ghost nav-btn ${profilePictureUrl ? "header-profile-button" : ""}`.trim()}
          to="/account"
          title="Konto"
          aria-label="Konto"
        >
          {profilePictureUrl ? (
            <img
              className="header-profile-avatar"
              src={profilePictureUrl}
              alt="Profilbild"
              onError={() => setProfilePictureUrl(undefined)}
            />
          ) : (
            <FaUser/>
          )}
        </NavLink>

        {isProfileMenuOpen ? (
          <section
            className="header-profile-popover"
            aria-label="Kontobereiche"
          >
            <Link
              className="header-profile-popover__link"
              to="/account#profile"
              onClick={closeProfileMenu}
            >
              <FaUser/>
              <span>Profil</span>
            </Link>

            <Link
              className="header-profile-popover__link"
              to="/account#settings"
              onClick={closeProfileMenu}
            >
              <FaPaintBrush/>
              <span>Darstellung</span>
            </Link>

            {!isRestocker && (
              <Link
                className="header-profile-popover__link"
                to="/account#finance"
                onClick={closeProfileMenu}
              >
                <FaFileInvoiceDollar/>
                <span>Finanzen</span>
              </Link>
            )}

            <Link
              className="header-profile-popover__link"
              to="/account#security"
              onClick={closeProfileMenu}
            >
              <FaShieldAlt/>
              <span>Sicherheit</span>
            </Link>

            <button
              className="header-profile-popover__link header-profile-popover__link--danger"
              type="button"
              onClick={handleLogout}
            >
              <FaSignOutAlt/>
              <span>Abmelden</span>
            </button>
          </section>
        ) : null}
      </nav>
    );
  }

  function renderHeaderActions(): ReactElement | null {
    if (!isLoggedIn) {
      return null;
    }

    return (
      <>
        {/* Startseite: Unterschiedliche Seiten für Customer bzw. Restocker  */}
        <NavLink
          className={`button button--ghost nav-btn ${isHomeActive ? "active" : ""}`}
          to={isRestocker ? "/restocker" : "/"}
          title="Startseite"
        >
          <FaHome/>
        </NavLink>

        {/* Produkte: Nur Customer  */}
        {!isRestocker && (
          <NavLink
            className="button button--ghost nav-btn"
            to="/products"
            title="Alle Produkte"
          >
            <FaArchive/>
          </NavLink>
        )}

        {/* Subscription: Nur für Customer */}
        {!isRestocker && (
          <NavLink
            className="button button--ghost nav-btn"
            to="/subscription"
            title="Abo-Übersicht"
            aria-label="Abo-Übersicht"
          >
            <FaCalendarAlt/>
          </NavLink>
        )}

        {/* Aufträge: Nur für Restocker */}
        {isRestocker && (
          <NavLink
            className="button button--ghost nav-btn"
            to="/restocker-orders"
            title="Offene Aufträge"
          >
            <FaClipboardList/>
          </NavLink>
        )}

        {isRestocker && (
          <NavLink
            className="button button--ghost nav-btn"
            to="/restocker-my-orders"
            title="Meine Aufträge"
          >
            <FaCalendarAlt/>
          </NavLink>
        )}

        {/* Hamburger immer sichtbar */}
        <button
          className={`button button--ghost hamburger-btn ${isRestocker ? "hamburger-btn--restocker" : ""}`.trim()}
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
        >
          {menuOpen ? <FaTimes/> : <FaBars/>}
        </button>

        {/* Account: Für beide gleich*/}
        {renderProfileMenu()}
      </>
    );
  }

  function renderMobileNavigation(): ReactElement | null {
    if (!isLoggedIn || !menuOpen) {
      return null;
    }

    return (
      <nav className="mobile-nav" aria-label="Mobile Navigation">
        <div className="container mobile-nav__inner">

          {/* Startseite: Unterschiedliche Seiten für Customer bzw. Restocker */}
          <NavLink
            className="mobile-nav__link"
            to={isRestocker ? "/restocker" : "/"}
            onClick={() => setMenuOpen(false)}
          >
            <FaHome/> Startseite
          </NavLink>

          {/* Produkte: Nur Customer */}
          {!isRestocker && (
            <NavLink
              className="mobile-nav__link"
              to="/products"
              onClick={() => setMenuOpen(false)}
            >
              <FaArchive/> Alle Produkte
            </NavLink>
          )}

          {/* Subscription: Nur für Customer */}
          {!isRestocker && (
            <NavLink
              className="mobile-nav__link"
              to="/subscription"
              onClick={() => setMenuOpen(false)}
            >
              <FaCalendarAlt/> Aboverwaltung
            </NavLink>
          )}

          {/* Aufträge: Nur für Restocker */}
          {isRestocker && (
            <NavLink
              className="mobile-nav__link"
              to="/restocker-orders"
              onClick={() => setMenuOpen(false)}
            >
              <FaClipboardList/> Offene Aufträge
            </NavLink>
          )}

          {isRestocker && (
            <NavLink
              className="mobile-nav__link"
              to="/restocker-my-orders"
              onClick={() => setMenuOpen(false)}
            >
              <FaTruck/> Meine Aufträge
            </NavLink>
          )}

          {/* Account: Für beide gleich */}
          <NavLink
            className="mobile-nav__link"
            to="/account"
            onClick={() => setMenuOpen(false)}
          >
            <FaUser/> Konto
          </NavLink>

        </div>
      </nav>
    );
  }

  function renderRestockerMobileTabbar(): ReactElement | null {
    if (!isLoggedIn || !isRestocker) {
      return null;
    }

    return (
      <nav className="restocker-mobile-tabbar" aria-label="Restocker Navigation">
        {restockerMobileNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({isActive}) => {
              const isItemActive =
                isActive || item.activePaths?.includes(location.pathname);

              return `restocker-mobile-tabbar__item ${isItemActive ? "active" : ""}`;
            }}
            aria-label={item.label}
          >
            <span className="restocker-mobile-tabbar__icon" aria-hidden="true">
              {item.icon}
            </span>
          </NavLink>
        ))}
      </nav>
    );
  }

  function renderSubscriptionDialog(): ReactElement | null {
    if (!isLoggedIn) {
      return null;
    }

    return (
      <SubscriptionDialog
        items={subscriptionCart.items}
        product={selectedProduct}
        selectedItem={selectedSubscriptionItem}
        open={activeSubscriptionLayer === "dialog"}
        onClose={resetSubscriptionLayer}
        onSelectItem={handleEditSubscriptionItem}
        onOpenOverview={openSubscriptionOverview}
        isProfileComplete={canModifySubscription}
        onConfirm={handleConfirmSubscription}
      />
    );
  }

  function renderMobileBackdrop(): ReactElement | null {
    if (!isLoggedIn || !menuOpen) {
      return null;
    }

    return (
      <button
        className="mobile-nav-backdrop"
        type="button"
        onClick={() => setMenuOpen(false)}
        aria-label="Menü schließen"
      />
    );
  }

  function renderSubscriptionProgress(): ReactElement | null {
    if (!isLoggedIn || !onSearchPage) {
      return null;
    }

    return (
      <SubscriptionProfileProgress
        status={subscriptionProfileStatus}
        message="Solange Pflichtfelder fehlen, kannst du kein Produkt zum Abo hinzufügen."
      />
    );
  }

  function renderProductsSection(): ReactElement | null {
    if (!isLoggedIn || !onSearchPage) {
      return null;
    }

    return (
      <section className="page-card section-space">
        <div className="section-head">
          <div>
            <span className="eyebrow">Unser ReStockOrder Sortiment</span>
            <h2>Alle verfügbaren Produkte</h2>
          </div>
        </div>
        {renderSearchControls("page")}
        <ProductGrid
          products={filteredProducts}
        />
      </section>
    );
  }

  return (
    <div className={`app-shell ${isLoggedIn && isRestocker ? "app-shell--restocker-nav" : ""}`.trim()}>
      <header className="site-header">
        <div className="container site-header__inner">
          <div className="brand-column">
            <nav aria-label="Hauptnavigation" className="site-nav">
              <NavLink
                to={isLoggedIn ? "/" : "/login"}
                className="logo-link"
                title="ReStockOffice - Startseite"
              >
                <div className="brand-block">
                  <img
                    className="brand-block__logo"
                    src={iconColored}
                    alt="ReStockOffice"
                  />
                  <div>
                    <div className="site-logo">ReStockOffice</div>
                  </div>
                </div>
              </NavLink>
            </nav>
          </div>

          <div className="header-search"/>

          <div className="header-actions">
            {renderHeaderActions()}
          </div>
        </div>

        {/* ------------------- MOBILE HEADER MENÜ ------------------ */}

        {renderMobileNavigation()}

      </header>

      {renderMobileBackdrop()}

      <main className="site-main">
        <div className="container">
          {renderSubscriptionProgress()}

          {children({
            isLoggedIn,
            onAddToSubscription: handleAddToSubscription,
            onOpenSubscriptionOverview: openSubscriptionOverview,
            onEditSubscriptionItem: handleEditSubscriptionItem,
            onRemoveSubscriptionItem: handleRemoveSubscriptionItem,
            subscriptionItems: subscriptionCart.items,
            canModifySubscription,
            subscriptionProfileStatus,
            onSubscriptionProfileUpdated: handleSubscriptionProfileUpdated,
            onLogout: handleLogout,
            theme,
            onToggleTheme: () => setTheme(isDarkMode ? "light" : "dark"),
            onSetTheme: (newTheme) => setTheme(newTheme),
          })}

          {renderProductsSection()}
        </div>
      </main>

      <footer className="site-footer">
        <div className="container site-footer__inner">
          <a href="https://restockoffice.de/kontakt">Kontakt</a>
          <a href="https://restockoffice.de/impressum">Impressum</a>
          <a href="https://restockoffice.de/rechtliches">Rechtliche Hinweise</a>
          <span>ReStockOffice {'\u00A9'}2026</span>
        </div>

        {renderRestockerMobileTabbar()}
      </footer>

      {renderSubscriptionDialog()}
      <Toaster position="bottom-center"/>
    </div>
  );
}
