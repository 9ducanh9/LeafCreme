// Cart item row component - shared between CartDrawer and CartPage
import { Plus, Minus, Trash2 } from 'lucide-react'
import { CartItem as CartItemType } from '../../types/cart'
import { formatPrice } from '../../utils/formatPrice'
import { FALLBACK_IMAGE } from '../../constants/images'
import GiftBoxInfo from './GiftBoxInfo'
import { parseGiftBoxMetadata } from '../../utils/giftBoxHelpers'

interface CartItemProps {
  item: CartItemType
  onQuantityChange: (productId: number, newQuantity: number, variantId?: number) => void
  onRemove: (productId: number, variantId?: number) => void
  compact?: boolean // For drawer vs full page
}

export default function CartItem({ item, onQuantityChange, onRemove, compact = false }: CartItemProps) {
  const handleDecrease = () => {
    if (item.quantity > 1) {
      onQuantityChange(item.productId, item.quantity - 1, item.variantId)
    } else {
      onRemove(item.productId, item.variantId)
    }
  }

  const handleIncrease = () => {
    onQuantityChange(item.productId, item.quantity + 1, item.variantId)
  }

  const imageUrl = item.productImage || FALLBACK_IMAGE.cart
  const itemTotal = item.price * item.quantity

  if (compact) {
    // Compact version for drawer
    return (
      <div className="flex gap-4 py-4 border-b border-border last:border-b-0">
        {/* Thumbnail */}
        <div className="flex-shrink-0">
          <img
            src={imageUrl}
            alt={item.productName}
            className="w-20 h-20 object-cover rounded-card"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = FALLBACK_IMAGE.cart
            }}
          />
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-heading text-base font-semibold text-text-primary mb-1 truncate">
            {item.productName}
          </h4>
          <GiftBoxInfo variantLabel={item.variantLabel} />
          {!parseGiftBoxMetadata(item.variantLabel) && item.variantLabel && (
            <p className="text-xs text-text-secondary mb-2">{item.variantLabel}</p>
          )}
          <p className="font-semibold text-text-primary mb-3">{formatPrice(item.price)}</p>

          {/* Quantity Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handleDecrease}
                className="p-1 rounded-button border border-border hover:border-accent-brown transition-default"
                aria-label="Giảm số lượng"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-medium text-text-primary w-6 text-center text-sm">
                {item.quantity}
              </span>
              <button
                onClick={handleIncrease}
                className="p-1 rounded-button border border-border hover:border-accent-brown transition-default"
                aria-label="Tăng số lượng"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => onRemove(item.productId, item.variantId)}
              className="p-1.5 text-text-secondary hover:text-accent-brown transition-default"
              aria-label="Xóa sản phẩm"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Full version for cart page
  return (
    <div className="flex gap-6 py-6 border-b border-border last:border-b-0">
      {/* Product Image */}
      <div className="flex-shrink-0">
        <img
          src={imageUrl}
          alt={item.productName}
          className="w-24 h-24 object-cover rounded-card"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = FALLBACK_IMAGE.cart
          }}
        />
      </div>

      {/* Product Info */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1">
          <h3 className="font-heading text-xl font-semibold text-text-primary mb-1">
            {item.productName}
          </h3>
          <GiftBoxInfo variantLabel={item.variantLabel} />
          {!parseGiftBoxMetadata(item.variantLabel) && item.variantLabel && (
            <p className="text-text-secondary text-sm mb-2">{item.variantLabel}</p>
          )}
          <p className="font-semibold text-text-primary">{formatPrice(item.price)}</p>
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleDecrease}
              className="p-1 rounded-button border border-border hover:border-accent-brown transition-default"
              aria-label="Giảm số lượng"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-semibold text-text-primary w-8 text-center">
              {item.quantity}
            </span>
            <button
              onClick={handleIncrease}
              className="p-1 rounded-button border border-border hover:border-accent-brown transition-default"
              aria-label="Tăng số lượng"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-semibold text-lg text-text-primary">
              {formatPrice(itemTotal)}
            </span>
            <button
              onClick={() => onRemove(item.productId, item.variantId)}
              className="p-2 text-text-secondary hover:text-accent-brown transition-default"
              aria-label="Xóa sản phẩm"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

