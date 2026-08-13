// Bakery Homepage - combines all sections
import HeroBanner from '../components/bakery/HeroBanner'
import BestSellers from '../components/bakery/BestSellers'
import ProductCategories from '../components/bakery/ProductCategories'
import IntroMessage from '../components/bakery/IntroMessage'

export default function BakeryHomePage() {
  return (
    <>
      <HeroBanner />
      <BestSellers />
      <ProductCategories />
      <IntroMessage />
    </>
  )
}
