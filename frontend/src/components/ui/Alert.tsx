import type { ReactNode } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '../../lib/cn'

export default function Alert({ variant = 'info', title, children, action, className }: { variant?: 'info' | 'success' | 'warning' | 'danger'; title?: string; children: ReactNode; action?: ReactNode; className?: string }) {
  const Icon = variant === 'success' ? CheckCircle2 : variant === 'warning' ? AlertTriangle : variant === 'danger' ? AlertCircle : Info
  const styles = { info: 'border-info/30 bg-info-bg text-info', success: 'border-success/30 bg-success-bg text-success', warning: 'border-warning/30 bg-warning-bg text-warning', danger: 'border-danger/30 bg-danger-bg text-danger' }[variant]
  return <div role={variant === 'danger' ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-lg border p-4', styles, className)}><Icon className="mt-0.5 size-5 shrink-0" aria-hidden /><div className="min-w-0 flex-1 text-sm">{title && <p className="font-semibold">{title}</p>}<div className={title ? 'mt-1' : undefined}>{children}</div></div>{action && <div className="shrink-0">{action}</div>}</div>
}
