import styles from "./LegalPage.module.css";
import Header from "../components/Header.tsx";
import Footer from "../components/Footer.tsx";

export default function ContactPage() {

  return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <div className={styles.content}>
            <h1>Kontakt</h1>

            <p>
              Dieses Projekt ist ein studentisches Demonstrationsprojekt im Rahmen einer universitären
              Lehrveranstaltung.
              Es handelt sich nicht um einen kommerziellen Online-Shop.
            </p>

            <h2>Kontaktmöglichkeiten</h2>

            <p>
              Für Fragen oder Feedback erreichst du uns unter:
            </p>

            <p>
              E-Mail: restockoffice@info.de<br/>
              Telefon: +49 123 456789 (Demo-Nummer)
            </p>

            <h2>Hinweis</h2>

            <p>
              Anfragen werden im Rahmen des studentischen Projekts bearbeitet. Es besteht kein Anspruch auf verbindliche
              geschäftliche Kommunikation.
            </p>

          </div>
        </main>
        <Footer/>
      </div>
  )
}
