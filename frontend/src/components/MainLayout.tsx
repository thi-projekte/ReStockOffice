import { NavLink, Outlet } from "react-router-dom";

export function MainLayout() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container site-header__inner">
          <div className="site-logo"> ReStockOffice </div>

          <nav aria-label="Hauptnavigation" className="site-nav">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/search">Suche</NavLink>
            <NavLink to="/cart">Warenkorb</NavLink>
            <NavLink to="/login">Login</NavLink>
          </nav>
        </div>
      </header>

      <main className="site-main">
        <div className="container">
          <Outlet />
        </div>
      </main>

      <footer className="site-footer">
        <div className="container">ReStockOffice - Einfaches SPA-Grundgerüst</div>
      </footer>
    </div>
  );
}
