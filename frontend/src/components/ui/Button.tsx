// Reusable button component with bakery theme - uses design tokens
import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
}

export default function Button({ 
  children, 
  variant = 'primary', 
  className = '',
  disabled,
  ...props 
}: ButtonProps) {
  const baseStyles = 'px-6 py-3 rounded-button font-medium transition-soft inline-flex items-center justify-center whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variantStyles = {
    primary: 'bg-gradient-to-r from-[#C59B72] to-[#D4A574] text-white hover:from-[#B88A5F] hover:to-[#C59B72] border border-[#D4A574] shadow-md hover:shadow-lg',
    secondary: 'bg-gradient-to-r from-[#F5C96A] to-[#F7D794] text-[#473C2F] hover:opacity-90 border border-[#F5C96A] shadow-sm',
    outline: 'border-2 border-[#D4A574] text-[#473C2F] hover:bg-[#FFF5E6] hover:border-[#C59B72] bg-surface shadow-sm',
    ghost: 'text-[#473C2F] hover:bg-[#FFF5E6] border border-transparent',
  }
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

