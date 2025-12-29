// Cart summary component - shows subtotal, shipping, total, and CTA buttons
import { useState, useEffect } from 'react'
import { formatPrice } from '../../utils/formatPrice'
import { Tag, X } from 'lucide-react'

interface CartSummaryProps {
  subtotal: number
  itemCount?: number // Total quantity of items
  shipping?: number // Optional shipping estimate
  showShipping?: boolean
  discount?: number // Discount amount from voucher
  onCheckout?: () => void
  onContinueShopping?: () => void
  onApplyVoucher?: (voucherCode: string) => Promise<{ success: boolean; error?: string; discountAmount?: number }>
  checkoutLabel?: string
  continueShoppingLabel?: string
  compact?: boolean // For drawer vs full page
}

export default function CartSummary({
  subtotal,
  itemCount,
  shipping,
  showShipping = false,
  discount = 0,
  onCheckout,
  onContinueShopping,
  onApplyVoucher,
  checkoutLabel = 'Thanh toán',
  continueShoppingLabel = 'Tiếp tục mua sắm',
  compact = false,
}: CartSummaryProps) {
  const [voucherCode, setVoucherCode] = useState('')
  const [isApplying, setIsApplying] = useState(false)
  const [voucherError, setVoucherError] = useState<string | null>(null)
  const [appliedVoucherCode, setAppliedVoucherCode] = useState<string | null>(null)
  const shippingCost = shipping ?? 0
  const total = subtotal - discount + shippingCost

  // Sync appliedVoucherCode with discount prop
  useEffect(() => {
    if (discount === 0 && appliedVoucherCode) {
      // If discount becomes 0, clear the local applied voucher state
      setAppliedVoucherCode(null)
    }
  }, [discount, appliedVoucherCode])

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim() || !onApplyVoucher) return
    setIsApplying(true)
    setVoucherError(null)
    try {
      const result = await onApplyVoucher(voucherCode.trim())
      if (result.success) {
        setAppliedVoucherCode(voucherCode.trim().toUpperCase())
        setVoucherCode('')
      } else {
        setVoucherError(result.error || 'Mã giảm giá không hợp lệ')
      }
    } catch (error) {
      setVoucherError('Có lỗi xảy ra khi áp dụng mã giảm giá')
    } finally {
      setIsApplying(false)
    }
  }

  const handleRemoveVoucher = () => {
    if (onApplyVoucher) {
      // Call with empty string to remove
      onApplyVoucher('')
    }
    setAppliedVoucherCode(null)
    setVoucherCode('')
    setVoucherError(null)
  }

  if (compact) {
    // Compact version for drawer
    return (
      <div>
        {/* Voucher Input */}
        {onApplyVoucher && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-text-secondary mb-2">
              Mã giảm giá
            </label>
            {appliedVoucherCode ? (
              <div className="flex items-center justify-between p-2 bg-accent-yellow/20 border border-accent-yellow rounded-input">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-accent-brown" />
                  <span className="text-sm font-medium text-text-primary">{appliedVoucherCode}</span>
                </div>
                <button
                  onClick={handleRemoveVoucher}
                  className="p-1 hover:bg-accent-yellow/30 rounded-button transition-default"
                  aria-label="Xóa mã giảm giá"
                >
                  <X className="w-4 h-4 text-text-secondary" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    <input
                      type="text"
                      value={voucherCode}
                      onChange={(e) => {
                        setVoucherCode(e.target.value.toLowerCase())
                        setVoucherError(null)
                      }}
                      placeholder="Nhập mã giảm giá (nếu có)"
                      className={`w-full pl-10 pr-4 py-2 text-sm rounded-input border ${
                        voucherError ? 'border-accent-pink' : 'border-border'
                      } focus:outline-none focus:border-accent-brown transition-default uppercase`}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleApplyVoucher()
                        }
                      }}
                    />
                  </div>
                  <button
                    onClick={handleApplyVoucher}
                    disabled={!voucherCode.trim() || isApplying}
                    className="px-4 py-2 text-sm rounded-button border border-border text-text-secondary hover:border-accent-brown hover:text-accent-brown transition-default disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {isApplying ? 'Đang áp dụng...' : 'Áp dụng'}
                  </button>
                </div>
                {voucherError && (
                  <p className="mt-1 text-xs text-accent-pink">{voucherError}</p>
                )}
              </>
            )}
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <span className="text-text-secondary">Tạm tính:</span>
          <span className="font-semibold text-text-primary">{formatPrice(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between items-center mb-4 text-accent-brown">
            <span className="text-sm">Giảm giá:</span>
            <span className="font-semibold text-sm">-{formatPrice(discount)}</span>
          </div>
        )}
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
      {/* Voucher Input */}
      {onApplyVoucher && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Mã giảm giá
          </label>
          {appliedVoucherCode ? (
            <div className="flex items-center justify-between p-3 bg-accent-yellow/20 border border-accent-yellow rounded-input">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-accent-brown" />
                <span className="text-sm font-medium text-text-primary">{appliedVoucherCode}</span>
              </div>
              <button
                onClick={handleRemoveVoucher}
                className="p-1 hover:bg-accent-yellow/30 rounded-button transition-default"
                aria-label="Xóa mã giảm giá"
              >
                <X className="w-4 h-4 text-text-secondary" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => {
                      setVoucherCode(e.target.value.toUpperCase())
                      setVoucherError(null)
                    }}
                    placeholder="Nhập mã giảm giá (nếu có)"
                    className={`w-full pl-10 pr-4 py-2 rounded-input border ${
                      voucherError ? 'border-accent-pink' : 'border-border'
                    } focus:outline-none focus:border-accent-brown transition-default uppercase`}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleApplyVoucher()
                      }
                    }}
                  />
                </div>
                <button
                  onClick={handleApplyVoucher}
                  disabled={!voucherCode.trim() || isApplying}
                  className="px-4 py-2 rounded-button border border-border text-text-secondary hover:border-accent-brown hover:text-accent-brown transition-default disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isApplying ? 'Đang áp dụng...' : 'Áp dụng'}
                </button>
              </div>
              {voucherError && (
                <p className="mt-1 text-xs text-accent-pink">{voucherError}</p>
              )}
            </>
          )}
        </div>
      )}

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
        {discount > 0 && (
          <div className="flex justify-between text-accent-brown">
            <span>Giảm giá:</span>
            <span className="font-medium">-{formatPrice(discount)}</span>
          </div>
        )}
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

