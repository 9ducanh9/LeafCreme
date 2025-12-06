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
  const baseStyles = 'px-6 py-3 rounded-button font-medium transition-default duration-default inline-flex items-center justify-center whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variantStyles = {
    primary: 'bg-accent-brown text-white hover:opacity-90 border border-accent-brown',
    secondary: 'bg-accent-yellow text-text-primary hover:opacity-90 border border-accent-yellow',
    outline: 'border border-border text-text-primary hover:border-accent-brown bg-surface',
    ghost: 'text-text-primary hover:bg-surface border border-transparent',
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

