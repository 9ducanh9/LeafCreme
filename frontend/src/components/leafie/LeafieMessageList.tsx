import type { LeafieMessage } from '../../types/leafie'
import LeafieProductCard from './LeafieProductCard'

interface LeafieMessageListProps {
  messages: LeafieMessage[]
  loading: boolean
  onSuggestionSelect: (suggestion: string) => void
}

const chip = 'rounded-lg border border-border bg-bg-surface px-3 py-2 text-left text-[11px] leading-4 text-fg-muted transition-colors hover:border-brand hover:bg-bg-surface-hover hover:text-brand-fg focus-visible:ring-2 focus-visible:ring-focus'

export default function LeafieMessageList({ messages, loading, onSuggestionSelect }: LeafieMessageListProps) {
  return <div className="space-y-4 py-5">
    {messages.length === 0 && !loading && <div className="halloween-leafie-welcome px-1 pt-8">
      <img src="/branding/liceria.png" alt="" className="mb-5 size-12 rounded-full ring-2 ring-brand-border-subtle" />
      <h4 className="max-w-64 text-2xl leading-8 text-fg-strong">Hôm nay bạn đang tìm bánh gì?</h4>
      <p className="mt-3 text-[13px] leading-6 text-fg-muted">Mình là Leafie, trợ lý AI của Leaf Creme.<br />Bạn cứ kể nhu cầu, mình sẽ giúp chọn bánh hoặc hộp quà.</p>
      <div className="mt-6 flex flex-col items-start gap-2">
        {['Gợi ý bánh sinh nhật', 'Gợi ý bánh dưới 300.000đ', 'Bánh chocolate nào đang còn hàng?'].map(suggestion =>
          <button key={suggestion} type="button" onClick={() => onSuggestionSelect(suggestion)} className={chip}>{suggestion}</button>)}
      </div>
    </div>}
    {messages.map((message, index) => message.role === 'user' ?
      <div key={message.id} className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-[10px] rounded-br-sm bg-brand px-3 py-2.5 text-[13px] font-medium leading-[1.6] text-fg-on-brand [overflow-wrap:anywhere]">{message.content}</p>
      </div> :
      <div key={message.id} className="flex items-start gap-2">
        <img src="/branding/liceria.png" alt="" className="size-6 shrink-0 rounded-full ring-1 ring-brand-border-subtle" />
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2 text-[10px] text-fg-subtle">
            <span className="font-semibold text-brand-fg">Leafie</span>
            <span>{Number.isNaN(new Date(message.timestamp).getTime()) ? '' : new Date(message.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <p className="whitespace-pre-wrap break-words rounded-[10px] rounded-tl-sm border border-border bg-bg-surface px-3 py-2.5 text-[13px] leading-[1.6] text-fg [overflow-wrap:anywhere]">{message.content}</p>
          {(message.products ?? []).length > 0 && <div className="mt-2 space-y-2">
            {message.products?.map(product => <LeafieProductCard key={`${product.kind}-${product.id}`} product={product} />)}
          </div>}
          {index === messages.length - 1 && !loading && <div className="mt-3 flex flex-wrap gap-1.5">
            {message.suggestions?.map(suggestion => <button key={suggestion} type="button" onClick={() => onSuggestionSelect(suggestion)} className={chip}>{suggestion}</button>)}
          </div>}
        </div>
      </div>)}
    {loading && <div className="flex items-start gap-2" role="status" aria-label="Leafie đang trả lời">
      <img src="/branding/liceria.png" alt="" className="size-6 shrink-0 rounded-full ring-1 ring-brand-border-subtle" />
      <div>
        <p className="mb-1.5 text-[10px] text-fg-muted">Leafie đang trả lời</p>
        <div className="flex h-9 items-center gap-1 rounded-[10px] border border-border bg-bg-surface px-3" aria-hidden="true">
          {[0, 150, 300].map(delay => <span key={delay} className="size-1.5 rounded-full bg-brand-fg motion-safe:animate-dot-bounce" style={{ animationDelay: `${delay}ms` }} />)}
        </div>
      </div>
    </div>}
  </div>
}
