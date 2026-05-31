import { lazy, Suspense } from 'react'
import Header from '../components/Header'
import HeroSection from '../components/HeroSection'

const FeaturesSection   = lazy(() => import('../components/FeaturesSection'))
const RestockerSection  = lazy(() => import('../components/RestockerSection'))
const HowItWorksSection = lazy(() => import('../components/HowItWorksSection'))
const Footer            = lazy(() => import('../components/Footer'))

export default function LandingPage() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <Suspense fallback={null}>
          <FeaturesSection />
          <HowItWorksSection />
          <RestockerSection />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </>
  )
}
