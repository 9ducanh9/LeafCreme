// Gift box story component - collapsible
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface GiftBoxStoryProps {
  story: string
}

export default function GiftBoxStory({ story }: GiftBoxStoryProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Show first 2-3 sentences as preview
  const previewLength = 150
  const hasMore = story.length > previewLength
  const preview = hasMore ? story.substring(0, previewLength) + '...' : story
  const displayText = isExpanded ? story : preview

  if (!story) return null

  return (
    <div className="border-t border-border pt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading text-lg font-semibold text-text-primary">
          Câu chuyện
        </h2>
        {hasMore && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-default"
          >
            {isExpanded ? (
              <>
                <span>Thu gọn</span>
                <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                <span>Đọc thêm</span>
                <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        )}
      </div>
      <p className="text-sm text-text-secondary leading-relaxed">
        {displayText}
      </p>
    </div>
  )
}

