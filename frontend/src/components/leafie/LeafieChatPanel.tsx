import { useState, useRef, useEffect, useId } from 'react'
import { useOverlayA11y } from '../../hooks/useOverlayA11y'
import { useSpeechInput } from '../../hooks/useSpeechInput'
import { X, Send, Trash2, MoreVertical, Mic, Square } from 'lucide-react'
import LeafieMessageList from './LeafieMessageList'
import ConfirmDialog from '../ui/ConfirmDialog'
import type { LeafieMessage } from '../../types/leafie'

interface LeafieChatPanelProps {
  isOpen: boolean
  messages: LeafieMessage[]
  loading: boolean
  error: string | null
  onRetry: () => void
  onClose: () => void
  onSendMessage: (message: string) => void
  onSuggestionSelect: (suggestion: string) => void
  onClearHistory: () => void
}

export default function LeafieChatPanel({
  isOpen,
  messages,
  loading,
  error,
  onRetry,
  onClose,
  onSendMessage,
  onSuggestionSelect,
  onClearHistory,
}: LeafieChatPanelProps) {
  const [inputValue, setInputValue] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const voiceDraftRef = useRef('')
  const voice = useSpeechInput(isOpen && !loading && !showConfirmDialog, (transcript) => {
    setInputValue([voiceDraftRef.current, transcript].filter(Boolean).join(' ').slice(0, 2000))
  })
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = `${useId()}-leafie-title`
  const voiceHintId = `${useId()}-leafie-voice`

  // Panel giữ trong DOM khi đóng để còn transition trượt. `invisible` + `inert`
  // (trong hook) bỏ nó khỏi tab order và accessibility tree — không thì người dùng
  // bàn phím Tab vào một panel chat vô hình ngoài màn hình.
  useOverlayA11y({ containerRef: panelRef, open: isOpen, onClose })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)

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

    if (shouldAutoScrollRef.current) {
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
    }
  }, [messages, loading, error])

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
    if (inputValue.trim() && !loading && !voice.recording) {
      onSendMessage(inputValue)
      setInputValue('')
    }
  }

  const handleVoice = () => {
    if (voice.recording) {
      voice.stop()
    } else {
      voiceDraftRef.current = inputValue.trim()
      inputRef.current?.blur()
      voice.start()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 bg-bg-overlay z-overlay transition-[opacity,visibility] duration-300 ${
          isOpen ? 'visible opacity-40' : 'invisible opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel - Discord style */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`halloween-leafie-panel fixed right-0 top-0 h-[100dvh] w-full max-w-[400px] bg-[#fff] z-modal flex flex-col border-l border-[#dce1dd] shadow-xl outline-none transition-[transform,visibility] duration-slow sm:right-4 sm:top-4 sm:h-[min(650px,calc(100dvh-32px))] sm:rounded-[8px] sm:border ${
          isOpen ? 'visible translate-x-0' : 'invisible translate-x-full'
        }`}
      >
        {/* Header - Discord style */}
        <div className="halloween-leafie-header flex-shrink-0 flex items-center justify-between px-4 py-3.5 border-b border-[#edf0ed] bg-[#fff]">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-full bg-brand-subtle overflow-hidden">
              <img
                src="/branding/liceria.png"
                alt="Leafie"
                className="relative z-10 w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 id={titleId} className="font-semibold text-[#28362c] text-[15px]">Leafie</h3>
              <p className="mt-0.5 text-[11px] text-[#727b75]">Một chút phép màu từ căn bếp</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 1 && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="rounded-md p-2 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg focus-visible:ring-2 focus-visible:ring-focus"
                  aria-label="Menu"
                  title="Tùy chọn"
                  aria-expanded={showMenu}
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-full z-dropdown mt-2 min-w-[180px] overflow-hidden rounded-lg border border-border bg-bg-surface shadow-xl">
                    <button
                      onClick={handleClearHistoryClick}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-fg hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      <Trash2 className="w-4 h-4 text-fg-muted" />
                      <span>Xóa lịch sử</span>
                    </button>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={onClose}
              className="rounded-md p-2 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg focus-visible:ring-2 focus-visible:ring-focus"
              aria-label="Đóng"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages - Discord style container */}
        <div className="min-h-0 flex-1 overflow-hidden bg-[#fafbf9]">
          <div 
            className="h-full overflow-y-auto overscroll-contain px-4"
            ref={scrollContainerRef}
            style={{ scrollBehavior: 'smooth' }}
          >
            <LeafieMessageList
              messages={messages}
              loading={loading}
              onSuggestionSelect={onSuggestionSelect}
            />
            {error && <div role="alert" className="mb-4 rounded-md border border-[#efcfca] bg-[#fff7f5] p-3 text-xs leading-5 text-[#985146]">
              <p>{error}</p>
              <button type="button" onClick={onRetry} disabled={loading} className="mt-2 rounded-md border border-current px-3 py-1.5 font-medium disabled:opacity-50">Thử lại</button>
            </div>}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input - Discord style */}
        <div className="flex-shrink-0 border-t border-[#e9eee8] bg-[#fff] px-3.5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Bạn muốn tìm bánh gì?"
              aria-label="Câu hỏi cho Leafie"
              maxLength={2000}
              disabled={loading}
              readOnly={voice.recording}
              className="min-w-0 flex-1 rounded-md border border-[#e6ebe4] bg-[#f6f8f5] px-3 py-2.5 text-base text-[#344236] placeholder:text-[#8a938b] outline-none transition-colors focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs"
            />
            <button
              type="button"
              onClick={handleVoice}
              aria-label={voice.recording ? 'Dừng nhập bằng giọng nói' : 'Nhập bằng giọng nói'}
              aria-pressed={voice.recording}
              aria-describedby={voiceHintId}
              title={voice.recording ? 'Dừng micro' : 'Nói tiếng Việt'}
              disabled={loading || !voice.supported || voice.status === 'stopping'}
              className={`grid size-11 shrink-0 place-items-center rounded-md border transition-colors focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50 ${voice.recording ? 'border-danger bg-danger-solid text-danger-fg-on-solid' : 'border-border bg-bg-surface text-brand hover:bg-brand-subtle'}`}
            >
              {voice.recording ? <Square className="size-4" aria-hidden="true" /> : <Mic className="size-5" aria-hidden="true" />}
            </button>
            <button
              type="submit"
              aria-label="Gửi câu hỏi"
              title="Gửi câu hỏi"
              disabled={!inputValue.trim() || loading || voice.recording}
              className="grid size-11 shrink-0 place-items-center rounded-md bg-brand text-fg-on-brand transition-colors hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p id={voiceHintId} role="status" className="mt-2 text-[11px] leading-4 text-fg-muted">
            {voice.status === 'starting' ? 'Đang mở micro…' : voice.status === 'listening' ? 'Đang nghe tiếng Việt… Nhấn nút dừng khi nói xong.' : voice.status === 'stopping' ? 'Đang hoàn tất lời nói…' : voice.supported ? 'Nhấn micro để nói, kiểm tra nội dung rồi nhấn Gửi.' : 'Trình duyệt chưa hỗ trợ voice. Bạn có thể dùng micro trên bàn phím điện thoại.'}
          </p>
          {voice.error && <p role="alert" className="mt-1 text-xs leading-5 text-danger">{voice.error}</p>}
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
