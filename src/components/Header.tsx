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
]

export default function Header() {
  const [auth, setAuth] = useState<{ authenticated: boolean; name?: string; email?: string } | null>(null)

  useEffect(() => {
    getAuthState().then(setAuth)
  }, [])

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a href="/" className={styles.logo}>
          <img src="/logo.svg" alt="ReStockOffice" height={160} />
        </a>
        <nav className={styles.nav}>
          {NAV_LINKS.map(({ href, label }) => (
            <a key={href} href={href} className={styles.navLink}>{label}</a>
          ))}
          {auth === null ? (
            <div className={styles.authPlaceholder} />
          ) : auth.authenticated ? (
            <>
              <span className={styles.userName}>
                {auth.name ?? auth.email ?? 'Angemeldet'}
              </span>
              <button className="btn-outline" onClick={logout}>Abmelden</button>
            </>
          ) : (
            <>
              <button className="btn-outline" onClick={redirectToLogin}>Anmelden</button>
              <button className="btn-primary" onClick={redirectToRegister}>Registrieren</button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
