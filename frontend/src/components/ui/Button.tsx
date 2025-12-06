// Reusable button component with bakery theme
import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'outline'
}

export default function Button({ 
  children, 
  variant = 'primary', 
  className = '',
  ...props 
}: ButtonProps) {
  const baseStyles = 'px-6 py-3 rounded-button font-medium transition-default duration-default inline-flex items-center justify-center whitespace-nowrap'
  
  const variantStyles = {
    primary: 'bg-accent-brown text-white hover:opacity-90',
    secondary: 'bg-accent-yellow text-text-primary hover:opacity-90',
    outline: 'border border-border text-text-primary hover:border-accent-brown',
  }
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

