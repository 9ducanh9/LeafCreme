// Reusable card component with bakery theme - uses design tokens
import { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export default function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-gradient-to-br from-[#FFFEF9] to-[#FFF5E6] border-2 border-[#D4A574]/30 rounded-card p-6 shadow-sm hover:shadow-md transition-all ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

