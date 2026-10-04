// Message list component - Discord style
import { useState, useEffect } from 'react'
import { User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getImageUrl } from '../../utils/getImageUrl'
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
  const { user } = useAuth()
  const [avatarError, setAvatarError] = useState(false)

  useEffect(() => {
    setAvatarError(false)
  }, [user?.avatar_url])

  // Discord style: All messages left-aligned with avatar
  return (
    <div className="py-4 space-y-1">
      {messages.length === 0 && !loading && <div className="px-3 py-5">
        <h4 className="text-lg font-semibold text-fg-strong">Mình giúp bạn chọn bánh nhé?</h4>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">Bạn đang chọn cho dịp gì, bao nhiêu người và khoảng ngân sách nào?</p>
        <div className="mt-5 flex flex-col items-start gap-2">
          {['Chọn bánh cho sinh nhật 4 người', 'Gợi ý hộp quà dưới 300.000đ', 'Bánh nào đang còn hàng?'].map((suggestion) => <button key={suggestion} type="button" onClick={() => onSuggestionSelect(suggestion)} className="rounded-lg border border-border bg-bg-surface px-3 py-2 text-left text-sm text-fg hover:border-brand">{suggestion}</button>)}
        </div>
      </div>}
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
                      src={getImageUrl(user.avatar_url)}
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
                    <img
                      src="/branding/liceria.png"
                      alt="Leafie"
                      className="relative z-10 w-full h-full object-cover"
                    />
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
              {!isUser && (message.products ?? []).length > 0 && <div className="mt-2 w-full space-y-2">
                {message.products?.map((product) => <div key={`${product.kind}-${product.id}`} className="rounded-lg border border-border bg-bg-surface p-3 text-sm">
                  <Link to={product.kind === 'gift_box' ? `/gift-boxes/${product.id}` : `/products/${product.id}`} className="font-semibold text-fg-strong hover:underline">{product.name}</Link>
                  <p className="mt-1 font-medium text-brand-fg">{product.variants.length > 1 ? 'Từ ' : ''}{new Intl.NumberFormat('vi-VN').format(product.price)} đ</p>
                  {product.variants.length ? <ul className="mt-2 space-y-1 text-xs text-fg-muted">{product.variants.map((variant) => <li key={variant.id} className="flex flex-wrap justify-between gap-x-2"><span>{variant.size || 'Tiêu chuẩn'} · {new Intl.NumberFormat('vi-VN').format(variant.price)} đ</span><span>{variant.available ? 'Còn hàng' : 'Hết hàng'}</span></li>)}</ul> : <p className="mt-1 text-xs text-fg-muted">Cần xác nhận tình trạng còn hàng</p>}
                </div>)}
              </div>}
              {!isUser && index === messages.length - 1 && !loading && <div className="mt-2 flex flex-wrap gap-2">{message.suggestions?.map((suggestion) => <button key={suggestion} type="button" onClick={() => onSuggestionSelect(suggestion)} className="rounded-md border border-border px-2 py-1.5 text-left text-xs text-fg-muted hover:border-brand">{suggestion}</button>)}</div>}
            </div>
          </div>
        )
      })}

      {/* Loading indicator - Discord style */}
      {loading && (
        <div className="group flex gap-3 px-2 md:px-4 py-1">
          <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full border-2 border-brand-border-subtle bg-brand-subtle relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent animate-pulse" />
            <img
              src="/branding/liceria.png"
              alt="Leafie"
              className="relative z-10 w-full h-full object-cover"
            />
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
