// Cart summary component - shows subtotal, shipping, total, and CTA buttons
import { formatPrice } from '../../utils/formatPrice'

interface CartSummaryProps {
  subtotal: number
  itemCount?: number // Total quantity of items
  shipping?: number // Optional shipping estimate
  showShipping?: boolean
  onCheckout?: () => void
  onContinueShopping?: () => void
  checkoutLabel?: string
  continueShoppingLabel?: string
  compact?: boolean // For drawer vs full page
}

export default function CartSummary({
  subtotal,
  itemCount,
  shipping,
  showShipping = false,
  onCheckout,
  onContinueShopping,
  checkoutLabel = 'Thanh toán',
  continueShoppingLabel = 'Tiếp tục mua sắm',
  compact = false,
}: CartSummaryProps) {
  const shippingCost = shipping ?? 0
  const total = subtotal + shippingCost

  if (compact) {
    // Compact version for drawer
    return (
      <div className="border-t border-border pt-4 mt-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-text-secondary">Tạm tính:</span>
          <span className="font-semibold text-text-primary">{formatPrice(subtotal)}</span>
        </div>
        {onCheckout && (
          <button
            onClick={onCheckout}
            disabled={subtotal === 0}
            className="w-full py-3 rounded-button bg-accent-brown text-white font-medium hover:bg-accent-brown/90 transition-default disabled:opacity-50 disabled:cursor-not-allowed mb-2"
          >
            {checkoutLabel}
          </button>
        )}
        {onContinueShopping && (
          <button
            onClick={onContinueShopping}
            className="w-full py-3 rounded-button border border-border text-text-secondary hover:border-accent-brown transition-default"
          >
            {continueShoppingLabel}
          </button>
        )}
      </div>
    )
  }

  // Full version for cart page
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {itemCount !== undefined && (
          <div className="flex justify-between text-text-secondary">
            <span>Số lượng sản phẩm:</span>
            <span className="font-medium text-text-primary">{itemCount}</span>
          </div>
        )}
        <div className="flex justify-between text-text-secondary">
          <span>Tạm tính:</span>
          <span className="font-medium text-text-primary">{formatPrice(subtotal)}</span>
        </div>
        {showShipping && (
          <div className="flex justify-between text-text-secondary">
            <span>Phí vận chuyển:</span>
            <span className="font-medium text-text-primary">
              {shippingCost > 0 ? formatPrice(shippingCost) : 'Miễn phí'}
            </span>
          </div>
        )}
        <div className="border-t border-border pt-4">
          <div className="flex justify-between">
            <span className="font-heading text-xl font-semibold text-text-primary">Tổng cộng:</span>
            <span className="font-heading text-xl font-semibold text-text-primary">
              {formatPrice(total)}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-4">
        {onContinueShopping && (
          <button
            onClick={onContinueShopping}
            className="w-full py-3 rounded-button border border-border text-text-secondary hover:border-accent-brown transition-default"
          >
            {continueShoppingLabel}
          </button>
        )}
        {onCheckout && (
          <button
            onClick={onCheckout}
            disabled={subtotal === 0}
            className="w-full py-4 rounded-button bg-accent-brown text-white font-medium hover:bg-accent-brown/90 transition-default disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {checkoutLabel}
          </button>
        )}
      </div>
    </div>
  )
}

