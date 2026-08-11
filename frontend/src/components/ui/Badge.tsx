import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type BadgeVariant = 'default' | 'yellow' | 'pink' | 'brown' | 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'solid'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  variant?: BadgeVariant
  size?: 'sm' | 'md'
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-bg-inset text-fg-muted',
  neutral: 'bg-bg-inset text-fg-muted',
  yellow: 'bg-warning-bg text-warning',
  warning: 'bg-warning-bg text-warning',
  pink: 'bg-danger-bg text-danger',
  danger: 'bg-danger-bg text-danger',
  brown: 'bg-brand-subtle text-brand-fg ring-1 ring-inset ring-brand-border-subtle',
  brand: 'bg-brand-subtle text-brand-fg ring-1 ring-inset ring-brand-border-subtle',
  accent: 'bg-accent-subtle text-accent-fg',
  success: 'bg-success-bg text-success',
  info: 'bg-info-bg text-info',
  solid: 'bg-brand text-fg-on-brand',
}

export default function Badge({ children, className, variant = 'default', size = 'md', ...props }: BadgeProps) {
  return <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium', size === 'sm' && 'px-1.5 text-2xs', variantStyles[variant], className)} {...props}>{children}</span>
}
