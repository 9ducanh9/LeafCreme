// Cart page - full cart page for detailed review and checkout
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { useCart } from '../contexts/CartContext'
import CartItem from '../components/cart/CartItem'
import CartSummary from '../components/cart/CartSummary'
import { ArrowLeft, ShoppingBag } from 'lucide-react'

export default function CartPage() {
  const navigate = useNavigate()
  const { cartItems, cartSubtotal, cartCount, updateQuantity, removeFromCart, clearCart } = useCart()
  const [confirmRemove, setConfirmRemove] = useState<{
    isOpen: boolean
    productId?: number
    variantId?: number
  }>({ isOpen: false })
  const [confirmClearAll, setConfirmClearAll] = useState(false)

  const handleRemoveItem = (productId: number, variantId?: number) => {
    setConfirmRemove({ isOpen: true, productId, variantId })
  }

  const handleConfirmRemove = () => {
    if (confirmRemove.productId !== undefined) {
      removeFromCart(confirmRemove.productId, confirmRemove.variantId)
    }
    setConfirmRemove({ isOpen: false })
  }

  const handleClearAll = () => {
    setConfirmClearAll(true)
  }

  const handleConfirmClearAll = () => {
    clearCart()
    setConfirmClearAll(false)
  }

  const handleContinueShopping = () => {
    navigate('/search')
  }

  const handleCheckout = () => {
    navigate('/checkout')
  }

  // Empty cart state
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background py-16">
        <div className="max-w-[1440px] mx-auto px-6">
          <Button variant="outline" onClick={() => navigate('/')} className="mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tiếp tục mua sắm
          </Button>

          <Card className="text-center py-16">
            <ShoppingBag className="w-20 h-20 text-text-secondary/30 mx-auto mb-6" />
            <h2 className="font-heading text-3xl font-semibold text-text-primary mb-4">
              Giỏ hàng của bạn đang trống.
            </h2>
            <p className="text-text-secondary mb-8">
              Khám phá các sản phẩm tuyệt vời từ Leaf Crème
            </p>
            <Button variant="primary" onClick={() => navigate('/search')}>
              Khám phá bánh tại Leaf Crème
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="max-w-[1440px] mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tiếp tục mua sắm
          </Button>
          <Button variant="outline" onClick={handleClearAll} className="text-sm">
            Xóa tất cả
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items List - Left Side */}
          <div className="lg:col-span-2">
            <Card className="p-0">
              <div className="p-6 border-b border-border">
                <h2 className="font-heading text-2xl font-semibold text-text-primary">
                  Sản phẩm trong giỏ hàng ({cartCount})
                </h2>
              </div>
              <div className="divide-y divide-border">
                {cartItems.map((item) => (
                  <div key={`${item.productId}-${item.variantId || 'none'}`} className="px-6">
                    <CartItem
                      item={item}
                      onQuantityChange={updateQuantity}
                      onRemove={handleRemoveItem}
                      compact={false}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Cart Summary - Right Side (Sticky on Desktop) */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <h2 className="font-heading text-2xl font-semibold text-text-primary mb-6">
                Tóm tắt đơn hàng
              </h2>

              <CartSummary
                subtotal={cartSubtotal}
                itemCount={cartCount}
                shipping={0} // Can be calculated or fetched from API
                showShipping={false} // Set to true if shipping is available
                onCheckout={handleCheckout}
                onContinueShopping={handleContinueShopping}
                checkoutLabel="Tiến hành thanh toán"
                continueShoppingLabel="Tiếp tục mua sắm"
                compact={false}
              />
            </Card>
          </div>
        </div>
      </div>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={confirmRemove.isOpen}
        message="Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?"
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirmRemove({ isOpen: false })}
        variant="danger"
      />
      <ConfirmDialog
        isOpen={confirmClearAll}
        message="Bạn có chắc muốn xóa tất cả sản phẩm khỏi giỏ hàng?"
        confirmLabel="Xóa tất cả"
        cancelLabel="Hủy"
        onConfirm={handleConfirmClearAll}
        onCancel={() => setConfirmClearAll(false)}
        variant="danger"
      />
    </div>
  )
}
