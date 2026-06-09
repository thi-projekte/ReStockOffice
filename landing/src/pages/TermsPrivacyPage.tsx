import styles from "./LegalPage.module.css";
import Header from "../components/Header.tsx";
import Footer from "../components/Footer.tsx";

export default function TermsPrivacyPage() {
  return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <div className={styles.content}>
            <span className={styles.eyebrow}>Rechtliches</span>
            <h1 className={styles.title}>AGBs & Datenschutz</h1>

            <div className={styles.body}>
              <section className={styles.section}>
                <h2 className={styles.h2}>Nutzungsbedingungen</h2>
                <div className={styles.infoBox}>
                  Diese Website ist ein studentisches Demonstrationsprojekt. Es
                  findet kein echter Verkauf statt und es werden keine
                  Kaufverträge geschlossen.
                </div>
                <ul>
                  <li>Alle dargestellten Produkte dienen ausschließlich Demonstrationszwecken.</li>
                  <li>Bestellungen oder Warenkörbe haben keinen rechtlichen Charakter.</li>
                  <li>Keine Gewähr für Vollständigkeit oder Richtigkeit der Inhalte.</li>
                </ul>
                <p>Mit der Nutzung der Website wird dieser Hinweis zur Kenntnis genommen.</p>
              </section>

              <section className={styles.section}>
                <h2 className={styles.h2}>Datenschutzerklärung</h2>
                <h3 className={styles.h3}>Allgemeine Hinweise</h3>
                <p>
                  Diese Website dient ausschließlich Demonstrations- und
                  Lehrzwecken im Rahmen eines studentischen Projekts. Der Schutz
                  Ihrer persönlichen Daten ist uns wichtig.
                </p>
              </section>

              <section className={styles.section}>
                <h3 className={styles.h3}>Datenerfassung beim Besuch der Website</h3>
                <p>Beim Aufruf der Website werden automatisch folgende Daten erfasst:</p>
                <ul>
                  <li>IP-Adresse</li>
                  <li>Datum und Uhrzeit des Zugriffs</li>
                  <li>Browsertyp und Version</li>
                  <li>Betriebssystem</li>
                </ul>
                <p>
                  Diese Daten dienen ausschließlich der technischen Bereitstellung
                  und Sicherheit der Website.
                </p>
              </section>

              <section className={styles.section}>
                <h2 className={styles.h2}>Kontaktaufnahme</h2>
                <p>
                  Bei Kontakt per E-Mail werden die angegebenen Daten nur zur
                  Bearbeitung der Anfrage verwendet.
                </p>
              </section>

              <section className={styles.section}>
                <h2 className={styles.h2}>Speicherdauer</h2>
                <p>
                  Personenbezogene Daten werden nur so lange gespeichert, wie es
                  für den jeweiligen Zweck erforderlich ist.
                </p>
              </section>

              <section className={styles.section}>
                <h2 className={styles.h2}>Ihre Rechte</h2>
                <p>
                  Sie haben das Recht auf Auskunft, Berichtigung, Löschung und
                  Einschränkung der Verarbeitung Ihrer Daten im Rahmen der
                  geltenden Datenschutzgesetze.
                </p>
              </section>
            </div>
          </div>
        </main>
        <Footer />
      </div>
  );
}