// Lightweight Modal component - uses design tokens
import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import Button from './Button'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeStyles = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-text-primary opacity-20" />
      
      {/* Modal Content */}
      <div
        className={`
          relative bg-surface border border-border rounded-card 
          ${sizeStyles[size]} w-full max-h-[90vh] 
          flex flex-col shadow-lg
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || onClose) && (
          <div className="flex items-center justify-between p-6 border-b border-border">
            {title && (
              <h2 className="font-heading text-xl font-semibold text-text-primary">
                {title}
              </h2>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-text-secondary hover:text-text-primary transition-default rounded-input hover:bg-bg-main"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-6 border-t border-border">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

