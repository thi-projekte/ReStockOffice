import styles from './FeaturesSection.module.css'

const features = [
  {
    icon: <AutoIcon />,
    title: 'Automatische Nachbestellung',
    points: [
      'Lagerstand wird laufend überwacht',
      'Bestellung erfolgt bei Unterschreitung des Mindestbestands',
      'Keine manuelle Eingriffe notwendig',
    ],
  },
  {
    icon: <DashboardIcon />,
    title: 'Übersichtliches Dashboard',
    points: [
      'Alle Artikel auf einen Blick',
      'Status je Produkt in Echtzeit',
      'Bestellhistorie & Auswertungen',
    ],
  },
  {
    icon: <SupplierIcon />,
    title: 'Flexible Lieferantenanbindung',
    points: [
      'Mehrere Lieferanten gleichzeitig',
      'Preisvergleich automatisiert',
      'Eigene Verträge bleiben erhalten',
    ],
  },
  {
    icon: <TeamIcon />,
    title: 'Teamverwaltung',
    points: [
      'Rollen & Berechtigungen',
      'Freigabeprozesse konfigurierbar',
      'Abteilungsweises Budgetmanagement',
    ],
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className={styles.section}>
      <div className="container">
        <div className={styles.header}>
          <span className={styles.label}>Vorteile</span>
          <h2 className={styles.title}>Alles, was Ihr Büro braucht</h2>
          <p className={styles.subtitle}>
            Von der Bestandsüberwachung bis zur Lieferung –
            ReStockOffice übernimmt den gesamten Prozess.
          </p>
        </div>
        <ul className={styles.grid}>
          {features.map((f) => (
            <li key={f.title} className={styles.card}>
              <div className={styles.iconWrap}>{f.icon}</div>
              <h3 className={styles.cardTitle}>{f.title}</h3>
              <ul className={styles.points}>
                {f.points.map((p) => (
                  <li key={p} className={styles.point}>
                    <span className={styles.dot} />
                    {p}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function AutoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <path d="M14 4v4M14 20v4M4 14h4M20 14h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="14" cy="14" r="6" stroke="currentColor" strokeWidth="2"/>
      <circle cx="14" cy="14" r="2.5" fill="currentColor"/>
    </svg>
  )
}

function DashboardIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <rect x="4" y="4" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2"/>
      <rect x="16" y="4" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2"/>
      <rect x="4" y="16" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2"/>
      <rect x="16" y="16" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2"/>
    </svg>
  )
}

function SupplierIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <path d="M4 8h14l3 8H7L4 8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      <circle cx="10" cy="20" r="2" stroke="currentColor" strokeWidth="2"/>
      <circle cx="19" cy="20" r="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M4 5H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function TeamIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="2"/>
      <path d="M3 24c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="21" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
      <path d="M25 24c0-3.314-1.79-6-4-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}
