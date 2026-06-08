import Footer from '../components/Footer'
import Header from '../components/Header'
import styles from './LegalPage.module.css'

type LegalPageProps = {
  title: string
}

export default function LegalPage({ title }: LegalPageProps) {
  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <div className={styles.content}>
          <span className={styles.eyebrow}>ReStockOffice</span>
          <h1 className={styles.title}>{title}</h1>
          <div className={styles.body} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
