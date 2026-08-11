import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '../../lib/cn'

export default function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col items-center justify-center rounded-lg border border-dashed border-border-default bg-bg-subtle px-6 py-16 text-center', className)}><span className="mb-4 text-brand-fg">{icon || <Inbox className="size-10" aria-hidden />}</span><h2 className="text-xl font-semibold text-fg-strong">{title}</h2>{description && <p className="mt-2 max-w-md text-sm text-fg-muted">{description}</p>}{action && <div className="mt-5">{action}</div>}</div>
}
