import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function Section({ className, children, tone = 'canvas', ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode; tone?: 'canvas' | 'subtle' | 'inset' }) {
  const tones = { canvas: 'bg-bg-canvas', subtle: 'bg-bg-subtle', inset: 'bg-bg-inset' }
  return <section className={cn('py-12 sm:py-16', tones[tone], className)} {...props}>{children}</section>
}

export function SectionHeader({ eyebrow, title, description, align = 'left', className }: { eyebrow?: string; title: string; description?: string; align?: 'left' | 'center'; className?: string }) {
  return <div className={cn('mb-8 max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>{eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-caps text-brand-fg">{eyebrow}</p>}<h2 className="text-h2">{title}</h2>{description && <p className="mt-3 text-base text-fg-muted">{description}</p>}</div>
}
