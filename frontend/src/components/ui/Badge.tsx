// Badge/Tag component - uses design tokens
import { HTMLAttributes, ReactNode } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  variant?: 'default' | 'yellow' | 'pink' | 'brown'
}

export default function Badge({ 
  children, 
  className = '', 
  variant = 'default',
  ...props 
}: BadgeProps) {
  const variantStyles = {
    default: 'bg-accent-yellow text-text-primary border border-accent-yellow',
    yellow: 'bg-accent-yellow text-text-primary border border-accent-yellow',
    pink: 'bg-accent-pink text-text-primary border border-accent-pink',
    brown: 'bg-accent-brown text-white border border-accent-brown',
  }
  
  return (
    <span
      className={`inline-block px-3 py-1 text-xs font-medium rounded-button ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}

