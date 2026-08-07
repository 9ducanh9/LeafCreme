// Generic full-site floating-emoji decoration, driven by the active season
// (see config/seasons.ts). Replaces the old ChristmasSnowflakes component,
// which was the same visual treatment hardcoded to one emoji/color.
import { useEffect, useState } from 'react'

interface FloatingItem {
  id: number
  left: number
  animationDuration: number
  animationDelay: number
  size: number
  opacity: number
}

interface FloatingEmojiOverlayProps {
  emoji: string
  color: string
  count?: number
}

export default function FloatingEmojiOverlay({ emoji, color, count = 20 }: FloatingEmojiOverlayProps) {
  const [items, setItems] = useState<FloatingItem[]>([])

  useEffect(() => {
    const generated: FloatingItem[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDuration: 5 + Math.random() * 6, // 5-11s
      animationDelay: Math.random() * 4,
      size: 8 + Math.random() * 8, // 8-16px
      opacity: 0.15 + Math.random() * 0.25, // subtle, matches previous tuning
    }))
    setItems(generated)
  }, [count])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {items.map((item) => (
        <div
          key={item.id}
          className="absolute top-0"
          style={{
            left: `${item.left}%`,
            fontSize: `${item.size}px`,
            opacity: item.opacity,
            color,
            animation: `seasonal-fall ${item.animationDuration}s linear infinite`,
            animationDelay: `${item.animationDelay}s`,
          }}
        >
          {emoji}
        </div>
      ))}
      <style>{`
        @keyframes seasonal-fall {
          0% { transform: translateY(-100vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
