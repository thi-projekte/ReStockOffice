import { redirectToLogin, redirectToRegister } from '../keycloak'
import styles from './Header.module.css'

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <a href="/" className={styles.logo}>
          <img src="/logo.svg" alt="ReStockOffice" height={56} />
        </a>
        <nav className={styles.nav}>
          <a href="#features" className={styles.navLink}>Vorteile</a>
          <a href="#how-it-works" className={styles.navLink}>So funktioniert's</a>
          <button className="btn-outline" onClick={redirectToLogin}>Anmelden</button>
          <button className="btn-primary" onClick={redirectToRegister}>Kostenlos starten</button>
        </nav>
      </div>
    </header>
  )
}
