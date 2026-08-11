import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export default function Modal({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    triggerRef.current = document.activeElement as HTMLElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab' || !contentRef.current) return
      const focusable = Array.from(contentRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    requestAnimationFrame(() => contentRef.current?.querySelector<HTMLElement>('button, [href], input, textarea, select')?.focus())
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      triggerRef.current?.focus()
    }
  }, [isOpen, onClose])

  return (
    <div className={cn('fixed inset-0 z-modal flex items-center justify-center p-4 transition-opacity duration-normal', isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0')} aria-hidden={!isOpen}>
      <button type="button" aria-label="Đóng hộp thoại" className="absolute inset-0 cursor-default bg-bg-overlay" onClick={onClose} tabIndex={-1} />
      <div ref={contentRef} role="dialog" aria-modal="true" aria-labelledby={title ? 'modal-title' : undefined} className={cn('relative z-modal flex max-h-[min(90dvh,44rem)] w-full flex-col overflow-hidden rounded-xl border border-border bg-bg-surface shadow-xl transition-transform duration-normal', size === 'sm' && 'max-w-sm', size === 'md' && 'max-w-lg', size === 'lg' && 'max-w-2xl', isOpen ? 'scale-100' : 'scale-95')}>
        <div className="flex items-center justify-between border-b border-border-subtle p-5">
          {title ? <h2 id="modal-title" className="font-heading text-xl font-semibold text-fg-strong">{title}</h2> : <span />}
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-md text-fg-subtle hover:bg-bg-subtle hover:text-fg" aria-label="Đóng">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">{children}</div>
        {footer && <div className="border-t border-border-subtle p-5">{footer}</div>}
      </div>
    </div>
  )
}
