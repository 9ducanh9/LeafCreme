// HeroBanner 

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Button from '../ui/Button'

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
    imageUrl:
      'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=1600',
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
      <div className="relative w-full h-[280px] md:h-[340px] lg:h-[400px] overflow-hidden">
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
            {/* overlay chung giúp chữ dễ đọc, không cần box trắng */}
            <div className="absolute inset-0 bg-black/40" />
          </div>
        ))}

        {/* Text overlay trực tiếp trên ảnh */}
        <div className="absolute inset-0">
          <div className="max-w-[1440px] h-full mx-auto px-4 md:px-6 flex items-center">
            <div className="max-w-md">
              <h1 className="font-heading text-2xl md:text-3xl font-medium tracking-tight text-[#FDFBF7] leading-tight">
                {slides[activeIndex].title}
              </h1>
              <p className="mt-3 text-sm md:text-base text-[#E8E5DD]">
                {slides[activeIndex].subtitle}
              </p>
              <Button
                variant="primary"
                className="mt-4 inline-flex items-center gap-2"
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
              className={`h-2 w-2 rounded-full border border-accent-brown transition-all duration-300 ${
                index === activeIndex ? 'bg-accent-brown opacity-100 scale-110' : 'opacity-60'
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
