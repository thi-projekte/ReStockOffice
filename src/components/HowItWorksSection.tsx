import styles from './HowItWorksSection.module.css'

type Step = {
  number: string
  title: string
  description: string
}

const steps: Step[] = [
  {
    number: '01',
    title: 'Konto erstellen',
    description: 'Registrierung in unter 2 Minuten. Keine Kreditkarte, keine Vertragsbindung.',
  },
  {
    number: '02',
    title: 'Artikel & Mindestbestände einrichten',
    description: 'Legen Sie Ihre Büroartikel an und definieren Sie, ab wann nachbestellt werden soll.',
  },
  {
    number: '03',
    title: 'Lieferant verbinden',
    description: 'Anbindung an Ihren bevorzugten Lieferanten – oder nutzen Sie unsere Partnernetzwerk.',
  },
  {
    number: '04',
    title: 'Fertig – ReStockOffice übernimmt',
    description: 'Das System überwacht Ihre Bestände und löst Bestellungen automatisch und rechtzeitig aus.',
  },
]

const lastIndex = steps.length - 1

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className={styles.section}>
      <div className="container">
        <div className={styles.header}>
          <span className={styles.label}>So funktioniert's</span>
          <h2 className={styles.title}>In vier Schritten startklar</h2>
        </div>
        <ol className={styles.steps}>
          {steps.map((step, i) => (
            <li key={step.number} className={styles.step}>
              <div className={styles.stepNumber}>{step.number}</div>
              {i < lastIndex && <div className={styles.connector} aria-hidden />}
              <div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
