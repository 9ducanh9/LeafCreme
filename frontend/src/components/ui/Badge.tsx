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
    default: 'bg-gradient-to-r from-[#F5C96A] to-[#F7D794] text-[#473C2F] border border-[#F5C96A] shadow-sm',
    yellow: 'bg-gradient-to-r from-[#F5C96A] to-[#F7D794] text-[#473C2F] border border-[#F5C96A] shadow-sm',
    pink: 'bg-gradient-to-r from-[#F7B4B8] to-[#F9C5C9] text-[#473C2F] border border-[#F7B4B8] shadow-sm',
    brown: 'bg-gradient-to-r from-[#C59B72] to-[#D4A574] text-white border border-[#D4A574] shadow-sm',
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

