// frontend/src/hooks/useLeafie.ts

import { useEffect, useState, useCallback, useRef } from 'react'
import { askLeafie } from '../services/leafieService'
import { buildLeafieContext } from '../utils/buildLeafieContext'
import { useAuth } from '../contexts/AuthContext'
import type { LeafieContext, LeafieMessage } from '../types/leafie'

const CONTEXT_CACHE_KEY = 'leafie_context_cache'
const CONTEXT_TTL = 5 * 60 * 1000 // 5 phút

// Storage key helpers
function getMessagesStorageKey(userId: number | null): string {
  if (userId) {
    return `leafie_messages_user_${userId}`
  }
  return 'leafie_messages_guest' // For sessionStorage
}

function getStorage(userId: number | null): Storage {
  // Authenticated users: localStorage (persistent)
  // Guest users: sessionStorage (cleared on tab close)
  return userId ? localStorage : sessionStorage
}

export interface UseLeafieReturn {
  messages: LeafieMessage[]
  loading: boolean
  error: string | null
  isOpen: boolean
  context: LeafieContext | null
  sendMessage: (message: string) => Promise<void>
  openChat: () => void
  closeChat: () => void
  clearHistory: () => void
}

export function useLeafie(): UseLeafieReturn {
  const { user } = useAuth()
  const [messages, setMessages] = useState<LeafieMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [context, setContext] = useState<LeafieContext | null>(null)
  const [error, setError] = useState<string | null>(null)
  const previousUserIdRef = useRef<number | null>(null)

  // ✅ Load context on mount
  useEffect(() => {
    loadContext()
  }, [])

  // ✅ Load messages when user changes
  useEffect(() => {
    const currentUserId = user?.nguoidung_id || null
    
    // If user changed, clear old messages and load new ones
    if (previousUserIdRef.current !== currentUserId) {
      // Clear old storage if user changed
      if (previousUserIdRef.current !== null) {
        // Was authenticated user - clear from localStorage
        const oldKey = getMessagesStorageKey(previousUserIdRef.current)
        localStorage.removeItem(oldKey)
      } else {
        // Was guest - clear from sessionStorage
        const oldKey = getMessagesStorageKey(null)
        sessionStorage.removeItem(oldKey)
      }
      
      // Clear current messages state
      setMessages([])
      
      // Load messages for current user (or start fresh for guest)
      loadMessages(currentUserId)
      previousUserIdRef.current = currentUserId
    } else {
      // Same user, just load messages
      loadMessages(currentUserId)
    }
  }, [user?.nguoidung_id])

  function loadMessages(userId: number | null) {
    try {
      const storage = getStorage(userId)
      const key = getMessagesStorageKey(userId)
      const stored = storage.getItem(key)
      
      if (stored) {
        const parsed = JSON.parse(stored)
        // Convert timestamp strings back to Date objects
        const loadedMessages = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }))
        setMessages(loadedMessages)
      } else {
        // No stored messages, start fresh
        setMessages([])
      }
    } catch (err) {
      console.error('❌ Failed to load Leafie messages', err)
      setMessages([])
    }
  }

  // Save messages to storage whenever they change
  useEffect(() => {
    const userId = user?.nguoidung_id || null
    const storage = getStorage(userId)
    const key = getMessagesStorageKey(userId)
    
    if (messages.length > 0) {
      storage.setItem(key, JSON.stringify(messages))
    } else {
      // Clear storage if no messages
      storage.removeItem(key)
    }
  }, [messages, user?.nguoidung_id])

  async function loadContext() {
    try {
      const cached = localStorage.getItem(CONTEXT_CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Date.now() - parsed.timestamp < CONTEXT_TTL) {
          setContext(parsed.context)
          return
        }
      }

      const freshContext = await buildLeafieContext()
      setContext(freshContext)

      localStorage.setItem(
        CONTEXT_CACHE_KEY,
        JSON.stringify({
          context: freshContext,
          timestamp: Date.now(),
        })
      )
    } catch (err) {
      console.error('❌ Failed to load Leafie context', err)
    }
  }

  // 🚀 GỬI MESSAGE → CHỈ GỌI AI
  const sendMessage = useCallback(async (message: string) => {
    if (!context || !message.trim()) return

    setLoading(true)
    setError(null)

    const userMessage: LeafieMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    }

    let currentMessages: LeafieMessage[] = []
    setMessages((prev) => {
      currentMessages = [...prev, userMessage]
      return currentMessages
    })

    try {
      const conversationHistory = currentMessages
        .slice(-10)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }))

      const reply = await askLeafie(
        message.trim(),
        context,
        conversationHistory
      )

      const assistantMessage: LeafieMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: reply.message,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      console.error('❌ Error sending message to Leafie:', err)
      setError('Có lỗi xảy ra. Vui lòng thử lại sau.')
    } finally {
      setLoading(false)
    }
  }, [context])

  const openChat = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeChat = useCallback(() => {
    setIsOpen(false)
  }, [])

  const clearHistory = useCallback(() => {
    const userId = user?.nguoidung_id || null
    const storage = getStorage(userId)
    const key = getMessagesStorageKey(userId)
    
    setMessages([])
    storage.removeItem(key)
  }, [user?.nguoidung_id])

  return {
    messages,
    loading,
    error,
    isOpen,
    context,
    sendMessage,
    openChat,
    closeChat,
    clearHistory,
  }
}
