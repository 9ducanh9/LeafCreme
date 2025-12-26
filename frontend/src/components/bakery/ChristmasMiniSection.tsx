// Christmas Mini Section - Subtle seasonal content below hero
import { useState } from 'react'

interface ChristmasCard {
  id: number
  imageUrl: string
  quote: string
}

const christmasCards: ChristmasCard[] = [
  {
    id: 1,
    // Placeholder: Christmas bakery gift box - replace with actual image
    imageUrl: 'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=800&q=80',
    quote: 'Giáng sinh này, trao nhau điều ngọt ngào.',
  },
  {
    id: 2,
    // Placeholder: Pastries with warm fairy lights - replace with actual image
    imageUrl: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=800&q=80',
    quote: 'Một hộp bánh nhỏ, đủ cho cả mùa yêu thương.',
  },
  {
    id: 3,
    // Placeholder: Cookies/cake in cozy winter lighting - replace with actual image
    imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80',
    quote: 'December tastes a little sweeter.',
  },
]

export default function ChristmasMiniSection() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)

  return (
    <section className="w-full bg-[#FAFAF7] py-12 md:py-16 relative overflow-hidden">
      {/* Subtle floating sparkles - barely visible */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/4 left-1/4 text-[#C59B72] opacity-[0.15] text-lg animate-pulse"
          style={{
            animation: 'float-sparkle 12s ease-in-out infinite',
            animationDelay: '0s',
          }}
        >
          ✨
        </div>
        <div
          className="absolute top-1/2 right-1/3 text-[#C59B72] opacity-[0.12] text-sm animate-pulse"
          style={{
            animation: 'float-sparkle 15s ease-in-out infinite',
            animationDelay: '3s',
          }}
        >
          ❄
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {christmasCards.map((card) => (
            <div
              key={card.id}
              className="relative group"
              onMouseEnter={() => setHoveredCard(card.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Image Card */}
              <div className="relative rounded-[16px] overflow-hidden shadow-[0_4px_16px_rgba(197,155,114,0.08)] bg-white">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={card.imageUrl}
                    alt=""
                    className={`w-full h-full object-cover transition-all duration-[1000ms] ease-in-out ${
                      hoveredCard === card.id ? 'brightness-[1.06]' : 'brightness-100'
                    }`}
                    onError={(e) => {
                      // Fallback to a neutral bakery image if URL fails
                      const target = e.target as HTMLImageElement
                      target.src = 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=800'
                    }}
                  />
                  {/* Gradient overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                </div>

                {/* Quote Text - Overlay at bottom */}
                <div
                  className={`absolute bottom-0 left-0 right-0 p-4 md:p-6 transition-opacity duration-[1000ms] ease-in-out ${
                    hoveredCard === card.id ? 'opacity-100' : 'opacity-90'
                  }`}
                >
                  <p className="font-heading text-sm md:text-base text-[#FDFBF7] leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                    {card.quote}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes float-sparkle {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.1;
          }
          25% {
            transform: translateY(-10px) translateX(5px);
            opacity: 0.15;
          }
          50% {
            transform: translateY(-5px) translateX(-5px);
            opacity: 0.12;
          }
          75% {
            transform: translateY(-15px) translateX(3px);
            opacity: 0.15;
          }
        }
      `}</style>
    </section>
  )
}

