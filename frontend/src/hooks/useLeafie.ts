import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { askLeafie } from '../services/leafieService'
import type { LeafieMessage } from '../types/leafie'

export interface UseLeafieReturn {
  messages: LeafieMessage[]
  loading: boolean
  error: string | null
  isOpen: boolean
  sendMessage: (message: string) => Promise<void>
  retryMessage: () => void
  openChat: () => void
  closeChat: () => void
  clearHistory: () => void
}

function storageFor(userId: number | null) {
  return { storage: userId ? localStorage : sessionStorage, key: userId ? `leafie_sales_v1_user_${userId}` : 'leafie_sales_v1_guest' }
}

export function useLeafie(): UseLeafieReturn {
  const { user } = useAuth()
  const userId = user?.nguoidung_id ?? null
  const [messages, setMessages] = useState<LeafieMessage[]>([])
  const messagesRef = useRef<LeafieMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const activeUser = useRef(userId)
  const requestVersion = useRef(0)
  const sending = useRef(false)
  const lastAttempt = useRef('')

  const saveMessages = useCallback((next: LeafieMessage[]) => {
    messagesRef.current = next.slice(-60)
    setMessages(messagesRef.current)
    try {
      const { storage, key } = storageFor(activeUser.current)
      if (next.length) storage.setItem(key, JSON.stringify(messagesRef.current))
      else storage.removeItem(key)
    } catch { /* Chat remains usable when browser storage is unavailable. */ }
  }, [])

  useEffect(() => {
    activeUser.current = userId
    requestVersion.current += 1
    sending.current = false
    lastAttempt.current = ''
    setLoading(false)
    setError(null)
    let restored: LeafieMessage[] = []
    try {
      const { storage, key } = storageFor(userId)
      const parsed = JSON.parse(storage.getItem(key) || '[]')
      if (Array.isArray(parsed)) restored = parsed.filter((m) =>
        m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.length <= 2000,
      ).slice(-60).map((m) => ({
        id: typeof m.id === 'string' ? m.id : crypto.randomUUID(),
        role: m.role, content: m.content, timestamp: new Date(m.timestamp),
        // Refresh catalog cards on the next request rather than restoring stale stock/prices.
        products: [], suggestions: [],
      }))
    } catch { /* Start a new conversation if stored history is unreadable. */ }
    messagesRef.current = restored
    setMessages(restored)
  }, [userId])

  const sendMessage = useCallback(async (text: string) => {
    const message = text.trim()
    if (!message || sending.current) return
    sending.current = true
    setLoading(true)
    setError(null)
    lastAttempt.current = message
    const version = ++requestVersion.current
    const current = messagesRef.current
    const last = current[current.length - 1]
    const retrying = last?.role === 'user' && last.content === message
    const history = (retrying ? current.slice(0, -1) : current).slice(-10).map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
    if (!retrying) saveMessages([...current, { id: crypto.randomUUID(), role: 'user', content: message, timestamp: new Date() }])
    try {
      const reply = await askLeafie(message, history)
      if (version !== requestVersion.current) return
      saveMessages([...messagesRef.current, { id: crypto.randomUUID(), role: 'assistant', content: reply.message, timestamp: new Date(), products: reply.products, suggestions: reply.suggestions }])
    } catch (err) {
      if (version === requestVersion.current) setError(err instanceof Error ? err.message : 'Không thể kết nối Leafie. Bạn thử lại nhé.')
    } finally {
      if (version === requestVersion.current) {
        sending.current = false
        setLoading(false)
      }
    }
  }, [saveMessages])

  const clearHistory = useCallback(() => {
    requestVersion.current += 1
    sending.current = false
    lastAttempt.current = ''
    setLoading(false)
    setError(null)
    saveMessages([])
  }, [saveMessages])

  return {
    messages, loading, error, isOpen, sendMessage,
    retryMessage: () => { if (lastAttempt.current) void sendMessage(lastAttempt.current) },
    openChat: () => setIsOpen(true), closeChat: () => setIsOpen(false), clearHistory,
  }
}
