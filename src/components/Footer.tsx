import styles from './Footer.module.css'

const PAYMENT_METHODS = [
  { label: 'Apple Pay',   icon: <ApplePayIcon /> },
  { label: 'PayPal',      icon: <PayPalIcon /> },
  { label: 'Klarna',      icon: <KlarnaIcon /> },
  { label: 'Kreditkarte', icon: <CreditCardIcon /> },
]

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.payments}>
          {PAYMENT_METHODS.map(({ label, icon }) => (
            <div key={label} className={styles.paymentBadge} aria-label={label}>
              {icon}
            </div>
          ))}
        </div>
        <p className={styles.copy}>© {year} ReStockOffice</p>
      </div>
    </footer>
  )
}

function ApplePayIcon() {
  return (
    <svg width="64" height="38" viewBox="0 0 64 38" fill="none" aria-hidden>
      <rect width="64" height="38" rx="6" fill="#000"/>
      <path d="M20.5 13.2c.7-.9 1.2-2 1.1-3.2-1.1.1-2.4.7-3.2 1.6-.7.8-1.3 2-1.1 3.1 1.2.1 2.4-.5 3.2-1.5Z" fill="#fff"/>
      <path d="M21.6 14.8c-1.8-.1-3.3 1-4.1 1-.9 0-2.2-1-3.6-.9-1.8 0-3.5 1.1-4.5 2.7-1.9 3.3-.5 8.2 1.4 10.9.9 1.4 2 2.8 3.5 2.7 1.4 0 1.9-.9 3.6-.9s2.1.9 3.6.9c1.5 0 2.5-1.3 3.4-2.7 1-1.5 1.5-2.9 1.5-3 0 0-2.9-1.1-2.9-4.3 0-2.7 2.2-4 2.3-4-1.2-1.9-3.1-2.3-4.2-2.4Z" fill="#fff"/>
      <text x="46" y="24" fill="#fff" fontSize="12" fontWeight="600" fontFamily="system-ui, sans-serif" textAnchor="middle">Pay</text>
    </svg>
  )
}

function PayPalIcon() {
  return (
    <svg width="64" height="38" viewBox="0 0 64 38" fill="none" aria-hidden>
      <rect width="64" height="38" rx="6" fill="#fff" stroke="#e6e6e6"/>
      <text x="32" y="24" fill="#003087" fontSize="13" fontWeight="800" fontFamily="system-ui, sans-serif" textAnchor="middle">PayPal</text>
    </svg>
  )
}

function KlarnaIcon() {
  return (
    <svg width="64" height="38" viewBox="0 0 64 38" fill="none" aria-hidden>
      <rect width="64" height="38" rx="6" fill="#FFB3C7"/>
      <text x="32" y="24" fill="#0A0A0A" fontSize="13" fontWeight="700" fontFamily="system-ui, sans-serif" textAnchor="middle">Klarna</text>
    </svg>
  )
}

function CreditCardIcon() {
  return (
    <svg width="64" height="38" viewBox="0 0 64 38" fill="none" aria-hidden>
      <rect width="64" height="38" rx="6" fill="#fff" stroke="#e6e6e6"/>
      <circle cx="36" cy="19" r="8" fill="#F79E1B"/>
      <circle cx="28" cy="19" r="8" fill="#EB001B" opacity="0.9"/>
      <path d="M32 12.8a8 8 0 0 1 0 12.4A8 8 0 0 1 32 12.8Z" fill="#FF5F00"/>
    </svg>
  )
}
