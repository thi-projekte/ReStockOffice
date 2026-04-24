import { type ReactNode, useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import iconColored from "../assets/logos/icon_colored.png";
import { CartDrawer } from "./CartDrawer";
import { ProductGrid } from "./ProductGrid";
import { useCart } from "../hooks/useCart";
import type { LoginFormData, Product } from "../types/shop";
import { authenticateUser } from "../services/authService";
import { productMocks } from "../services/productService";

// Icons
import { FaHome, FaShoppingCart, FaSearch, FaUser, FaBars, FaTimes, FaMoon, FaSun, FaSlidersH, FaChevronRight } from "react-icons/fa";
import { MdLogin, MdLogout } from "react-icons/md";



interface AppShellProps {
  children: (context: {
    isLoggedIn: boolean;
    onLogin: (formData: LoginFormData) => void;
    onAddToCart: (product: Product) => void;
  }) => ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [query, setQuery] = useState("");
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);
  const [selectedArticleType, setSelectedArticleType] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [isHeaderAssistOpen, setIsHeaderAssistOpen] = useState(false);
  const cart = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const headerSearchRef = useRef<HTMLDivElement | null>(null);

  const articleTypeOptions = Array.from(new Set(productMocks.map((product) => product.article_type))).sort((a, b) =>
    a.localeCompare(b, "de"),
  );
  const articleTypeBrandMap = new Map(
    articleTypeOptions.map((articleType) => [
      articleType,
      Array.from(new Set(productMocks.filter((product) => product.article_type === articleType).map((product) => product.brand))).sort((a, b) =>
        a.localeCompare(b, "de"),
      ),
    ]),
  );
  const brandOptions = Array.from(
    new Set(
      productMocks
        .filter((product) => !selectedArticleType || product.article_type === selectedArticleType)
        .map((product) => product.brand),
    ),
  ).sort((a, b) => a.localeCompare(b, "de"));

  const normalizedQuery = query.trim().toLowerCase();
  const queryLength = query.trim().length;
  const quickArticleTypeMatches = normalizedQuery
    ? articleTypeOptions.filter((articleType) => articleType.toLowerCase().includes(normalizedQuery)).slice(0, 6)
    : [];
  const hasBrands = (articleType: string) => (articleTypeBrandMap.get(articleType)?.length ?? 0) > 1;
  const activeAssistArticleType =
    quickArticleTypeMatches.includes(selectedArticleType) && hasBrands(selectedArticleType) ? selectedArticleType : "";
  const quickBrandMatches = activeAssistArticleType
    ? (articleTypeBrandMap.get(activeAssistArticleType) ?? []).slice(0, 6)
    : [];
  const filteredProducts = productMocks.filter((product) => {
    const matchesText =
      !normalizedQuery ||
      [product.name, product.description, product.article_type, product.brand]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    const matchesArticleType = !selectedArticleType || product.article_type === selectedArticleType;
    const matchesBrand = !selectedBrand || product.brand === selectedBrand;

    return matchesText && matchesArticleType && matchesBrand;
  });

  function handleLogin(formData: LoginFormData) {
    const user = authenticateUser(formData);

    if (!user) {
      throw new Error("Ungültige Zugangsdaten.");
    }

    setIsLoggedIn(true);
    navigate("/");
  }

  function handleLogout() {
    setIsLoggedIn(false);
    setCartOpen(false);
    navigate("/login");
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

    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
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
    const showQuickAssist = isHeader && isHeaderAssistOpen && queryLength >= 2 && quickArticleTypeMatches.length > 0;
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

                if (event.key === "Enter" && queryLength >= 2 && location.pathname !== "/search") {
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
              aria-label={isAdvancedSearch ? "Erweiterte Suche schließen" : "Erweiterte Suche öffnen"}
              title={isAdvancedSearch ? "Erweiterte Suche schließen" : "Erweiterte Suche öffnen"}
            >
              <FaSlidersH />
              <span>Erweitert</span>
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
                  {hasBrands(articleType) ? <FaChevronRight className="search-quick-row__arrow" aria-hidden="true" /> : null}
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
              <option value="">Alle Unterkategorien</option>
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
              <NavLink to={isLoggedIn ? "/" : "/login"} className="logo-link" title="ReStockOffice - Startseite">
                <div className="brand-block">
                  <img className="brand-block__logo" src={iconColored} alt="ReStockOffice" />
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
              <NavLink className="button button--ghost nav-btn" to="/" title="Startseite">
                <FaHome />
              </NavLink>
            ) : null}

            {isLoggedIn ? (
              <button
                className={`button button--ghost cart-btn ${cartOpen ? "active" : ""}`}
                type="button"
                onClick={() => setCartOpen(!cartOpen)}
                title="Warenkorb"
              >
                <FaShoppingCart />
                {cart.totalItems > 0 && (
                  <span className="cart-badge">{cart.totalItems}</span>
                )}
              </button>
            ) : null}

            {isLoggedIn ? (
              <NavLink className="button button--ghost nav-btn" to="/account" title="Konto" aria-label="Konto">
                <FaUser />
              </NavLink>
            ) : (
              <NavLink className="button button--ghost" to="/login" title="Login">
                <MdLogin />
              </NavLink>
            )}

            {isLoggedIn ? (
              <button className="button button--ghost nav-btn" type="button" onClick={handleLogout} title="Abmelden" aria-label="Abmelden">
                <MdLogout />
              </button>
            ) : null}

            <button
              className="button button--ghost theme-toggle nav-btn"
              type="button"
              onClick={() => setTheme(isDarkMode ? "light" : "dark")}
              aria-label={isDarkMode ? "Hellmodus aktivieren" : "Dunkelmodus aktivieren"}
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
              <NavLink className="mobile-nav__link" to="/" onClick={() => setMenuOpen(false)}>
                <FaHome /> Startseite
              </NavLink>
              <NavLink className="mobile-nav__link" to="/search" onClick={() => setMenuOpen(false)}>
                <FaSearch /> Suche
              </NavLink>
              <NavLink className="mobile-nav__link" to="/account" onClick={() => setMenuOpen(false)}>
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
          {children({ isLoggedIn, onLogin: handleLogin, onAddToCart: cart.add })}

          {isLoggedIn && onSearchPage ? (
            <section className="page-card section-space">
              <div className="section-head">
                <div>
                  <h2>Artikel</h2>
                  <p>Alle verfügbaren Produkte</p>
                </div>

                {renderSearchControls("page")}
              </div>

              <ProductGrid products={filteredProducts} onAdd={cart.add} />
            </section>
          ) : null}
        </div>
      </main>

      <footer className="site-footer">
        <div className="container">ReStockOffice - Simple in Stock</div>
      </footer>

      {isLoggedIn ? (
        <CartDrawer
          items={cart.items}
          totalPrice={cart.totalPrice}
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          onRemove={cart.remove}
          onUpdateQuantity={cart.updateQuantity}
        />
      ) : null}
    </div>
  );
}
