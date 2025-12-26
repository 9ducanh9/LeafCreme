// Bakery Homepage - combines all sections
import HeroBanner from '../components/bakery/HeroBanner'
import ChristmasMiniSection from '../components/bakery/ChristmasMiniSection'
import BestSellers from '../components/bakery/BestSellers'
import ProductCategories from '../components/bakery/ProductCategories'
import IntroMessage from '../components/bakery/IntroMessage'

export default function BakeryHomePage() {
  return (
    <>
      {/* Hero full-width (ảnh nền) */}
      <HeroBanner />

      {/* Christmas Mini Section - Subtle seasonal content */}
      <ChristmasMiniSection />

      {/* Các block phía dưới: best sellers, categories, intro */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-8 md:py-12 space-y-12 md:space-y-16">
        <BestSellers />
        <ProductCategories />
        <IntroMessage />
      </div>
    </>
  )
}
