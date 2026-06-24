import styles from "./LegalPage.module.css";
import Header from "../components/Header.tsx";
import Footer from "../components/Footer.tsx";

export default function ContactPage() {
  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.title}>Kontakt</h1>
          <p className={styles.lead}>
            Dieses Projekt ist ein studentisches Demonstrationsprojekt im Rahmen
            einer universitären Lehrveranstaltung. Es handelt sich nicht um
            einen kommerziellen Online-Shop.
          </p>

          <div className={styles.body}>
            <section className={styles.section}>
              <h2 className={styles.h2}>Kontaktmöglichkeiten</h2>
              <p>Für Fragen oder Feedback erreichst du uns unter:</p>
              <div className={styles.contactRow}>
                <p>
                  E-Mail:
                  {" "}
                  <a href="mailto:support@restockoffice.de">support@restockoffice.de</a>
                </p>
                <p>Telefon: +49 000 000000 (Demo-Nummer)</p>
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.h2}>Hinweis</h2>
              <div className={styles.infoBox}>
                Anfragen werden im Rahmen des studentischen Projekts bearbeitet.
                Es besteht kein Anspruch auf verbindliche geschäftliche
                Kommunikation.
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
