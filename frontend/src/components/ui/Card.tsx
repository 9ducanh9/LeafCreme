import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> { interactive?: boolean }

export default function Card({ className, interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden rounded-lg border border-border bg-bg-surface p-6 shadow-xs',
        interactive && 'transition-[box-shadow,transform] duration-normal ease-out hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-focus focus-within:ring-offset-2',
        className,
      )}
      {...props}
    />
  )
}

export function CardMedia({ className, ratio = 'product', ...props }: HTMLAttributes<HTMLDivElement> & { ratio?: 'product' | 'hero' | 'square' }) {
  return <div className={cn('relative w-full overflow-hidden bg-bg-inset', ratio === 'product' && 'aspect-product', ratio === 'hero' && 'aspect-hero', ratio === 'square' && 'aspect-square', className)} {...props} />
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 p-5', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('font-heading text-lg font-semibold text-fg-strong', className)} {...props} />
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-fg-muted', className)} {...props} />
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-1 flex-col gap-3 px-5 pb-5', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-3 border-t border-border-subtle p-5', className)} {...props} />
}
