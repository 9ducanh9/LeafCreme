import { useEffect, useRef } from 'react'

// Ops tool dùng 8 tiếng/ngày — shortcut là tiết kiệm thật (spec 13 §8).
// Chuỗi `g` + phím (kiểu GitHub/Linear) thay vì `Ctrl+` để tránh xung đột
// với shortcut trình duyệt (Ctrl+T, Ctrl+W...).
export interface ShortcutSpec {
  /** Một phím đơn (vd. '?') hoặc chuỗi 2 phím bắt đầu bằng 'g ' (vd. 'g d'). */
  chord: string
  label: string
  action: () => void
}

const CHORD_TIMEOUT_MS = 600

export function useAdminShortcuts(shortcuts: ShortcutSpec[]) {
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  useEffect(() => {
    let awaitingSecondKey = false
    let resetTimer: ReturnType<typeof setTimeout> | undefined

    const onKeyDown = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement | null
      // Không bắt phím khi đang gõ trong input/textarea/select/contenteditable —
      // nếu không, gõ "g" hay "?" trong ô tìm kiếm sẽ kích hoạt shortcut.
      const isTyping = el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.tagName === 'SELECT' || Boolean(el?.isContentEditable)
      if (isTyping || event.metaKey || event.ctrlKey || event.altKey) return

      if (awaitingSecondKey) {
        awaitingSecondKey = false
        clearTimeout(resetTimer)
        const chord = `g ${event.key.toLowerCase()}`
        const match = shortcutsRef.current.find((s) => s.chord === chord)
        if (match) { event.preventDefault(); match.action() }
        return
      }

      if (event.key.toLowerCase() === 'g' && shortcutsRef.current.some((s) => s.chord.startsWith('g '))) {
        awaitingSecondKey = true
        resetTimer = setTimeout(() => { awaitingSecondKey = false }, CHORD_TIMEOUT_MS)
        return
      }

      const direct = shortcutsRef.current.find((s) => s.chord === event.key)
      if (direct) { event.preventDefault(); direct.action() }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => { window.removeEventListener('keydown', onKeyDown); clearTimeout(resetTimer) }
  }, [])
}
