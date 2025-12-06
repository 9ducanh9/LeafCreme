// SectionHeader - consistent section header using design tokens
import { HTMLAttributes, ReactNode } from 'react'

interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
  action?: ReactNode
}

export default function SectionHeader({
  title,
  subtitle,
  action,
  className = '',
  ...props
}: SectionHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 md:mb-12 ${className}`}
      {...props}
    >
      <div>
        <h1 className="font-heading text-4xl md:text-5xl font-semibold text-text-primary mb-3">
          {title}
        </h1>
        {subtitle && (
          <p className="text-text-secondary text-lg max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  )
}

