import { useEffect, useState } from 'react'

const HERO_SLIDES = [
  { src: '/banners/leaf-creme-01.jpg', alt: 'Leaf Crème - bánh ngọt thủ công' },
  { src: '/banners/leaf-creme-02.jpg', alt: 'Câu chuyện về Leaf Crème' },
  { src: '/banners/leaf-creme-03.jpg', alt: 'Thông điệp của Leaf Crème' },
  { src: '/banners/leaf-creme-04.jpg', alt: 'Những món bánh của Leaf Crème' },
  { src: '/banners/leaf-creme-05.jpg', alt: 'Không gian ấm áp của Leaf Crème' },
  { src: '/banners/leaf-creme-06.jpg', alt: 'Lý do chọn Leaf Crème' },
  { src: '/banners/leaf-creme-07.jpg', alt: 'Đặt bánh cùng Leaf Crème' },
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
    <section className="relative isolate overflow-hidden bg-[#fff7ef]" aria-roledescription="carousel" aria-label="Câu chuyện Leaf Crème">
      <div className="relative aspect-video w-full">
        {HERO_SLIDES.map((slide, index) => {
          const isActive = index === activeSlide

          return (
            <img
              key={slide.src}
              src={slide.src}
              alt={isActive ? slide.alt : ''}
              aria-hidden={!isActive}
              width="1920"
              height="1080"
              fetchPriority={index === 0 ? 'high' : 'auto'}
              className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ease-out ${
                isActive ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )
        })}

        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 sm:bottom-6" aria-hidden="true">
          {HERO_SLIDES.map((slide, index) => (
            <span key={slide.src} className={`h-1.5 rounded-full transition-all duration-300 ${index === activeSlide ? 'w-7 bg-[#ef2942]' : 'w-1.5 bg-[#ef2942]/45'}`} />
          ))}
        </div>
      </div>
    </section>
  )
}
