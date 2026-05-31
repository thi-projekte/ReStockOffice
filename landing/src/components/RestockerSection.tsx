import styles from './RestockerSection.module.css'

const CONTACT_MAIL = 'mim2665@thi.de'

const perks = [
  'Faire Vergütung: 7 € pro angefahrenem Unternehmen',
  'Keine Vorkenntnisse nötig – einfache App-Führung',
  'Stabile Routen durch wiederkehrende Abos',
]

const mailtoHref =
  `mailto:${CONTACT_MAIL}` +
  `?subject=${encodeURIComponent('Bewerbung als Restocker – ReStockOffice')}` +
  `&body=${encodeURIComponent('Hallo,\n\nich möchte mich als Restocker bei ReStockOffice bewerben.\n\nMein Name: \nMeine Verfügbarkeit: \nKurze Vorstellung: \n\nMit freundlichen Grüßen')}`

export default function RestockerSection() {
  return (
    <section id="restocker" className={styles.section}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.text}>
          <span className={styles.label}>Für Restocker</span>
          <h2 className={styles.title}>
            Du hältst Büros<br />
            <span className={styles.accent}>Smart in Stock</span>
          </h2>
          <p className={styles.desc}>
            Werde Teil des ReStockOffice-Teams und bring Büros in deiner Stadt
            auf den neuesten Stand – fair bezahlt, unkompliziert und mit
            einer App, die dich durch jeden Einsatz führt.
          </p>
          <ul className={styles.perks}>
            {perks.map((p) => (
              <li key={p} className={styles.perk}>
                <CheckIcon />
                {p}
              </li>
            ))}
          </ul>
          <a href={mailtoHref} className={styles.cta}>
            Jetzt als Restocker bewerben
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path d="M2 4h14v10H2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 4l7 6 7-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>

        <div className={styles.card}>
          <div className={styles.cardBadge}>Deine Vergütung</div>
          <div className={styles.earning}>
            <span className={styles.earningAmount}>7 €</span>
            <span className={styles.earningUnit}>pro Unternehmen</span>
          </div>
          <div className={styles.exampleBox}>
            <p className={styles.exampleLabel}>Beispielrechnung</p>
            <div className={styles.exampleRow}>
              <span>5 Unternehmen / Tag</span>
              <strong>35 €</strong>
            </div>
            <div className={styles.exampleRow}>
              <span>4 Tage / Woche</span>
              <strong>140 €</strong>
            </div>
            <div className={`${styles.exampleRow} ${styles.exampleTotal}`}>
              <span>Monatlich (ca.)</span>
              <strong>560 €</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden className={styles.checkIcon}>
      <circle cx="9" cy="9" r="9" fill="currentColor" opacity="0.15"/>
      <path d="M5 9l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
