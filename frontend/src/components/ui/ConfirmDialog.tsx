// Confirm dialog component - replaces browser confirm()
import { AlertCircle, X } from 'lucide-react'
import Button from './Button'

interface ConfirmDialogProps {
  isOpen: boolean
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'default'
}

export default function ConfirmDialog({
  isOpen,
  title = 'Xác nhận',
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  onConfirm,
  onCancel,
  variant = 'default',
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center p-4 transition-opacity duration-300"
        onClick={onCancel}
      >
        {/* Dialog */}
        <div
          className="bg-surface border border-border rounded-card shadow-lg max-w-md w-full p-6 transform transition-all duration-300 scale-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                variant === 'danger' ? 'bg-red-100' : 'bg-accent-yellow/20'
              }`}
            >
              <AlertCircle
                className={`w-5 h-5 ${
                  variant === 'danger' ? 'text-red-600' : 'text-accent-brown'
                }`}
              />
            </div>
            <div className="flex-1">
              <h3 className="font-heading text-lg font-semibold text-text-primary mb-1">
                {title}
              </h3>
              <p className="text-sm text-text-secondary">{message}</p>
            </div>
            <button
              onClick={onCancel}
              className="flex-shrink-0 p-1 hover:bg-background rounded-button transition-default"
              aria-label="Đóng"
            >
              <X className="w-4 h-4 text-text-secondary" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button variant="outline" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button
              variant={variant === 'danger' ? 'primary' : 'primary'}
              onClick={onConfirm}
              className={variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : ''}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

