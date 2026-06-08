import LandingPage from './pages/LandingPage'
import ContactPage from './pages/ContactPage'
import ImprintPage from './pages/ImprintPage'
import TermsPrivacyPage from './pages/TermsPrivacyPage'

export default function App() {
  const path = window.location.pathname

  if (path === '/kontakt') {
    return <ContactPage />
  }

  if (path === '/impressum') {
    return <ImprintPage />
  }

  if (path === '/agb-datenschutz') {
    return <TermsPrivacyPage />
  }

  return <LandingPage />
}
