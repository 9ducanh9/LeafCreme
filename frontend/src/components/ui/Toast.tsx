import { useEffect } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '../../lib/cn'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastProps { toast: Toast; onClose: (id: string) => void }

export default function ToastComponent({ toast, onClose }: ToastProps) {
  const duration = toast.duration ?? 5000
  useEffect(() => {
    if (duration <= 0) return
    const timer = window.setTimeout(() => onClose(toast.id), duration)
    return () => window.clearTimeout(timer)
  }, [duration, onClose, toast.id])

  const Icon = toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? AlertCircle : toast.type === 'warning' ? AlertTriangle : Info
  const styles = {
    success: 'border-success/30 bg-success-bg text-success',
    error: 'border-danger/30 bg-danger-bg text-danger',
    warning: 'border-warning/30 bg-warning-bg text-warning',
    info: 'border-info/30 bg-info-bg text-info',
  }[toast.type]

  return <div className={cn('flex w-full max-w-md items-start gap-3 rounded-lg border px-4 py-3 shadow-lg', styles)} role="status" aria-live="polite">
    <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
    <p className="flex-1 text-sm font-medium">{toast.message}</p>
    <button type="button" onClick={() => onClose(toast.id)} className="shrink-0 rounded-md p-1 hover:bg-bg-overlay" aria-label="Đóng thông báo"><X className="size-4" aria-hidden /></button>
  </div>
}
