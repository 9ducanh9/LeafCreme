// Gift box summary card - sticky on desktop, shows all product info in one card
import { useState } from 'react'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { formatPrice } from '../../utils/formatPrice'
import { GiftBox } from '../../types/giftBox'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface GiftBoxSummaryProps {
  giftBox: GiftBox
  giftMessage: string
  addCard: boolean
  onGiftMessageChange: (message: string) => void
  onAddCardChange: (add: boolean) => void
  onAddToCart: () => void
  loading?: boolean
}

export default function GiftBoxSummary({
  giftBox,
  giftMessage,
  addCard,
  onGiftMessageChange,
  onAddCardChange,
  onAddToCart,
  loading = false,
}: GiftBoxSummaryProps) {
  const [showOptions, setShowOptions] = useState(false)

  return (
    <div className="lg:sticky lg:top-24">
      <Card className="p-6">
        <div className="space-y-6">
          {/* Price */}
          <div className="pb-4 border-b border-border">
            <span className="font-heading text-3xl font-semibold text-text-primary tracking-tight">
              {formatPrice(giftBox.price)}
            </span>
          </div>

          {/* Included Items */}
          <div>
            <h2 className="font-heading text-base font-semibold text-text-primary mb-3">
              Sản phẩm bao gồm
            </h2>
            <ul className="space-y-2">
              {giftBox.includedItems.map((item, index) => (
                <li key={index} className="flex items-center text-sm text-text-secondary">
                  <span className="w-1.5 h-1.5 bg-accent-brown rounded-full mr-2 flex-shrink-0"></span>
                  <span>
                    {item.name} {item.quantity > 1 && <span className="text-text-primary font-medium">(x{item.quantity})</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <Button
            variant="primary"
            className="w-full"
            onClick={onAddToCart}
            disabled={loading}
          >
            {loading ? 'Đang thêm...' : 'Thêm vào giỏ'}
          </Button>

          {/* Optional Add-ons - Collapsible */}
          <div className="border-t border-border pt-6">
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className="w-full flex items-center justify-between text-sm font-medium text-text-secondary hover:text-text-primary transition-default py-1"
            >
              <span>Tùy chọn thêm</span>
              {showOptions ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showOptions && (
              <div className="mt-4 space-y-4">
                {/* Gift Message */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-2">
                    Lời nhắn tặng kèm (tùy chọn)
                  </label>
                  <textarea
                    value={giftMessage}
                    onChange={(e) => onGiftMessageChange(e.target.value)}
                    placeholder="Nhập lời nhắn của bạn..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white text-text-primary focus:outline-none focus:border-accent-brown transition-default resize-none"
                  />
                </div>

                {/* Add Card */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="addCard"
                    checked={addCard}
                    onChange={(e) => onAddCardChange(e.target.checked)}
                    className="w-4 h-4 text-accent-brown border-border rounded focus:ring-accent-brown"
                  />
                  <label htmlFor="addCard" className="ml-2 text-sm text-text-secondary">
                    Thêm thiệp chúc mừng
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

