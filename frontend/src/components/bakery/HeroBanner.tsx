// Hero banner with auto-rotating carousel and fade transitions
import { useState, useEffect } from 'react'
import Button from '../ui/Button'

interface HeroSlide {
  image: string
  heading: string
  subtext: string
  ctaText: string
}

const slides: HeroSlide[] = [
  {
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1440&q=80',
    heading: 'Leaf Creme for calm, light moments.',
    subtext: 'Những khoảnh khắc ngọt ngào, nhẹ nhàng từ bếp Leaf Creme.',
    ctaText: 'Xem bộ sưu tập hôm nay',
  },
  {
    image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=1440&q=80',
    heading: 'Premium cakes, everyday moments.',
    subtext: 'Bánh ngọt cao cấp cho mọi khoảnh khắc đặc biệt.',
    ctaText: 'Khám phá ngay',
  },
  {
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=1440&q=80',
    heading: 'From Saigon, with love.',
    subtext: 'Từ Sài Gòn, với tình yêu và sự tận tâm.',
    ctaText: 'Xem bộ sưu tập hôm nay',
  },
]

export default function HeroBanner() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const handleDotClick = (index: number) => {
    setCurrentIndex(index)
  }

  return (
    <section className="relative w-full h-[400px] overflow-hidden">
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-200 ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={slide.image}
            alt={slide.heading}
            className="w-full h-full object-cover"
          />
          
          {/* Overlay content */}
          {index === currentIndex && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-surface/95 backdrop-blur-sm border border-border rounded-card p-8 max-w-md text-center">
                <h1 className="font-heading text-3xl font-semibold text-text-primary mb-3">
                  {slide.heading}
                </h1>
                <p className="text-text-secondary mb-6">
                  {slide.subtext}
                </p>
                <Button variant="primary">
                  {slide.ctaText}
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Dot indicators */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => handleDotClick(index)}
            className={`w-2 h-2 rounded-full transition-default ${
              index === currentIndex
                ? 'bg-accent-brown'
                : 'bg-white/50 hover:bg-white/70'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  )
}

