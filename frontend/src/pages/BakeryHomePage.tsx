// Bakery Homepage - combines all sections
import { useEffect, useRef, type ReactNode } from 'react'
import HeroBanner from '../components/bakery/HeroBanner'
import HalloweenSpecials from '../components/bakery/HalloweenSpecials'
import BestSellers from '../components/bakery/BestSellers'
import ProductCategories from '../components/bakery/ProductCategories'
import IntroMessage from '../components/bakery/IntroMessage'
import Button from '../components/ui/Button'
import { useLeafieContext } from '../contexts/LeafieContext'

function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    element.classList.add('halloween-reveal-pending')
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        element.classList.remove('halloween-reveal-pending')
        element.classList.add('halloween-reveal-visible')
        observer.disconnect()
      }
    }, { threshold: 0, rootMargin: '0px 0px -24px 0px' })
    observer.observe(element)
    return () => {
      observer.disconnect()
      element.classList.remove('halloween-reveal-pending', 'halloween-reveal-visible')
    }
  }, [])
  return <div ref={ref} className="halloween-reveal">{children}</div>
}

export default function BakeryHomePage() {
  const { openChat } = useLeafieContext()
  return (
    <>
      <HeroBanner />
      <Reveal><HalloweenSpecials /></Reveal>
      <Reveal><BestSellers /></Reveal>
      <Reveal>
      <section className="halloween-leafie-band py-8 sm:py-10">
        <div className="mx-auto flex max-w-container flex-col items-start justify-between gap-5 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div><h2 className="text-2xl">Chọn bánh cùng Leafie nhé?</h2><p className="mt-2 text-sm text-fg-muted">Một người bạn nhỏ cho những cuộc hẹn ngọt ngào.</p></div>
          <Button variant="outline" onClick={openChat}>Hỏi Leafie</Button>
        </div>
      </section>
      </Reveal>
      <Reveal><ProductCategories /></Reveal>
      <Reveal><IntroMessage /></Reveal>
    </>
  )
}
