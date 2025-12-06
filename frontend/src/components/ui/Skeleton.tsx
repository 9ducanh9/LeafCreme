// Skeleton loading component - uses design tokens
import { HTMLAttributes } from 'react'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string
  height?: string
  variant?: 'text' | 'circular' | 'rectangular'
}

export default function Skeleton({ 
  width, 
  height, 
  variant = 'rectangular',
  className = '',
  ...props 
}: SkeletonProps) {
  const baseStyles = 'bg-border animate-pulse'
  
  const variantStyles = {
    text: 'rounded-input h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-input',
  }
  
  const style: React.CSSProperties = {}
  if (width) style.width = width
  if (height) style.height = height
  
  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={style}
      {...props}
    />
  )
}

