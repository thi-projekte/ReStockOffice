import Footer from '../components/Footer'
import Header from '../components/Header'
import styles from './LegalPage.module.css'

type LegalPageProps = {
  title: string
  body: string
}

export default function LegalPage({ title, body }: LegalPageProps) {
  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.title}>{title}</h1>
          <div className={styles.body}>{body}</div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
