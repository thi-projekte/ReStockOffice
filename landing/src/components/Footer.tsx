import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <a className={styles.link} href="/kontakt">Kontakt</a>
        <a className={styles.link} href="/impressum">Impressum</a>
        <a className={styles.link} href="/rechtliches">Rechtliche Hinweise</a>
        <p className={styles.copy}>
          ReStockOffice
          {"\u00A9"}
          2026
        </p>
      </div>
    </footer>
  );
}
