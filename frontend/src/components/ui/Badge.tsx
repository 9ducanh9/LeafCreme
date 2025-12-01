// Badge component for labels like "Best Seller"
import { HTMLAttributes, ReactNode } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
}

export default function Badge({ children, className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-block px-3 py-1 text-xs font-medium bg-accent-yellow text-text-primary rounded-md ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}

