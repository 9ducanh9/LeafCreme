// Generic seasonal card-grid section, driven by the active season's
// `miniSection.cards` (see config/seasons.ts). Replaces the old
// ChristmasMiniSection, which was the same layout hardcoded to Christmas
// copy/images.
import { useState } from 'react'
import { getImageUrl } from '../../utils/getImageUrl'
import { SeasonMiniCard } from '../../config/seasons'

interface SeasonalMiniSectionProps {
  cards: SeasonMiniCard[]
}

export default function SeasonalMiniSection({ cards }: SeasonalMiniSectionProps) {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)

  return (
    <section className="w-full bg-[#FAFAF7] py-12 md:py-16 relative overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {cards.map((card) => (
            <div
              key={card.id}
              className="relative group"
              onMouseEnter={() => setHoveredCard(card.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="relative rounded-[16px] overflow-hidden shadow-[0_4px_16px_rgba(197,155,114,0.08)] bg-white">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={getImageUrl(card.imageUrl)}
                    alt=""
                    className={`w-full h-full object-cover transition-all duration-[1000ms] ease-in-out ${
                      hoveredCard === card.id ? 'brightness-[1.06]' : 'brightness-100'
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                </div>

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
    </section>
  )
}
