// Bakery Homepage - combines all sections
import HeroBanner from '../components/bakery/HeroBanner'
import BestSellers from '../components/bakery/BestSellers'
import ProductCategories from '../components/bakery/ProductCategories'
import IntroMessage from '../components/bakery/IntroMessage'
import Button from '../components/ui/Button'
import { useLeafieContext } from '../contexts/LeafieContext'

export default function BakeryHomePage() {
  const { openChat } = useLeafieContext()
  return (
    <>
      <HeroBanner />
      <BestSellers />
      <section className="halloween-leafie-band py-8 sm:py-10">
        <div className="mx-auto flex max-w-container flex-col items-start justify-between gap-5 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div><h2 className="text-2xl">Chọn bánh cùng Leafie nhé?</h2><p className="mt-2 text-sm text-fg-muted">Một người bạn nhỏ cho những cuộc hẹn ngọt ngào.</p></div>
          <Button variant="outline" onClick={openChat}>Hỏi Leafie</Button>
        </div>
      </section>
      <ProductCategories />
      <IntroMessage />
    </>
  )
}
