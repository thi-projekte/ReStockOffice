import { redirectToRegister } from '../keycloak'
import styles from './HeroSection.module.css'

export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <h1 className={styles.headline}>
          Die moderne Lösung für Officesupplies,<br />
          <span className={styles.accent}>smart in stock!</span>
        </h1>

        <div className={styles.scene}>
          <BuildingIllustration />
          <img
            src="/logo-icon.svg"
            alt=""
            className={styles.bird}
            aria-hidden
          />
        </div>

        <button className={styles.cta} onClick={redirectToRegister}>
          Jetzt registrieren
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M4 10h12M11 5l6 5-6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <p className={styles.trust}>Kostenlos testen · Keine Kreditkarte · DSGVO-konform</p>
      </div>
    </section>
  )
}

function BuildingIllustration() {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={styles.building}
      aria-hidden
    >
      {/* Sky background */}
      <rect width="400" height="300" rx="16" fill="#f2f8f6"/>

      {/* Main office tower */}
      <rect x="130" y="60" width="140" height="220" rx="4" fill="#2B7A6A"/>
      {/* Tower highlight */}
      <rect x="130" y="60" width="10" height="220" fill="#3d9e8a" opacity="0.4"/>

      {/* Windows – tower */}
      {[0,1,2,3,4,5].map(row =>
        [0,1,2,3].map(col => (
          <rect
            key={`w-${row}-${col}`}
            x={148 + col * 28}
            y={80 + row * 32}
            width={16}
            height={20}
            rx="2"
            fill={row === 5 && col === 3 ? '#3EB89A' : row % 2 === col % 2 ? '#a8d8cc' : '#d4ede8'}
          />
        ))
      )}

      {/* Side building left */}
      <rect x="60" y="120" width="75" height="160" rx="3" fill="#3d8c7a"/>
      {[0,1,2,3].map(row =>
        [0,1].map(col => (
          <rect
            key={`wl-${row}-${col}`}
            x={74 + col * 26}
            y={135 + row * 34}
            width={14}
            height={18}
            rx="2"
            fill={row % 2 === col % 2 ? '#c0dfd8' : '#e2f0ec'}
          />
        ))
      )}

      {/* Side building right */}
      <rect x="265" y="140" width="75" height="140" rx="3" fill="#3d8c7a"/>
      {[0,1,2].map(row =>
        [0,1].map(col => (
          <rect
            key={`wr-${row}-${col}`}
            x={279 + col * 26}
            y={155 + row * 34}
            width={14}
            height={18}
            rx="2"
            fill={row % 2 === col % 2 ? '#c0dfd8' : '#e2f0ec'}
          />
        ))
      )}

      {/* Ground */}
      <rect x="40" y="278" width="320" height="22" rx="4" fill="#2B7A6A" opacity="0.15"/>

      {/* Entrance door */}
      <rect x="183" y="240" width="34" height="40" rx="3" fill="#1f5e50"/>
      <circle cx="211" cy="261" r="2.5" fill="#3EB89A"/>

      {/* Roof detail */}
      <rect x="130" y="52" width="140" height="12" rx="3" fill="#1f5e50"/>
      <rect x="185" y="40" width="30" height="14" rx="2" fill="#1f5e50"/>
    </svg>
  )
}
