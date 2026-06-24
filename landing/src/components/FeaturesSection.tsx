import type { ComponentType } from "react";
import styles from "./FeaturesSection.module.css";

interface Feature {
  icon: ComponentType;
  title: string;
  points: string[];
}

const features: Feature[] = [
  {
    icon: AboIcon,
    title: "Abo-Bestellungen",
    points: [
      "Artikel einmalig auswählen und Intervall festlegen",
      "Automatische Lieferung ohne manuelles Nachbestellen",
    ],
  },
  {
    icon: DeliveryIcon,
    title: "Zuverlässige Lieferung",
    points: [
      "Lieferankündigung 2 Tage vor dem Liefertermin",
      "Restocker bringt die Ware direkt ins Büro",
      "Bestätigung per Mail nach erfolgreicher Lieferung",
    ],
  },
  {
    icon: OverviewIcon,
    title: "Übersicht & Transparenz",
    points: [
      "Alle aktiven Abos auf einen Blick",
      "Bevorstehende Lieferungen im Dashboard",
      "Vollständige Lieferhistorie abrufbar",
    ],
  },
  {
    icon: AccountIcon,
    title: "Einfache Kontoverwaltung",
    points: [
      "Öffnungszeiten hinterlegen für die Lieferung",
      "Abos jederzeit einsehbar",
      "Benachrichtigungen per Mail inklusive",
    ],
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className={styles.section}>
      <div className="container">
        <div className={styles.header}>
          <span className={styles.label}>Vorteile</span>
          <h2 className={styles.title}>Büromaterial auf Autopilot</h2>
          <p className={styles.subtitle}>
            Einmal abonnieren – ReStockOffice kümmert sich um den Rest.
          </p>
        </div>
        <ul className={styles.grid}>
          {features.map(({ icon: Icon, title, points }) => (
            <li key={title} className={styles.card}>
              <div className={styles.iconWrap}><Icon /></div>
              <h3 className={styles.cardTitle}>{title}</h3>
              <ul className={styles.points}>
                {points.map(p => (
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
  );
}

function AboIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <path d="M14 4v4M14 20v4M4 14h4M20 14h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="14" cy="14" r="6" stroke="currentColor" strokeWidth="2" />
      <circle cx="14" cy="14" r="2.5" fill="currentColor" />
    </svg>
  );
}

function DeliveryIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <path d="M4 8h14l3 8H7L4 8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="10" cy="20" r="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="19" cy="20" r="2" stroke="currentColor" strokeWidth="2" />
      <path d="M4 5H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function OverviewIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <rect x="4" y="4" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="16" y="4" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="4" y="16" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="16" y="16" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <circle cx="14" cy="10" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M6 24c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
