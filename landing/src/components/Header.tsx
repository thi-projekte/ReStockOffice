import { useEffect, useState } from 'react'
import { getAuthState, logout, redirectToLogin, redirectToRegister } from '../keycloak'
import styles from './Header.module.css'

type NavLink = {
  href: string
  label: string
}

const NAV_LINKS: NavLink[] = [
  { href: '#features',    label: 'Vorteile' },
  { href: '#how-it-works', label: "So funktioniert's" },
  { href: 'https://app.restockoffice.de', label: 'Produkte' },
]

export default function Header() {
  const [auth, setAuth] = useState<{ authenticated: boolean; name?: string; email?: string } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    getAuthState().then(setAuth)
  }, [])

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a href="/" className={styles.logo}>
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="ReStockOffice" className={styles.logoImg} />
        </a>
        <button
          type="button"
          className={styles.menuButton}
          aria-label={menuOpen ? 'Menü schließen' : 'Menü öffnen'}
          aria-expanded={menuOpen}
          aria-controls="header-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav
          id="header-navigation"
          className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}
        >
          <div className={styles.navActions}>
            {auth === null ? (
              <div className={styles.authPlaceholder} />
            ) : auth.authenticated ? (
              <>
                <span className={styles.userName}>
                  {auth.name ?? auth.email ?? 'Angemeldet'}
                </span>
                <a href="https://app.restockoffice.de" className="btn-primary" onClick={closeMenu}>Zur App</a>
                <button className="btn-outline" onClick={() => { closeMenu(); logout() }}>Abmelden</button>
              </>
            ) : (
              <>
                <button className="btn-outline" onClick={() => { closeMenu(); redirectToLogin() }}>Anmelden</button>
                <button className="btn-primary" onClick={() => { closeMenu(); redirectToRegister() }}>Registrieren</button>
              </>
            )}
          </div>
          <div className={styles.navLinks}>
            {NAV_LINKS.map(({ href, label }) => (
              <a key={href} href={href} className={styles.navLink} onClick={closeMenu}>{label}</a>
            ))}
          </div>
        </nav>
      </div>
    </header>
  )
}
