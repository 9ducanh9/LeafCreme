import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import Button from '../ui/Button'
import { getImageUrl } from '../../utils/getImageUrl'

const HERO_SLIDES = [
  {
    src: getImageUrl('product/17_Bánh_kem_chocolate.jpg'),
    alt: 'Bánh kem chocolate phủ dâu tươi Leaf Crème',
  },
  {
    src: getImageUrl('product/3_Mousse_matcha_phô_mai.jpg'),
    alt: 'Bánh mousse matcha phô mai Leaf Crème',
  },
  {
    src: getImageUrl('product/10_Tiramisu_oreo.jpg'),
    alt: 'Tiramisu Oreo thủ công Leaf Crème',
  },
] as const

export default function HeroBanner() {
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveSlide((currentSlide) => (currentSlide + 1) % HERO_SLIDES.length)
    }, 5_000)

    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <section className="relative isolate overflow-hidden bg-[#2a1b13]" aria-roledescription="carousel" aria-label="Bộ sưu tập bánh Leaf Crème">
      <div className="relative min-h-[27rem] sm:min-h-[30rem] lg:min-h-[33rem]">
        <div className="absolute inset-y-0 right-0 w-full overflow-hidden lg:w-[58%]">
          {HERO_SLIDES.map((slide, index) => {
            const isActive = index === activeSlide

            return (
              <img
                key={slide.src}
                src={slide.src}
                alt={isActive ? slide.alt : ''}
                aria-hidden={!isActive}
                width="1600"
                height="900"
                fetchPriority={index === 0 ? 'high' : 'auto'}
                className={`absolute inset-0 size-full object-cover object-center transition-opacity duration-700 ease-out ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}
              />
            )
          })}
        </div>

        <div className="absolute inset-0 bg-gradient-to-r from-[#2a1b13] via-[#2a1b13]/95 to-[#2a1b13]/20 lg:via-[#2a1b13]/90 lg:to-transparent" />

        <div className="relative mx-auto flex min-h-[27rem] max-w-container items-center px-4 py-12 sm:min-h-[30rem] sm:px-6 lg:min-h-[33rem] lg:px-8">
          <div className="max-w-[36rem] [color:#fffaf2]">
            <p className="text-xs font-semibold uppercase tracking-caps text-[rgba(255,250,242,0.78)]">Bánh làm theo từng mẻ nhỏ</p>
            <h1 className="mt-4 max-w-[11.5ch] font-heading text-[clamp(2.75rem,3.6vw,4rem)] font-semibold leading-[0.98] tracking-[-0.04em]">Một chút ngọt ngào cho ngày của bạn.</h1>
            <p className="mt-6 max-w-[32rem] text-base leading-relaxed text-[rgba(255,250,242,0.84)] sm:text-lg">Những chiếc bánh và set quà được làm thủ công, vừa đủ để gửi một lời thương đến người quan trọng.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button href="/search" variant="primary" size="lg">
                Khám phá menu <ArrowRight className="size-5" />
              </Button>
              <Button href="/gift-boxes" variant="outline" size="lg" className="!border-[rgba(255,250,242,0.72)] !bg-transparent !text-[#fffaf2] hover:!bg-[rgba(255,250,242,0.12)]">
                Chọn hộp quà
              </Button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-7 right-7 flex gap-2" aria-hidden="true">
          {HERO_SLIDES.map((slide, index) => (
            <span key={slide.src} className={`h-1.5 rounded-full transition-all duration-300 ${index === activeSlide ? 'w-7 bg-[#fffaf2]' : 'w-1.5 bg-[rgba(255,250,242,0.55)]'}`} />
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand" />
    </section>
  )
}
