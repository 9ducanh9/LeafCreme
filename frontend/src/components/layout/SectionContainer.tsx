// SectionContainer - consistent page section wrapper using design tokens
import { HTMLAttributes, ReactNode } from 'react'

interface SectionContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

export default function SectionContainer({
  children,
  maxWidth = 'xl',
  className = '',
  ...props
}: SectionContainerProps) {
  const maxWidthStyles = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-[1440px]',
    full: 'max-w-full',
  }

  return (
    <div
      className={`mx-auto px-4 md:px-6 ${maxWidthStyles[maxWidth]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

