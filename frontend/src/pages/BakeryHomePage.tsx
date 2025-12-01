// Bakery Homepage - combines all sections
import Header from '../components/bakery/Header'
import HeroBanner from '../components/bakery/HeroBanner'
import BestSellers from '../components/bakery/BestSellers'
import ProductCategories from '../components/bakery/ProductCategories'
import IntroMessage from '../components/bakery/IntroMessage'
import Footer from '../components/bakery/Footer'

export default function BakeryHomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroBanner />
        <BestSellers />
        <ProductCategories />
        <IntroMessage />
      </main>
      <Footer />
    </div>
  )
}

