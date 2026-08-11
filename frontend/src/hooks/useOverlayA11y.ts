import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

interface Options {
  /** Container của overlay (drawer / dialog). */
  containerRef: React.RefObject<HTMLElement>
  open: boolean
  /** Có thì Escape sẽ gọi nó. Bỏ trống nếu nơi khác đã xử lý Escape. */
  onClose?: () => void
}

/**
 * A11y cho overlay giữ nguyên trong DOM khi đóng (để còn transition slide/fade).
 *
 * Xử lý 3 việc mà `aria-hidden` một mình KHÔNG làm được:
 *
 * 1. `inert` khi đóng. `aria-hidden="true"` bọc element focus được là violation
 *    (axe: aria-hidden-focus): người dùng bàn phím Tab vào một drawer đã dịch ra
 *    ngoài màn hình và không thấy mình đang ở đâu. `inert` bỏ cả subtree khỏi tab
 *    order và khỏi accessibility tree. Kèm class `invisible` ở call site cho
 *    browser chưa hỗ trợ `inert`.
 *
 * 2. Focus trap khi mở. Đã khai `role="dialog" aria-modal="true"` thì Tab không
 *    được thoát ra sau overlay — khai là modal mà focus lạc ra ngoài còn tệ hơn
 *    không khai, vì screen reader nói "dialog" rồi người dùng mất phương hướng.
 *
 * 3. Trả focus về trigger khi đóng. Không có thì focus rơi về đầu document.
 *
 * `onClose` được giữ trong ref: để nó trong dep array thì mỗi lần parent re-render
 * với arrow function mới sẽ chạy lại effect → focus nhảy về trigger giữa lúc
 * overlay đang mở.
 */
export function useOverlayA11y({ containerRef, open, onClose }: Options) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const triggerRef = useRef<HTMLElement | null>(null)

  // (1) inert khi đóng — thuộc tính này React 18 chưa có type, set qua DOM.
  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    if (open) node.removeAttribute('inert')
    else node.setAttribute('inert', '')
  }, [open, containerRef])

  // (2) + (3) focus trap, focus vào trong khi mở, trả focus khi đóng
  useEffect(() => {
    if (!open) return
    const node = containerRef.current
    if (!node) return

    triggerRef.current = document.activeElement as HTMLElement | null

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current?.()
        return
      }
      if (event.key !== 'Tab') return
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((el) => el.offsetParent !== null || el === document.activeElement)
      if (items.length === 0) {
        // Không có gì focus được bên trong: giữ focus ở container, đừng để lọt ra ngoài.
        event.preventDefault()
        node.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !node.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const raf = requestAnimationFrame(() => {
      const target = node.querySelector<HTMLElement>(FOCUSABLE)
      if (target) target.focus()
      else node.focus()
    })

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKeyDown)
      // Chỉ trả focus nếu focus vẫn còn nằm trong overlay — tránh giật focus khi
      // người dùng đã tự bấm sang chỗ khác.
      const trigger = triggerRef.current
      if (trigger && document.contains(trigger) && node.contains(document.activeElement)) {
        trigger.focus({ preventScroll: true })
      }
    }
  }, [open, containerRef])
}
