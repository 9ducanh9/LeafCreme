// Bakery Homepage - combines all sections
import HeroBanner from '../components/bakery/HeroBanner'
import SeasonalMiniSection from '../components/bakery/SeasonalMiniSection'
import BestSellers from '../components/bakery/BestSellers'
import ProductCategories from '../components/bakery/ProductCategories'
import IntroMessage from '../components/bakery/IntroMessage'
import { useActiveSeason } from '../hooks/useActiveSeason'

export default function BakeryHomePage() {
  const activeSeason = useActiveSeason()

  return (
    <>
      {/* Hero full-width (ảnh nền) */}
      <HeroBanner />

      {/* Evergreen by default — only renders when a season in config/seasons.ts matches today. */}
      {activeSeason?.miniSection && <SeasonalMiniSection cards={activeSeason.miniSection.cards} />}

      {/* Các block phía dưới: best sellers, categories, intro */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-8 md:py-12 space-y-12 md:space-y-16">
        <BestSellers />
        <ProductCategories />
        <IntroMessage />
      </div>
    </>
  )
}
