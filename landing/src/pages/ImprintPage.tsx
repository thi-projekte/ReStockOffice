import styles from "./LegalPage.module.css";
import Header from "../components/Header.tsx";
import Footer from "../components/Footer.tsx";

export default function ImprintPage() {
  return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <div className={styles.content}>
            <h1 className={styles.title}>Impressum</h1>

            <div className={styles.body}>
              <section className={styles.section}>
                <h2 className={styles.h2}>Angaben gemäß § 5 TMG</h2>
                <div className={styles.contactRow}>
                  <p>Max Mustermann</p>
                  <p>Studentisches Projekt der Technischen Hochschule Ingolstadt</p>
                  <p>
                    Esplanade 10<br />
                    85049 Ingolstadt<br />
                    Deutschland
                  </p>
                  <p>
                    E-Mail:{" "}
                    <a href="mailto:support@restockoffice.de">support@restockoffice.de</a>
                  </p>
                </div>
              </section>

              <section className={styles.section}>
                <h2 className={styles.h2}>Verantwortlich für den Inhalt</h2>
                <p>nach § 18 Abs. 2 MStV</p>
                <div className={styles.contactRow}>
                  <p>
                    Max Mustermann <br />
                    Esplanade 10 <br />
                    85049 Ingolstadt
                  </p>
                </div>
              </section>

              <section className={styles.section}>
                <h2 className={styles.h2}>Hinweis</h2>
                <div className={styles.infoBox}>
                  Diese Website ist ein studentisches Projekt im Rahmen einer
                  Lehrveranstaltung an der Technischen Hochschule Ingolstadt. Es
                  handelt sich nicht um einen kommerziellen Online-Shop. Es werden
                  keine rechtsverbindlichen Kaufverträge abgeschlossen.
                </div>
              </section>
            </div>
          </div>
        </main>
        <Footer />
      </div>
  );
}