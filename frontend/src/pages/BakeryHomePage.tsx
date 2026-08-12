// Bakery Homepage - combines all sections
import { Link } from 'react-router-dom'
import HeroBanner from '../components/bakery/HeroBanner'
import BestSellers from '../components/bakery/BestSellers'
import ProductCategories from '../components/bakery/ProductCategories'
import IntroMessage from '../components/bakery/IntroMessage'
import Container from '../components/layout/container'

export default function BakeryHomePage() {
  return (
    <>
      <section className="border-b border-border-subtle bg-bg-canvas py-3" aria-labelledby="leaf-creme-purpose">
        <Container>
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)] lg:items-center lg:gap-8">
            <div>
              <h1 id="leaf-creme-purpose" className="text-sm font-semibold text-fg-strong">Leaf Creme is an online bakery in Saigon.</h1>
              <p className="mt-1 text-sm text-fg-muted">Browse cakes and gift boxes, place orders, and track deliveries.</p>
            </div>
            <p className="text-xs leading-relaxed text-fg-muted">When you choose Sign in with Google, Leaf Creme uses your profile name, email, and public profile picture only to create or authenticate your account. See our <Link to="/privacy-policy" className="font-medium text-brand-fg underline underline-offset-4 hover:no-underline">Privacy Policy</Link>.</p>
          </div>
        </Container>
      </section>
      <HeroBanner />
      <BestSellers />
      <ProductCategories />
      <IntroMessage />
    </>
  )
}
