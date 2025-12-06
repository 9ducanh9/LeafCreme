// Reusable card component with bakery theme - uses design tokens
import { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export default function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-surface-warm border border-border-warm rounded-card p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

