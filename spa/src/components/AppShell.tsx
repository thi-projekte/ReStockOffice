import { type ReactNode, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  FaBars,
  FaChevronRight,
  FaHome,
  FaSearch,
  FaSlidersH,
  FaTimes,
  FaUser,
  FaCalendarAlt,
  FaArchive, FaClipboardList, FaTruck, FaShieldAlt, FaPaintBrush, FaSignOutAlt
} from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast";
import iconColored from "../assets/logos/icon_colored.png";
import { useAuth } from "../auth/AuthProvider";
import { useSubscriptionCart } from "../hooks/useSubscriptionCart";
import { getProducts } from "../services/products";
import { getMyUser } from "../services/users";
import type {
  Product,
  RestockOrderWithProduct,
} from "../types/shop";
import { ProductGrid } from "./ProductGrid";
import { SubscriptionDialog } from "./SubscriptionDialog";

interface AppShellProps {
  children: (context: {
    isLoggedIn: boolean;
    onAddToSubscription: (product: Product) => void;
    onOpenSubscriptionOverview: () => void;
    onEditSubscriptionItem: (item: RestockOrderWithProduct) => void;
    subscriptionItems: RestockOrderWithProduct[];
    onLogout: () => void;
    theme: "light" | "dark";
    onToggleTheme: () => void;
    onSetTheme: (theme: "light" | "dark") => void;
  }) => ReactNode;
}

type ActiveSubscriptionLayer = "overview" | "dialog" | null;

export function AppShell({ children }: AppShellProps) {
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
  const { hasRole } = useAuth();
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
  const hasBrands = (articleType: string) =>
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

  function resetSubscriptionLayer() {
    setActiveSubscriptionLayer(null);
    setSelectedProduct(null);
    setSelectedSubscriptionItem(undefined);
  }

  function handleLogout() {
    resetSubscriptionLayer();
    void auth.logout();
  }

  function handleAddToSubscription(product: Product) {
    setSelectedProduct(product);
    setSelectedSubscriptionItem(undefined);
    setActiveSubscriptionLayer("dialog");
  }

  function openSubscriptionOverview() {
    setSelectedProduct(null);
    setSelectedSubscriptionItem(undefined);
    setActiveSubscriptionLayer("overview");
  }

  function handleEditSubscriptionItem(item: RestockOrderWithProduct) {
    setSelectedProduct(item.product);
    setSelectedSubscriptionItem(item);
    setActiveSubscriptionLayer("dialog");
  }

  function handleQueryChange(value: string) {
    setQuery(value);
  }

  function handleArticleTypeChange(value: string) {
    setSelectedArticleType(value);
    setSelectedBrand("");
  }

  function handleBrandChange(value: string) {
    setSelectedBrand(value);
  }

  function openProfileMenu() {
    if (profileMenuCloseTimerRef.current) {
      window.clearTimeout(profileMenuCloseTimerRef.current);
      profileMenuCloseTimerRef.current = null;
    }

    setIsProfileMenuOpen(true);
  }

  function closeProfileMenuWithDelay() {
    if (profileMenuCloseTimerRef.current) {
      window.clearTimeout(profileMenuCloseTimerRef.current);
    }

    profileMenuCloseTimerRef.current = window.setTimeout(() => {
      setIsProfileMenuOpen(false);
      profileMenuCloseTimerRef.current = null;
    }, 180);
  }

  function handleSearchToggle() {
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
    async function loadProducts() {
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
      navigate("/", { replace: true });
    }
  }, [auth.isInitializing, isLoggedIn, location.pathname, navigate]);

  useEffect(() => {
    if (!isLoggedIn) {
      setProfilePictureUrl(undefined);
      return;
    }

    getMyUser({
      token: auth.token,
      kind: isRestocker ? "restocker" : "customer",
    })
      .then((loadedUser) => {
        setProfilePictureUrl(loadedUser.profilePictureUrl);
      })
      .catch(() => {
        setProfilePictureUrl(undefined);
      });
  }, [auth.token, isLoggedIn, isRestocker]);

  useEffect(() => {
    setMenuOpen(false);
    setIsHeaderAssistOpen(false);
    setIsProfileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    return () => {
      if (profileMenuCloseTimerRef.current) {
        window.clearTimeout(profileMenuCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
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
    const savedTheme = window.localStorage.getItem("restockoffice-theme");

    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
      return;
    }

    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    setTheme(systemPrefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("restockoffice-theme", theme);
  }, [theme]);

  const onSearchPage = location.pathname === "/products";
  const isDarkMode = theme === "dark";
  const isHomeActive = isRestocker ? location.pathname === "/restocker" : location.pathname === "/home";

  function renderSearchControls(source: "header" | "page") {
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
              onChange={(event) => {
                handleQueryChange(event.target.value);

                if (isHeader) {
                  setIsHeaderAssistOpen(true);
                }
              }}
              onFocus={() => {
                if (isHeader) {
                  setIsHeaderAssistOpen(true);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape" && isHeader) {
                  setIsHeaderAssistOpen(false);
                  return;
                }

                if (
                  event.key === "Enter" &&
                  queryLength >= 2 &&
                  location.pathname !== "/products"
                ) {
                  navigate("/products");
                }
              }}
              aria-label="Artikel oder Kategorie suchen"
            />

            <button
              className="search-inline-button"
              type="button"
              onClick={() => {
                if (location.pathname !== "/products") {
                  navigate("/products");
                }
              }}
              aria-label="Suche starten"
              title="Suche starten"
            >
              <FaSearch />
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
              <FaSlidersH />
              <span>Filter</span>
            </button>
          ) : null}
        </div>

        {showQuickAssist ? (
          <div
            className={`search-quick-table ${isHeader ? "search-quick-table--floating" : ""} ${showBrandColumn ? "search-quick-table--two-cols" : "search-quick-table--single-col"}`}
            role="listbox"
            aria-label="Schnellauswahl"
          >
            <div className="search-quick-column">
              {quickArticleTypeMatches.map((articleType) => (
                <button
                  key={articleType}
                  className={`search-quick-row ${activeAssistArticleType === articleType ? "active" : ""}`}
                  type="button"
                  onClick={() => {
                    setSelectedArticleType(articleType);
                    setSelectedBrand("");
                    setIsHeaderAssistOpen(false);

                    if (location.pathname !== "/products") {
                      navigate("/products");
                    }
                  }}
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
                    onClick={() => {
                      setSelectedBrand(brand);
                      setIsHeaderAssistOpen(false);

                      if (location.pathname !== "/products") {
                        navigate("/products");
                      }
                    }}
                  >
                    <span>{brand}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {isAdvancedSearch && !isHeader ? (
          <div className="search-controls__advanced">
            <select
              className="search-select"
              value={selectedArticleType}
              onChange={(event) => handleArticleTypeChange(event.target.value)}
              aria-label="Kategorie auswählen"
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
              aria-label="Unterkategorie auswählen"
            >
              <option value="">Alle Marken</option>
              {brandOptions.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="app-shell">
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

          <div className="header-search"  />

          <div className="header-actions">
            {isLoggedIn ? (
                <>
                  {/* Startseite: Unterschiedliche Seiten für Customer bzw. Restocker  */}
                  <NavLink
                      className={`button button--ghost nav-btn ${isHomeActive ? "active" : ""}`}
                      to={isRestocker ? "/restocker" : "/"}
                      title="Startseite"
                  >
                    <FaHome />
                  </NavLink>

                  {/* Produkte: Nur Customer  */}
                  {!isRestocker && (
                      <NavLink
                          className="button button--ghost nav-btn"
                          to="/products"
                          title="Alle Produkte"
                      >
                        <FaArchive />
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
                        <FaCalendarAlt />
                      </NavLink>
                  )}

                  {/* Aufträge: Nur für Restocker */}
                  {isRestocker && (
                      <NavLink
                          className="button button--ghost nav-btn"
                          to="/restocker-orders"
                          title="Aufträge"
                      >
                        <FaClipboardList  />
                      </NavLink>
                  )}

                  {/* Auslieferungen: Nur für Restocker */}
                  {isRestocker && (
                      <NavLink
                          className="button button--ghost nav-btn"
                          to="/restocker-deliveries"
                          title="Auslieferungen"
                      >
                        <FaTruck  />
                      </NavLink>
                  )}

                  {/* Hamburger immer sichtbar */}
                  <button
                      className="button button--ghost hamburger-btn"
                      type="button"
                      onClick={() => setMenuOpen((v) => !v)}
                      aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
                  >
                    {menuOpen ? <FaTimes /> : <FaBars />}
                  </button>

                  {/* Account: Für beide gleich*/}
                  <div
                      className="header-profile-menu"
                      onMouseEnter={openProfileMenu}
                      onMouseLeave={closeProfileMenuWithDelay}
                  >
                    <NavLink
                        className={`button button--ghost nav-btn ${profilePictureUrl ? "header-profile-button" : ""}`.trim()}
                        to="/account"
                        title="Konto"
                        aria-label="Konto"
                        onFocus={openProfileMenu}
                    >
                      {profilePictureUrl ? (
                        <img
                          className="header-profile-avatar"
                          src={profilePictureUrl}
                          alt="Profilbild"
                        />
                      ) : (
                        <FaUser />
                      )}
                    </NavLink>



                    {isProfileMenuOpen ? (
                      <div
                        className="header-profile-popover"
                        onMouseEnter={openProfileMenu}
                        onMouseLeave={closeProfileMenuWithDelay}
                        onBlur={(event) => {
                          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                            setIsProfileMenuOpen(false);
                          }
                        }}
                      >
                        <Link
                          className="header-profile-popover__link"
                          to="/account#profile"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <FaUser />
                          <span>Profil</span>
                        </Link>

                        <Link
                          className="header-profile-popover__link"
                          to="/account#settings"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <FaPaintBrush />
                          <span>Darstellung</span>
                        </Link>

                        <Link
                          className="header-profile-popover__link"
                          to="/account#security"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <FaShieldAlt />
                          <span>Sicherheit</span>
                        </Link>

                        <button
                          className="header-profile-popover__link header-profile-popover__link--danger"
                          type="button"
                          onClick={handleLogout}
                        >
                          <FaSignOutAlt />
                          <span>Abmelden</span>
                        </button>
                      </div>
                    ) : null}
                  </div>

                </>
            ) : null}
          </div>
        </div>

        {/* ------------------- MOBILE HEADER MENÜ ------------------ */}

        {isLoggedIn && menuOpen ? (
            <nav className="mobile-nav" aria-label="Mobile Navigation">
              <div className="container mobile-nav__inner">

                {/* Startseite: Unterschiedliche Seiten für Customer bzw. Restocker */}
                <NavLink
                    className="mobile-nav__link"
                    to={isRestocker ? "/restocker" : "/"}
                    onClick={() => setMenuOpen(false)}
                >
                  <FaHome /> Startseite
                </NavLink>

                {/* Produkte: Nur Customer */}
                {!isRestocker && (
                    <NavLink
                        className="mobile-nav__link"
                        to="/products"
                        onClick={() => setMenuOpen(false)}
                    >
                      <FaArchive /> Alle Produkte
                    </NavLink>
                )}

                {/* Subscription: Nur für Customer */}
                {!isRestocker && (
                    <NavLink
                        className="mobile-nav__link"
                        to="/subscription"
                        onClick={() => setMenuOpen(false)}
                    >
                      <FaCalendarAlt /> Aboverwaltung
                    </NavLink>
                )}

                {/* Aufträge: Nur für Restocker */}
                {isRestocker && (
                    <NavLink
                        className="mobile-nav__link"
                        to="/restocker-orders"
                        onClick={() => setMenuOpen(false)}
                    >
                      <FaClipboardList /> Aufträge
                    </NavLink>
                )}

                {/* Auslieferungen: Nur für Restocker */}
                {isRestocker && (
                    <NavLink
                        className="mobile-nav__link"
                        to="/restocker-deliveries"
                        onClick={() => setMenuOpen(false)}
                    >
                      <FaTruck /> Auslieferungen
                    </NavLink>
                )}

                {/* Account: Für beide gleich */}
                <NavLink
                    className="mobile-nav__link"
                    to="/account"
                    onClick={() => setMenuOpen(false)}
                >
                  <FaUser /> Konto
                </NavLink>

              </div>
            </nav>
        ) : null}

      </header>

      {isLoggedIn && menuOpen ? (
        <button
          className="mobile-nav-backdrop"
          type="button"
          onClick={() => setMenuOpen(false)}
          aria-label="Menü schließen"
        />
      ) : null}

      <main className="site-main">
        <div className="container">
           {children({
             isLoggedIn,
             onAddToSubscription: handleAddToSubscription,
             onOpenSubscriptionOverview: openSubscriptionOverview,
             onEditSubscriptionItem: handleEditSubscriptionItem,
             subscriptionItems: subscriptionCart.items,
             onLogout: handleLogout,
             theme,
             onToggleTheme: () => setTheme(isDarkMode ? "light" : "dark"),
             onSetTheme: (newTheme) => setTheme(newTheme),
           })}

          {isLoggedIn && onSearchPage ? (
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
          ) : null}
        </div>
      </main>

      <footer className="site-footer">
        <div className="container">© 2026 ReStockOffice</div>
      </footer>

      {isLoggedIn ? (
        <SubscriptionDialog
          items={subscriptionCart.items}
          product={selectedProduct}
          selectedItem={selectedSubscriptionItem}
          open={activeSubscriptionLayer === "dialog"}
          onClose={resetSubscriptionLayer}
          onSelectItem={handleEditSubscriptionItem}
          onOpenOverview={openSubscriptionOverview}
          onConfirm={async ({ quantity, intervalCount }) => {
            if (!selectedProduct) {
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

            resetSubscriptionLayer();
            } catch (error) {
              console.error(error);
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Das Abo konnte nicht gespeichert werden.",
              );
            } finally {
              setIsSavingSubscription(false);
            }
          }}
        />
      ) : null}
      <Toaster position="bottom-center" />
    </div>
  );
}
