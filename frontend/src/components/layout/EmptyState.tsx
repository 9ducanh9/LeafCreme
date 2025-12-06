// EmptyState - consistent empty state component using design tokens
import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'
import Button from '../ui/Button'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  }
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 md:py-24 text-center">
      {Icon && (
        <div className="mb-6 p-4 rounded-card bg-bg-main border border-border">
          <Icon className="w-12 h-12 text-text-secondary" />
        </div>
      )}
      <h3 className="font-heading text-2xl font-semibold text-text-primary mb-3">
        {title}
      </h3>
      {description && (
        <p className="text-text-secondary text-lg max-w-md mb-8">
          {description}
        </p>
      )}
      {action && (
        <Button
          variant={action.variant || 'primary'}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

