// Gift box info display component
import { Gift } from 'lucide-react'
import { parseGiftBoxMetadata } from '../../utils/giftBoxHelpers'

interface GiftBoxInfoProps {
  variantLabel?: string
}

export default function GiftBoxInfo({ variantLabel }: GiftBoxInfoProps) {
  const metadata = parseGiftBoxMetadata(variantLabel)
  if (!metadata) return null

  return (
    <div className="space-y-1.5">
      {metadata.giftMessage && (
        <div className="flex items-start gap-2 text-xs text-text-secondary bg-surface/50 rounded-md p-2">
          <Gift className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-accent-brown" />
          <span className="flex-1 leading-relaxed">
            <span className="font-medium text-text-primary">Lời nhắn:</span>{' '}
            <span className="italic">"{metadata.giftMessage}"</span>
          </span>
        </div>
      )}
      {metadata.addCard && (
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Gift className="w-3.5 h-3.5 flex-shrink-0 text-accent-brown" />
          <span className="font-medium">Có kèm thiệp chúc mừng</span>
        </div>
      )}
    </div>
  )
}

