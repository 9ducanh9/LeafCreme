// HeroBanner 

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Button from '../ui/Button'
import { getImageUrl } from '../../utils/getImageUrl'

type HeroSlide = {
  id: number
  imageUrl: string
  title: string
  subtitle: string
  ctaLabel: string
  ctaPath: string
}

const slides: HeroSlide[] = [
  {
    id: 1,
    // Use a real local gift-box photo until a purpose-shot bakery hero photo is available.
    imageUrl: getImageUrl('giftboxes/3_Hộp_Quà_Cảm_Ơn.jpg'),
    title: 'Gift boxes that speak for you.',
    subtitle:
      'Set quà tặng gọn, đẹp, đủ ngọt ngào để thay lời chúc trong mọi dịp nhỏ – từ cảm ơn, sinh nhật đến kỷ niệm.',
    ctaLabel: 'Chọn set quà tặng',
    ctaPath: '/gift-boxes',
  },
]

const SLIDE_INTERVAL = 5000

export default function HeroBanner() {
  const navigate = useNavigate()
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length)
    }, SLIDE_INTERVAL)

    return () => window.clearInterval(id)
  }, [])

  return (
    <section className="relative w-full">
      {/* Image + dark overlay */}
      <div className="relative w-full h-[380px] md:h-[460px] lg:h-[560px] overflow-hidden">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === activeIndex ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            <img
              src={slide.imageUrl}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
            {/* Left-to-right scrim keeps the text block legible while letting
                the photo read clean and unobstructed on the right. */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent md:from-black/60 md:via-black/20 md:to-transparent" />
          </div>
        ))}

        {/* Text overlay trực tiếp trên ảnh */}
        <div className="absolute inset-0">
          <div className="max-w-[1440px] h-full mx-auto px-4 md:px-6 flex items-center">
            <div className="max-w-md lg:max-w-lg">
              <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight text-[#FDFBF7] leading-tight">
                {slides[activeIndex].title}
              </h1>
              <p className="mt-4 text-base md:text-lg text-[#E8E5DD]">
                {slides[activeIndex].subtitle}
              </p>
              <Button
                variant="primary"
                className="mt-6 inline-flex items-center gap-2 shadow-lg hover:shadow-xl"
                onClick={() => navigate(slides[activeIndex].ctaPath)}
              >
                {slides[activeIndex].ctaLabel}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dots điều hướng */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 mt-3 mb-4 flex justify-center md:justify-start">
        <div className="flex items-center gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-2 w-2 rounded-full border-2 border-[#D4A574] transition-all duration-300 ${
                index === activeIndex ? 'bg-gradient-to-br from-[#C59B72] to-[#D4A574] opacity-100 scale-110 shadow-md' : 'opacity-60 bg-transparent'
              }`}
              style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
              aria-label={`Chuyển đến slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
