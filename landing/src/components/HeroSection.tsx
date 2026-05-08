import { memo, useEffect, useRef } from 'react'
import { redirectToRegister } from '../keycloak'
import styles from './HeroSection.module.css'

export default function HeroSection() {
  const birdRef = useRef<HTMLImageElement>(null)
  const btnRef  = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const bird = birdRef.current
    const btn  = btnRef.current
    if (!bird || !btn) return

   
    const id = setTimeout(() => {
      const bR  = bird.getBoundingClientRect()
      const bR2 = btn.getBoundingClientRect()

      // Vogel landet am linken Rand des Buttons (Vogel-Mitte = Button-Oberkante links)
      const tx = bR2.left - (bR.left + bR.width / 2)
      const ty = bR2.top  - (bR.top  + bR.height / 2)

       
      bird.animate(
        [
          { transform: 'translate(0px,0px) rotate(0deg) scale(1)',
            easing: 'ease-in' },

          { transform: `translate(${tx*0.12}px,${-ty*0.18}px) rotate(-11deg) scale(1.04)`,
            offset: 0.22, easing: 'ease-in-out' },

          { transform: `translate(${tx*0.35}px,${-ty*0.20}px) rotate(-6deg) scale(1.03)`,
            offset: 0.38, easing: 'ease-in-out' },

          { transform: `translate(${tx*0.50}px,${-ty*0.10}px) rotate(-1deg) scale(1.01)`,
            offset: 0.50, easing: 'ease-in-out' },

          { transform: `translate(${tx*0.64}px,${ty*0.28}px) rotate(3deg) scale(0.99)`,
            offset: 0.62, easing: 'ease-in-out' },

          { transform: `translate(${tx*0.83}px,${ty*0.80}px) rotate(3deg) scale(0.96)`,
            offset: 0.76, easing: 'ease-out' },

          { transform: `translate(${tx}px,${ty+4}px) rotate(1deg) scale(0.94)`,
            offset: 0.84, easing: 'ease-out' },

          { transform: `translate(${tx}px,${ty-1}px) rotate(0deg) scale(0.94)`,
            offset: 0.90, easing: 'ease-in-out' },

          { transform: `translate(${tx}px,${ty}px) rotate(0deg) scale(0.94)` },
        ],
        { duration: 5500, fill: 'forwards' }
      )
    }, 150)

    return () => clearTimeout(id)
  }, [])

  return (
    <section className={styles.hero}>
      <div className={styles.inner}>

        {/* LEFT: Bürogebäude + Vogel */}
        <div className={styles.scene}>
          <BuildingIllustration />
          <img
            ref={birdRef}
            src={`${import.meta.env.BASE_URL}logo-icon.svg`}
            alt=""
            className={styles.bird}
            aria-hidden
          />
        </div>

        {/* RIGHT: Titel + Button */}
        <div className={styles.content}>
          <h1 className={styles.headline}>
            Die moderne Lösung für<br />
            Officesupplies,<br />
            <span className={styles.accent}>Bleibe mit uns smart in stock!</span>
          </h1>

          <button ref={btnRef} className={styles.cta} onClick={redirectToRegister}>
            Jetzt registrieren
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M4 10h12M11 5l6 5-6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <p className={styles.trust}>Kostenlos testen · DSGVO-konform</p>
        </div>

      </div>
    </section>
  )
}

const BuildingIllustration = memo(function BuildingIllustration() {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={styles.building}
      aria-hidden
    >
      <rect x="130" y="60" width="140" height="220" rx="4" fill="#2B7A6A"/>
      <rect x="130" y="60" width="10" height="220" fill="#3d9e8a" opacity="0.4"/>
      {[0,1,2,3,4,5].map(row =>
        [0,1,2,3].map(col => (
          <rect
            key={`w-${row}-${col}`}
            x={148 + col * 28} y={80 + row * 32}
            width={16} height={20} rx="2"
            fill={row === 5 && col === 3 ? '#3EB89A' : row % 2 === col % 2 ? '#a8d8cc' : '#d4ede8'}
          />
        ))
      )}
      <rect x="60" y="120" width="75" height="160" rx="3" fill="#3d8c7a"/>
      {[0,1,2,3].map(row =>
        [0,1].map(col => (
          <rect
            key={`wl-${row}-${col}`}
            x={74 + col * 26} y={135 + row * 34}
            width={14} height={18} rx="2"
            fill={row % 2 === col % 2 ? '#c0dfd8' : '#e2f0ec'}
          />
        ))
      )}
      <rect x="265" y="140" width="75" height="140" rx="3" fill="#3d8c7a"/>
      {[0,1,2].map(row =>
        [0,1].map(col => (
          <rect
            key={`wr-${row}-${col}`}
            x={279 + col * 26} y={155 + row * 34}
            width={14} height={18} rx="2"
            fill={row % 2 === col % 2 ? '#c0dfd8' : '#e2f0ec'}
          />
        ))
      )}
      <rect x="40" y="278" width="320" height="22" rx="4" fill="#2B7A6A" opacity="0.15"/>
      <rect x="183" y="240" width="34" height="40" rx="3" fill="#1f5e50"/>
      <circle cx="211" cy="261" r="2.5" fill="#3EB89A"/>
      <rect x="130" y="52" width="140" height="12" rx="3" fill="#1f5e50"/>
      <rect x="185" y="40" width="30" height="14" rx="2" fill="#1f5e50"/>
    </svg>
  )
})
