import { type ReactNode, useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import iconColored from "../assets/logos/icon_colored.png";
import { CartDrawer } from "./CartDrawer";
import { ProductGrid } from "./ProductGrid";
import { useCart } from "../hooks/useCart";
import type { LoginFormData } from "../types/shop";
import { authenticateUser } from "../services/authService";
import { productMocks } from "../services/productService";

// Icons
import { FaHome, FaShoppingCart, FaSearch, FaUser } from "react-icons/fa";
import { MdLogin } from "react-icons/md";



interface AppShellProps {
  children: (context: {
    isLoggedIn: boolean;
    onLogin: (formData: LoginFormData) => void;
  }) => ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [query, setQuery] = useState("");
  const cart = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const normalizedQuery = query.trim().toLowerCase();
  const filteredProducts = !normalizedQuery
    ? productMocks
    : productMocks.filter((product) =>
        [product.name, product.description, product.article_type, product.brand]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      );

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

  useEffect(() => {
    if (!isLoggedIn && location.pathname !== "/login") {
      navigate("/login", { replace: true });
      return;
    }

    if (isLoggedIn && location.pathname === "/login") {
      navigate("/", { replace: true });
    }
  }, [isLoggedIn, location.pathname, navigate]);

  const onSearchPage = location.pathname === "/search";

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

          <div className="header-actions">
            {isLoggedIn ? (
              <NavLink className="button button--ghost" to="/" title={"Startseite"}>
                <FaHome />
              </NavLink>
            ) : null}

            {isLoggedIn ? (
              <NavLink className="button button--ghost" to="/search" title={"Suche"}>
                <FaSearch />
              </NavLink>
            ) : null}

            {isLoggedIn ? (
              <button
                className="button button--ghost"
                type="button"
                onClick={() => setCartOpen(true)}
                title="Warenkorb"
              >
                <FaShoppingCart/> ({cart.totalItems})
              </button>
            ) : null}

            {isLoggedIn ? (
              <button className="button button--ghost" type="button" onClick={handleLogout} title="Konto">
                <FaUser />
              </button>
            ) : (
              <NavLink className="button button--ghost" to="/login" title={"Login"}>
                <MdLogin/>
              </NavLink>
            )}
          </div>
        </div>
      </header>

      <main className="site-main">
        <div className="container">
          {children({ isLoggedIn, onLogin: handleLogin })}

          {isLoggedIn && onSearchPage ? (
            <section className="page-card section-space">
              <div className="section-head">
                <div>
                  <h2>Artikel</h2>
                  <p>Alle verfügbaren Produkte</p>
                </div>

                <input
                  className="search-input"
                  type="search"
                  placeholder="Artikel oder Kategorie suchen"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
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
