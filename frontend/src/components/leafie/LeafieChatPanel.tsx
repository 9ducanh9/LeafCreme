// Leafie chat panel - Discord style
import { useState, useRef, useEffect } from 'react'
import { X, Send, Leaf, Trash2, MoreVertical } from 'lucide-react'
import LeafieMessageList from './LeafieMessageList'
import ConfirmDialog from '../ui/ConfirmDialog'
import FloatingEmojiOverlay from '../layout/FloatingEmojiOverlay'
import { useActiveSeason } from '../../hooks/useActiveSeason'
import type { LeafieMessage } from '../../types/leafie'

interface LeafieChatPanelProps {
  isOpen: boolean
  messages: LeafieMessage[]
  loading: boolean
  onClose: () => void
  onSendMessage: (message: string) => void
  onSuggestionSelect: (suggestion: string) => void
  onClearHistory: () => void
}

export default function LeafieChatPanel({
  isOpen,
  messages,
  loading,
  onClose,
  onSendMessage,
  onSuggestionSelect,
  onClearHistory,
}: LeafieChatPanelProps) {
  const [inputValue, setInputValue] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)
  const activeSeason = useActiveSeason()

  // Check if user is near bottom (within 100px)
  const isNearBottom = (): boolean => {
    if (!scrollContainerRef.current) return true
    const container = scrollContainerRef.current
    const threshold = 100
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold
  }

  // Auto-scroll to bottom only if user is near bottom or when panel first opens
  useEffect(() => {
    if (!scrollContainerRef.current || !messagesEndRef.current) return

    if (messages.length <= 1) {
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
          shouldAutoScrollRef.current = true
        }
      }, 100)
      return
    }

    if (shouldAutoScrollRef.current && isNearBottom()) {
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
    }
  }, [messages])

  // Track scroll position
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      shouldAutoScrollRef.current = isNearBottom()
    }

    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [isOpen])

  // Focus input and scroll when panel opens
  useEffect(() => {
    if (isOpen) {
      if (inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 100)
      }
      setTimeout(() => {
        if (messagesEndRef.current && scrollContainerRef.current) {
          shouldAutoScrollRef.current = true
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' })
        }
      }, 150)
    }
  }, [isOpen])

  // Prevent body scroll when panel is open
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

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showMenu])

  const handleClearHistoryClick = () => {
    setShowConfirmDialog(true)
    setShowMenu(false)
  }

  const handleConfirmClear = () => {
    onClearHistory()
    setShowConfirmDialog(false)
  }

  const handleCancelClear = () => {
    setShowConfirmDialog(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !loading) {
      onSendMessage(inputValue)
      setInputValue('')
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-40' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel - Discord style */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#F8F6F0] z-50 flex flex-col shadow-2xl transition-all duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Evergreen by default — only renders when a season in config/seasons.ts matches today. */}
        {isOpen && activeSeason?.decoration && (
          <FloatingEmojiOverlay emoji={activeSeason.decoration.emoji} color={activeSeason.decoration.color} count={10} />
        )}

        {/* Header - Discord style */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 py-3 border-b border-[#E8E5DD] bg-gradient-to-r from-[#FFF5E6] to-[#F8F6F0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-[#F5C96A]/40 to-[#C59B72]/30 flex items-center justify-center shadow-sm border-2 border-[#C59B72]/30 relative overflow-hidden">
              {/* Subtle shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent animate-pulse" />
              <Leaf className="w-5 h-5 md:w-6 md:h-6 text-[#C59B72]" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-semibold text-[#473C2F] text-base md:text-lg">Leafie</h3>
              <p className="text-xs text-[#7A6F63]">Trợ lý của Leaf Creme</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 1 && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-[#E8E5DD]/50 rounded-lg transition-colors text-[#7A6F63] hover:text-[#473C2F]"
                  aria-label="Menu"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-[#E8E5DD] rounded-lg shadow-xl z-10 min-w-[180px] overflow-hidden">
                    <button
                      onClick={handleClearHistoryClick}
                      className="w-full px-4 py-2.5 text-left text-sm text-[#473C2F] hover:bg-[#F8F6F0] transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4 text-[#7A6F63]" />
                      <span>Xóa lịch sử</span>
                    </button>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#E8E5DD]/50 rounded-lg transition-colors text-[#7A6F63] hover:text-[#473C2F]"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages - Discord style container */}
        <div className="flex-1 overflow-hidden bg-[#F8F6F0]">
          <div 
            className="h-full overflow-y-auto overscroll-contain px-2 md:px-4" 
            ref={scrollContainerRef}
            style={{ scrollBehavior: 'smooth' }}
          >
            <LeafieMessageList
              messages={messages}
              loading={loading}
              onSuggestionSelect={onSuggestionSelect}
            />
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input - Discord style */}
        <div className="flex-shrink-0 border-t border-[#E8E5DD] bg-white px-3 md:px-4 py-3 md:py-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Nhập câu hỏi của bạn..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg border border-[#E8E5DD] bg-[#F8F6F0] focus:outline-none focus:border-[#C59B72] focus:ring-2 focus:ring-[#C59B72]/20 transition-all text-sm text-[#473C2F] placeholder:text-[#7A6F63] disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || loading}
              className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#C59B72] to-[#D4A574] text-white hover:from-[#B88A5F] hover:to-[#C59B72] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Xóa lịch sử trò chuyện"
        message="Bạn có chắc muốn xóa toàn bộ lịch sử trò chuyện? Hành động này không thể hoàn tác."
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        onConfirm={handleConfirmClear}
        onCancel={handleCancelClear}
        variant="danger"
      />
    </>
  )
}
