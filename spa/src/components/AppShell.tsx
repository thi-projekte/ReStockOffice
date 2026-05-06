import { type ReactNode, useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  FaBars,
  FaChevronRight,
  FaHome,
  FaMoon,
  FaSearch,
  FaShoppingCart,
  FaSlidersH,
  FaSun,
  FaTimes,
  FaUser,
} from "react-icons/fa";
import { MdLogin, MdLogout } from "react-icons/md";
import toast, { Toaster } from "react-hot-toast";
import iconColored from "../assets/logos/icon_colored.png";
import { useSubscriptionCart } from "../hooks/useSubscriptionCart";
import { getProducts } from "../services/products";
import { authenticateUser } from "../services/users";
import type {
  LoginFormData,
  Product,
  SubscriptionProductItem,
} from "../types/shop";
import { ProductGrid } from "./ProductGrid";
import { SubscriptionDialog } from "./SubscriptionDialog";

interface AppShellProps {
  children: (context: {
    isLoggedIn: boolean;
    onLogin: (formData: LoginFormData) => Promise<void>;
    onAddToSubscription: (product: Product) => void;
    onOpenSubscriptionOverview: () => void;
    onEditSubscriptionItem: (item: SubscriptionProductItem) => void;
    subscriptionItems: SubscriptionProductItem[];
  }) => ReactNode;
}

type ActiveSubscriptionLayer = "overview" | "dialog" | null;

export function AppShell({ children }: AppShellProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [query, setQuery] = useState("");
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);
  const [selectedArticleType, setSelectedArticleType] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [isHeaderAssistOpen, setIsHeaderAssistOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeSubscriptionLayer, setActiveSubscriptionLayer] =
    useState<ActiveSubscriptionLayer>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSubscriptionItem, setSelectedSubscriptionItem] =
    useState<SubscriptionProductItem | undefined>(undefined);
  const subscriptionCart = useSubscriptionCart();
  const location = useLocation();
  const navigate = useNavigate();
  const headerSearchRef = useRef<HTMLDivElement | null>(null);

  const articleTypeOptions = Array.from(
    new Set(products.map((product) => product.article_type)),
  ).sort((a, b) => a.localeCompare(b, "de"));
  const articleTypeBrandMap = new Map(
    articleTypeOptions.map((articleType) => [
      articleType,
      Array.from(
        new Set(
          products
            .filter((product) => product.article_type === articleType)
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
            !selectedArticleType || product.article_type === selectedArticleType,
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
      [product.name, product.description, product.article_type, product.brand]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    const matchesArticleType =
      !selectedArticleType || product.article_type === selectedArticleType;
    const matchesBrand = !selectedBrand || product.brand === selectedBrand;

    return matchesText && matchesArticleType && matchesBrand;
  });

  async function handleLogin(formData: LoginFormData) {
    const user = await authenticateUser(formData);

    if (!user) {
      throw new Error("Ungültige Zugangsdaten.");
    }

    setIsLoggedIn(true);
    navigate("/");
  }

  function resetSubscriptionLayer() {
    setActiveSubscriptionLayer(null);
    setSelectedProduct(null);
    setSelectedSubscriptionItem(undefined);
  }

  function handleLogout() {
    setIsLoggedIn(false);
    resetSubscriptionLayer();
    navigate("/login");
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

  function handleEditSubscriptionItem(item: SubscriptionProductItem) {
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
    if (!isLoggedIn && location.pathname !== "/login") {
      navigate("/login", { replace: true });
      return;
    }

    if (isLoggedIn && location.pathname === "/login") {
      navigate("/", { replace: true });
    }
  }, [isLoggedIn, location.pathname, navigate]);

  useEffect(() => {
    setMenuOpen(false);
    setIsHeaderAssistOpen(false);
  }, [location.pathname]);

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

  const onSearchPage = location.pathname === "/search";
  const isDarkMode = theme === "dark";

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
                  location.pathname !== "/search"
                ) {
                  navigate("/search");
                }
              }}
              aria-label="Artikel oder Kategorie suchen"
            />

            <button
              className="search-inline-button"
              type="button"
              onClick={() => {
                if (location.pathname !== "/search") {
                  navigate("/search");
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

                    if (location.pathname !== "/search") {
                      navigate("/search");
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

                      if (location.pathname !== "/search") {
                        navigate("/search");
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

          {isLoggedIn ? (
            <div className="header-search" ref={headerSearchRef}>
              {renderSearchControls("header")}
            </div>
          ) : null}

          <div className="header-actions">
            {isLoggedIn ? (
              <NavLink
                className="button button--ghost nav-btn"
                to="/"
                title="Startseite"
              >
                <FaHome />
              </NavLink>
            ) : null}

            {isLoggedIn ? (
              <NavLink
                className="button button--ghost nav-btn"
                to="/subscription"
                title="Abo-Übersicht"
                aria-label="Abo-Übersicht"
              >
                <FaShoppingCart />
              </NavLink>
            ) : null}

            {isLoggedIn ? (
              <NavLink
                className="button button--ghost nav-btn"
                to="/account"
                title="Konto"
                aria-label="Konto"
              >
                <FaUser />
              </NavLink>
            ) : (
              <NavLink className="button button--ghost" to="/login" title="Login">
                <MdLogin />
              </NavLink>
            )}

            {isLoggedIn ? (
              <button
                className="button button--ghost nav-btn"
                type="button"
                onClick={handleLogout}
                title="Abmelden"
                aria-label="Abmelden"
              >
                <MdLogout />
              </button>
            ) : null}

            <button
              className="button button--ghost theme-toggle nav-btn"
              type="button"
              onClick={() => setTheme(isDarkMode ? "light" : "dark")}
              aria-label={
                isDarkMode ? "Hellmodus aktivieren" : "Dunkelmodus aktivieren"
              }
              title={isDarkMode ? "Hellmodus" : "Dunkelmodus"}
            >
              {isDarkMode ? <FaSun /> : <FaMoon />}
            </button>

            {isLoggedIn ? (
              <button
                className="button button--ghost hamburger-btn"
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
              >
                {menuOpen ? <FaTimes /> : <FaBars />}
              </button>
            ) : null}
          </div>
        </div>
        {isLoggedIn && menuOpen ? (
          <nav className="mobile-nav" aria-label="Mobile Navigation">
            <div className="container mobile-nav__inner">
              <NavLink
                className="mobile-nav__link"
                to="/"
                onClick={() => setMenuOpen(false)}
              >
                <FaHome /> Startseite
              </NavLink>
              <NavLink
                className="mobile-nav__link"
                to="/search"
                onClick={() => setMenuOpen(false)}
              >
                <FaSearch /> Suche
              </NavLink>
              <NavLink
                className="mobile-nav__link"
                to="/account#orders"
                onClick={() => setMenuOpen(false)}
              >
                <FaShoppingCart /> Aboverwaltung
              </NavLink>
              <NavLink
                className="mobile-nav__link"
                to="/account"
                onClick={() => setMenuOpen(false)}
              >
                <FaUser /> Konto
              </NavLink>
              <button
                className="mobile-nav__link mobile-nav__btn"
                type="button"
                onClick={() => setTheme(isDarkMode ? "light" : "dark")}
              >
                {isDarkMode ? <FaSun /> : <FaMoon />}
                {isDarkMode ? "Hellmodus" : "Dunkelmodus"}
              </button>
              <button
                className="mobile-nav__link mobile-nav__btn"
                type="button"
                onClick={handleLogout}
              >
                <MdLogout /> Abmelden
              </button>
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
            onLogin: handleLogin,
            onAddToSubscription: handleAddToSubscription,
            onOpenSubscriptionOverview: openSubscriptionOverview,
            onEditSubscriptionItem: handleEditSubscriptionItem,
            subscriptionItems: subscriptionCart.items,
          })}

          {isLoggedIn && onSearchPage ? (
            <section className="page-card section-space">
              <div className="section-head">
                <div>
                  <h2>Artikel</h2>
                  <p>Alle verfügbaren Produkte</p>
                </div>

                {renderSearchControls("page")}
              </div>

              <ProductGrid
                products={filteredProducts}
                onAdd={handleAddToSubscription}
              />
            </section>
          ) : null}
        </div>
      </main>

      <footer className="site-footer">
        <div className="container">ReStockOffice - Simple in Stock</div>
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
          onConfirm={({ quantity, intervalCount }) => {
            if (!selectedProduct) {
              return;
            }

            const action = subscriptionCart.addOrUpdateItem({
              product: selectedProduct,
              quantity,
              intervalCount,
            });

            toast.success(
              action === "updated"
                ? `${selectedProduct.name} wurde im Abo aktualisiert`
                : `${selectedProduct.name} wurde zum Abo hinzugefügt`,
            );

            resetSubscriptionLayer()
          }}
        />
      ) : null}
      <Toaster position="bottom-center" />
    </div>
  );
}
