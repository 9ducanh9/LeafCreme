// Christmas snowflakes animation for Leafie chat
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
    // Create 20 snowflakes (fewer for better performance)
    const flakes: Snowflake[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDuration: 4 + Math.random() * 5, // 4-9 seconds
      animationDelay: Math.random() * 3,
      size: 6 + Math.random() * 6, // 6-12px
      opacity: 0.2 + Math.random() * 0.3, // 0.2-0.5 (subtle)
    }))
    setSnowflakes(flakes)
  }, [])

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
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

