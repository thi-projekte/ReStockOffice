import { redirectToRegister } from '../keycloak'
import styles from './CtaSection.module.css'

export default function CtaSection() {
  return (
    <section className={styles.section}>
      <div className={`container ${styles.inner}`}>
        <h2 className={styles.title}>
          Starten Sie noch heute!<br />
        </h2>
        <p className={styles.subtitle}>
          30 Tage gratis testen. Kein Risiko, keine Kreditkarte.
        </p>
        <button className={styles.cta} onClick={redirectToRegister}>
          Jetzt registrieren
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path d="M3 9h12M10 5l5 4-5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </section>
  )
}
