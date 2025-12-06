// Mini cart drawer - right side drawer that opens from navbar cart icon
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ShoppingBag } from 'lucide-react'
import { useCart } from '../../contexts/CartContext'
import CartItem from './CartItem'
import CartSummary from './CartSummary'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const navigate = useNavigate()
  const { cartItems, cartSubtotal, updateQuantity, removeFromCart, applyVoucher, removeVoucher, appliedVoucher } = useCart()

  const handleApplyVoucher = async (voucherCode: string): Promise<{ success: boolean; error?: string; discountAmount?: number }> => {
    if (!voucherCode.trim()) {
      removeVoucher()
      return { success: true }
    }
    return await applyVoucher(voucherCode)
  }

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Close drawer on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleViewCart = () => {
    onClose()
    navigate('/cart')
  }

  const handleCheckout = () => {
    onClose()
    navigate('/checkout')
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-screen w-full max-w-md bg-background z-50 shadow-lg transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
            <h2 className="font-heading text-2xl font-semibold text-text-primary">
              Giỏ hàng của bạn
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-background rounded-button transition-default"
              aria-label="Đóng giỏ hàng"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>

          {/* Cart Items List - Scrollable if needed */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <ShoppingBag className="w-16 h-16 text-text-secondary/30 mb-4" />
                <p className="font-heading text-lg text-text-secondary mb-2">
                  Giỏ hàng trống
                </p>
                <p className="text-sm text-text-secondary">
                  Thêm sản phẩm vào giỏ hàng để bắt đầu mua sắm
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {cartItems.map((item) => (
                  <CartItem
                    key={`${item.productId}-${item.variantId || 'none'}`}
                    item={item}
                    onQuantityChange={updateQuantity}
                    onRemove={removeFromCart}
                    compact
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer with Summary - Fixed at bottom */}
          {cartItems.length > 0 && (
            <div className="flex-shrink-0 border-t border-border bg-surface p-6">
              <CartSummary
                subtotal={cartSubtotal}
                discount={appliedVoucher?.discountAmount || 0}
                onCheckout={handleCheckout}
                onContinueShopping={handleViewCart}
                onApplyVoucher={handleApplyVoucher}
                checkoutLabel="Thanh toán"
                continueShoppingLabel="Xem giỏ hàng"
                compact
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
}

