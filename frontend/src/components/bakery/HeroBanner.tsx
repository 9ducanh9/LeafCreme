// HeroBanner 

import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import Button from '../ui/Button'

type HeroSlide = {
  id: number
  imageUrl: string
  title: string
  subtitle: string
  ctaLabel: string
}

const slides: HeroSlide[] = [
  {
    id: 1,
    imageUrl:
      'https://images.pexels.com/photos/4109990/pexels-photo-4109990.jpeg?auto=compress&cs=tinysrgb&w=1600',
    title: 'From Saigon, with calm sweetness.',
    subtitle: 'Từ Sài Gòn, với vị ngọt nhẹ nhàng cho những phút nghỉ ngắn.',
    ctaLabel: 'Xem bộ sưu tập hôm nay',
  },
  {
    id: 2,
    imageUrl:
      'https://images.pexels.com/photos/4109993/pexels-photo-4109993.jpeg?auto=compress&cs=tinysrgb&w=1600',
    title: 'Mousse & cheesecake for small celebrations.',
    subtitle: 'Những chiếc bánh nhỏ, đủ để chia sẻ trong một buổi hẹn nhẹ nhàng.',
    ctaLabel: 'Xem dòng mousse & cheesecake',
  },
  {
    id: 3,
    imageUrl:
      'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=1600',
    title: 'Gift boxes for quiet celebrations.',
    subtitle: 'Hộp quà nhỏ, dành cho những lời chúc nhẹ nhàng mà chân thành.',
    ctaLabel: 'Xem các set quà tặng',
  },
]

const SLIDE_INTERVAL = 5000

export default function HeroBanner() {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length)
    }, SLIDE_INTERVAL)

    return () => window.clearInterval(id)
  }, [])

  return (
    <section className="relative w-full bg-black">
      {/* Image + dark overlay */}
      <div className="relative w-full h-[220px] md:h-[260px] lg:h-[300px] overflow-hidden">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-200 ${
              index === activeIndex ? 'opacity-100' : 'opacity-0'
            }`}
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
              <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight text-[#FDFBF7]">
                {slides[activeIndex].title}
              </h1>
              <p className="mt-3 text-sm md:text-base text-[#E8E5DD]">
                {slides[activeIndex].subtitle}
              </p>
              <Button
                variant="primary"
                className="mt-4 inline-flex items-center gap-2"
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
              className={`h-2 w-2 rounded-full border border-accent-brown transition-opacity duration-150 ${
                index === activeIndex ? 'bg-accent-brown opacity-100' : 'opacity-60'
              }`}
              aria-label={`Chuyển đến slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
