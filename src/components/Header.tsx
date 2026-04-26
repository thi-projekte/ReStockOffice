import { redirectToLogin, redirectToRegister } from '../keycloak'
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
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <a href="/" className={styles.logo}>
          <img src="/logo.svg" alt="ReStockOffice" height={56} />
        </a>
        <nav className={styles.nav}>
          {NAV_LINKS.map(({ href, label }) => (
            <a key={href} href={href} className={styles.navLink}>{label}</a>
          ))}
          <button className="btn-outline" onClick={redirectToLogin}>Anmelden</button>
          <button className="btn-primary" onClick={redirectToRegister}>Registrieren</button>
        </nav>
      </div>
    </header>
  )
}
