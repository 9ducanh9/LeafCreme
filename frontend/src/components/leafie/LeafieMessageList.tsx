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
            className={`group flex gap-3 px-2 md:px-4 py-1 hover:bg-[#F0EDE5]/30 transition-colors ${
              isUser ? 'flex-row-reverse' : ''
            }`}
          >
            {/* Avatar - Discord style */}
            {showAvatar ? (
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                isUser 
                  ? 'bg-gradient-to-br from-[#C59B72] to-[#D4A574]' 
                  : 'bg-gradient-to-br from-[#F5C96A]/40 to-[#C59B72]/30 border-2 border-[#C59B72]/30'
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
                    <User className="w-5 h-5 text-white" strokeWidth={2} />
                  )
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent animate-pulse" />
                    <Leaf className="w-5 h-5 text-[#C59B72] relative z-10" strokeWidth={2.5} />
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
                    isUser ? 'text-[#C59B72]' : 'text-[#473C2F]'
                  }`}>
                    {isUser ? (user?.ho_ten || 'Bạn') : 'Leafie'}
                  </span>
                  <span className="text-xs text-[#7A6F63]">
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
                    ? 'bg-gradient-to-r from-[#C59B72] to-[#D4A574] text-white rounded-tr-sm'
                    : 'bg-white border border-[#E8E5DD] text-[#473C2F] rounded-tl-sm shadow-sm'
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
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#F5C96A]/40 to-[#C59B72]/30 border-2 border-[#C59B72]/30 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent animate-pulse" />
            <Leaf className="w-5 h-5 text-[#C59B72] relative z-10" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-[#473C2F]">Leafie</span>
              <span className="text-xs text-[#7A6F63]">đang nhập...</span>
            </div>
            <div className="bg-white border border-[#E8E5DD] rounded-lg rounded-tl-sm px-3 py-1.5 shadow-sm inline-block">
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-[#C59B72] animate-dot-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#C59B72] animate-dot-bounce" style={{ animationDelay: '200ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#C59B72] animate-dot-bounce" style={{ animationDelay: '400ms' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
