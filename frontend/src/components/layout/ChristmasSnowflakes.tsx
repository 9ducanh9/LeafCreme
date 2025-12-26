// Global Christmas snowflakes for entire site
import { useEffect, useState } from 'react'

interface Snowflake {
  id: number
  left: number
  animationDuration: number
  animationDelay: number
  size: number
  opacity: number
}

export default function ChristmasSnowflakes() {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([])

  useEffect(() => {
    // Create 25 snowflakes for full site
    const flakes: Snowflake[] = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDuration: 5 + Math.random() * 6, // 5-11 seconds
      animationDelay: Math.random() * 4,
      size: 8 + Math.random() * 8, // 8-16px
      opacity: 0.15 + Math.random() * 0.25, // 0.15-0.4 (subtle)
    }))
    setSnowflakes(flakes)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute top-0 text-[#C59B72]"
          style={{
            left: `${flake.left}%`,
            fontSize: `${flake.size}px`,
            opacity: flake.opacity,
            animation: `snowfall ${flake.animationDuration}s linear infinite`,
            animationDelay: `${flake.animationDelay}s`,
          }}
        >
          ❄
        </div>
      ))}
      <style>{`
        @keyframes snowfall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

