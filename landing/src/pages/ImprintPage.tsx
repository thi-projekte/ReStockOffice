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

                <p><strong>Angaben gemäß § 5 TMG</strong></p>

                <p>
                  Max Mustermann<br/>
                  Studentisches Projekt der Technischen Hochschule Ingolstadt<br/>
                  Musterstraße 1<br/>
                  12345 Musterstadt<br/>
                  Deutschland
                </p>

                <p>
                  E-Mail: restockoffice@info.de
                </p>

                <p><strong>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</strong></p>

                <p>
                  Max Mustermann<br/>
                  Musterstraße 1<br/>
                  12345 Musterstadt
                </p>



                <h2>Hinweis</h2>

                <p>
                  Diese Website ist ein studentisches Projekt im Rahmen einer Lehrveranstaltung an der
                  Technischen Hochschule Ingolstadt. Es handelt sich nicht um einen kommerziellen Online-Shop.
                  Es werden keine rechtsverbindlichen Kaufverträge abgeschlossen.
                </p>

              </div>
            </main>
            <Footer/>
          </div>
  )

}
