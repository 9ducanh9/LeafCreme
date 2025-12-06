// Toast notification component - displays temporary messages
import { useEffect } from 'react'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number // in milliseconds, default 3000
}

interface ToastProps {
  toast: Toast
  onClose: (id: string) => void
}

export default function ToastComponent({ toast, onClose }: ToastProps) {
  const duration = toast.duration ?? 3000

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(toast.id)
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, toast.id, onClose])

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-white" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-white" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-white" />
      case 'info':
        return <Info className="w-5 h-5 text-white" />
    }
  }

  const getBgColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-accent-brown'
      case 'error':
        return 'bg-red-500'
      case 'warning':
        return 'bg-accent-yellow'
      case 'info':
        return 'bg-blue-500'
    }
  }

  return (
    <div
      className={`${getBgColor()} text-white px-4 py-3 rounded-card shadow-lg flex items-center gap-3 min-w-[300px] max-w-[500px] animate-slide-in-right`}
      role="alert"
    >
      <div className="flex-shrink-0">{getIcon()}</div>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 p-1 hover:bg-white/20 rounded-button transition-default"
        aria-label="Đóng thông báo"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

