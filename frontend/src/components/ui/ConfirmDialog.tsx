import { AlertCircle } from 'lucide-react'
import Button from './Button'
import Modal from './Modal'

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

export default function ConfirmDialog({ isOpen, title = 'Xác nhận', message, confirmLabel = 'Xác nhận', cancelLabel = 'Hủy', onConfirm, onCancel, variant = 'default' }: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={<div className="flex justify-end gap-3"><Button variant="outline" onClick={onCancel}>{cancelLabel}</Button><Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button></div>}
    >
      <div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-full bg-warning-bg text-warning"><AlertCircle className="size-5" aria-hidden /></div><p className="pt-1 text-sm leading-relaxed text-fg-muted">{message}</p></div>
    </Modal>
  )
}
