// Message list component - Discord style
import { useState, useEffect } from 'react'
import { User, Leaf } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import type { LeafieMessage } from '../../types/leafie'

interface LeafieMessageListProps {
  messages: LeafieMessage[]
  loading: boolean
  onSuggestionSelect: (suggestion: string) => void
}

export default function LeafieMessageList({
  messages,
  loading,
  onSuggestionSelect,
}: LeafieMessageListProps) {
  void onSuggestionSelect
  const { user } = useAuth()
  const [avatarError, setAvatarError] = useState(false)

  useEffect(() => {
    setAvatarError(false)
  }, [user?.avatar_url])

  // Discord style: All messages left-aligned with avatar
  return (
    <div className="py-4 space-y-1">
      {messages.map((message, index) => {
        const isUser = message.role === 'user'
        const showAvatar = index === 0 || messages[index - 1].role !== message.role
        
        return (
          <div
            key={message.id}
            className={`group flex gap-3 px-2 py-1 transition-colors hover:bg-bg-subtle md:px-4 ${
              isUser ? 'flex-row-reverse' : ''
            }`}
          >
            {/* Avatar - Discord style */}
            {showAvatar ? (
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                isUser 
                  ? 'bg-brand text-fg-on-brand'
                  : 'border-2 border-brand-border-subtle bg-brand-subtle'
              } relative overflow-hidden`}>
                {isUser ? (
                  user?.avatar_url && user.avatar_url.trim() && !avatarError ? (
                    <img
                      src={
                        user.avatar_url.startsWith('http')
                          ? user.avatar_url
                          : `${
                              import.meta.env.VITE_API_BASE_URL ||
                              'http://localhost:8000'
                            }${user.avatar_url}`
                      }
                      alt={user.ho_ten || 'User'}
                      className="w-full h-full object-cover"
                      onError={() => {
                        setAvatarError(true)
                      }}
                    />
                  ) : (
                    <User className="w-5 h-5 text-fg-on-brand" strokeWidth={2} />
                  )
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent animate-pulse" />
                    <Leaf className="relative z-10 h-5 w-5 text-brand-fg" strokeWidth={2.5} />
                  </>
                )}
              </div>
            ) : (
              <div className="w-10 flex-shrink-0" />
            )}

            {/* Message content - Discord style */}
            <div className={`flex-1 min-w-0 ${isUser ? 'flex items-end flex-col' : ''}`}>
              {showAvatar && (
                <div className={`flex items-center gap-2 mb-1 ${isUser ? 'flex-row-reverse' : ''}`}>
                  <span className={`font-semibold text-sm ${
                    isUser ? 'text-brand-fg' : 'text-fg-strong'
                  }`}>
                    {isUser ? (user?.ho_ten || 'Bạn') : 'Leafie'}
                  </span>
                  <span className="text-xs text-fg-subtle">
                    {new Date(message.timestamp).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
              
              {/* Message bubble - Discord style */}
              <div
                className={`inline-block max-w-[85%] md:max-w-[75%] rounded-lg px-3 py-1.5 ${
                  isUser
                    ? 'rounded-tr-sm bg-brand text-fg-on-brand'
                    : 'rounded-tl-sm border border-border-subtle bg-bg-surface text-fg shadow-sm'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {message.content}
                </p>
              </div>
            </div>
          </div>
        )
      })}

      {/* Loading indicator - Discord style */}
      {loading && (
        <div className="group flex gap-3 px-2 md:px-4 py-1">
          <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full border-2 border-brand-border-subtle bg-brand-subtle relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent animate-pulse" />
            <Leaf className="relative z-10 h-5 w-5 text-brand-fg" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-fg-strong">Leafie</span>
              <span className="text-xs text-fg-subtle">đang nhập...</span>
            </div>
            <div className="inline-block rounded-lg rounded-tl-sm border border-border-subtle bg-bg-surface px-3 py-1.5 shadow-sm">
              <div className="flex gap-1.5 items-center">
                <span className="h-2 w-2 rounded-full bg-brand animate-dot-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 rounded-full bg-brand animate-dot-bounce" style={{ animationDelay: '200ms' }} />
                <span className="h-2 w-2 rounded-full bg-brand animate-dot-bounce" style={{ animationDelay: '400ms' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
