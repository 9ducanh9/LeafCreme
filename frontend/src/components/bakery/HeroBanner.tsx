import { useEffect, useState } from 'react'

const HERO_SLIDES = [
  { src: '/banners/leaf-creme-01.jpg', highResolutionSrc: '/banners/leaf-creme-01-4k.jpg', alt: 'Leaf Creme - bánh ngọt thủ công' },
  { src: '/banners/leaf-creme-02.jpg', highResolutionSrc: '/banners/leaf-creme-02-4k.jpg', alt: 'Câu chuyện về Leaf Creme' },
  { src: '/banners/leaf-creme-03.jpg', highResolutionSrc: '/banners/leaf-creme-03-4k.jpg', alt: 'Thông điệp của Leaf Creme' },
  { src: '/banners/leaf-creme-04.jpg', highResolutionSrc: '/banners/leaf-creme-04-4k.jpg', alt: 'Những món bánh của Leaf Creme' },
  { src: '/banners/leaf-creme-05.jpg', highResolutionSrc: '/banners/leaf-creme-05-4k.jpg', alt: 'Không gian ấm áp của Leaf Creme' },
  { src: '/banners/leaf-creme-06.jpg', highResolutionSrc: '/banners/leaf-creme-06-4k.jpg', alt: 'Lý do chọn Leaf Creme' },
  { src: '/banners/leaf-creme-07.jpg', highResolutionSrc: '/banners/leaf-creme-07-4k.jpg', alt: 'Đặt bánh cùng Leaf Creme' },
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
    <section className="relative isolate overflow-hidden bg-[#fff7ef]" aria-roledescription="carousel" aria-label="Câu chuyện Leaf Creme">
      <div className="relative aspect-video w-full lg:h-[calc(100svh-5rem)] lg:aspect-auto">
        {HERO_SLIDES.map((slide, index) => {
          const isActive = index === activeSlide

          return (
            <picture
              key={slide.src}
              aria-hidden={!isActive}
              className={`absolute inset-0 block size-full transition-opacity duration-700 ease-out ${
                isActive ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <source media="(min-resolution: 1.5dppx)" srcSet={slide.highResolutionSrc} />
              <img
                src={slide.src}
                alt={isActive ? slide.alt : ''}
                width="3840"
                height="2160"
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                className="size-full object-cover lg:object-contain"
              />
            </picture>
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
