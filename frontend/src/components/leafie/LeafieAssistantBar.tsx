// Leafie Assistant Bar - compact entry point for AI assistant
import { Leaf } from 'lucide-react'
import Card from '../ui/Card'
import LeafieSuggestionChips from './LeafieSuggestionChips'

interface LeafieAssistantBarProps {
  onOpenChat: () => void
  onSuggestionClick: (suggestion: string) => void
}

const QUICK_SUGGESTIONS = [
  'Sản phẩm bán chạy',
  'Hộp quà sinh nhật',
  'Kích thước cho 6 người?',
]

export default function LeafieAssistantBar({
  onOpenChat,
  onSuggestionClick,
}: LeafieAssistantBarProps) {
  return (
    <Card className="border-border-warm">
      <div className="flex flex-col md:flex-row md:items-center gap-5 p-5 md:p-6">
        {/* Left: Icon and text */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-accent-yellow/30 to-accent-yellow/10 flex items-center justify-center shadow-sm border border-accent-yellow/20">
            <Leaf className="w-7 h-7 text-accent-brown" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-text-primary mb-1.5 text-base leading-tight">Leafie có thể giúp bạn</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Tìm sản phẩm phù hợp, chọn kích thước, hoặc gợi ý hộp quà
            </p>
          </div>
        </div>

        {/* Right: Suggestions and open button */}
        <div className="flex flex-col gap-3 md:items-end md:flex-shrink-0">
          <LeafieSuggestionChips
            suggestions={QUICK_SUGGESTIONS}
            onSelect={onSuggestionClick}
          />
          <button
            onClick={onOpenChat}
            className="text-sm text-accent-brown hover:text-accent-brown/80 font-medium transition-default whitespace-nowrap self-start md:self-end"
          >
            Mở trò chuyện với Leafie →
          </button>
        </div>
      </div>
    </Card>
  )
}

