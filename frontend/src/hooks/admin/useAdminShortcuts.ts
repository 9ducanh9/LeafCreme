import { useEffect } from 'react'

export function useAdminShortcuts(actions: { onNew?: () => void; onHelp?: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement | null
      const isTyping = element?.tagName === 'INPUT' || element?.tagName === 'TEXTAREA' || element?.tagName === 'SELECT' || Boolean(element?.isContentEditable)
      if (isTyping || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key.toLowerCase() === 'n') { event.preventDefault(); actions.onNew?.() }
      if (event.key === '?') { event.preventDefault(); actions.onHelp?.() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [actions])
}
