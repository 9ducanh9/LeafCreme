import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useOverlayA11y } from '../../hooks/useOverlayA11y'

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
  // useId: id cố định 'modal-title' làm aria-labelledby trỏ sai khi có 2 modal
  // cùng mount (id trùng trong DOM).
  const titleId = `${useId()}-modal-title`

  // inert khi đóng + focus trap + Escape + trả focus về trigger.
  // onClose giữ trong ref bên trong hook, nên parent truyền arrow function mới
  // mỗi render cũng không làm effect chạy lại (trước đây gây nhảy focus về
  // trigger giữa lúc modal đang mở).
  useOverlayA11y({ containerRef: contentRef, open: isOpen, onClose })

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [isOpen])

  return (
    <div
      className={cn(
        'fixed inset-0 z-modal flex items-center justify-center p-4 transition-[opacity,visibility] duration-normal',
        isOpen ? 'visible pointer-events-auto opacity-100' : 'invisible pointer-events-none opacity-0'
      )}
    >
      {/* Backdrop là <button>: click-outside dùng click thật nên kéo chọn text từ
          trong modal ra ngoài rồi nhả KHÔNG đóng modal (bug của bản dùng onClick
          trên wrapper + stopPropagation ở content). */}
      <button type="button" aria-label="Đóng hộp thoại" className="absolute inset-0 cursor-default bg-bg-overlay" onClick={onClose} tabIndex={-1} />
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          'relative z-modal flex max-h-[min(90dvh,44rem)] w-full flex-col overflow-hidden rounded-xl border border-border bg-bg-surface shadow-xl outline-none transition-transform duration-normal',
          size === 'sm' && 'max-w-sm',
          size === 'md' && 'max-w-lg',
          size === 'lg' && 'max-w-2xl',
          isOpen ? 'scale-100' : 'scale-95'
        )}
      >
        <div className="flex items-center justify-between border-b border-border-subtle p-5">
          {title ? <h2 id={titleId} className="font-heading text-xl font-semibold text-fg-strong">{title}</h2> : <span />}
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
