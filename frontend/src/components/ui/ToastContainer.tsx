import { useToast } from '../../contexts/ToastContext'
import ToastComponent from './Toast'

export default function ToastContainer() {
  const { toasts, removeToast } = useToast()
  if (!toasts.length) return null
  return <div className="pointer-events-none fixed left-4 right-4 top-20 z-toast flex flex-col items-stretch gap-3 sm:left-auto sm:right-6 sm:items-end" aria-label="Thông báo">
    {toasts.slice(-3).map((toast) => <div key={toast.id} className="pointer-events-auto"><ToastComponent toast={toast} onClose={removeToast} /></div>)}
  </div>
}
