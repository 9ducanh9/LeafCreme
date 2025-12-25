// Cart page - full cart page for detailed review and checkout
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import { scanLookup } from '../services/lookupService'
import CartItem from '../components/cart/CartItem'
import CartSummary from '../components/cart/CartSummary'
import { ArrowLeft, ShoppingBag } from 'lucide-react'

export default function CartPage() {
  const navigate = useNavigate()
  const { cartItems, cartSubtotal, cartCount, updateQuantity, removeFromCart, clearCart, addToCart } = useCart()
  const { showSuccess, showError } = useToast()
  const [confirmRemove, setConfirmRemove] = useState<{
    isOpen: boolean
    productId?: number
    variantId?: number
  }>({ isOpen: false })
  const [confirmClearAll, setConfirmClearAll] = useState(false)
  const [scanText, setScanText] = useState('')
  const [scanLoading, setScanLoading] = useState(false)

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

  const handleScanSubmit = async () => {
    const code = scanText.trim()
    if (!code) return
    setScanLoading(true)
    try {
      const res = await scanLookup(code)
      if (res.type !== 'variant' && res.type !== 'product') {
        showError('Mã này không phải mã sản phẩm để thêm vào giỏ')
        return
      }

      if (!res.product_id || !res.product_name || !res.price) {
        showError('Dữ liệu sản phẩm không hợp lệ từ mã scan')
        return
      }

      addToCart({
        productId: Number(res.product_id),
        productName: res.product_name,
        productImage: res.product_image || undefined,
        variantId: res.type === 'variant' ? (res.variant_id ? Number(res.variant_id) : undefined) : undefined,
        variantLabel: res.type === 'variant' ? (res.variant_label || undefined) : undefined,
        price: Number(res.price),
        sku: res.sku || undefined,
        quantity: 1,
      })

      showSuccess('Đã thêm vào giỏ hàng')
    } catch (err) {
      showError('Không thể scan/tra cứu sản phẩm')
    } finally {
      setScanLoading(false)
      setScanText('')
    }
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

        <Card className="mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex-1">
              <label className="block text-sm font-medium text-text-primary mb-2">Scan SKU để thêm nhanh</label>
              <input
                value={scanText}
                onChange={(e) => setScanText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleScanSubmit()
                  }
                }}
                placeholder="Dán mã rồi Enter (VD: VAR:SKU hoặc sku_bienthe)"
                className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
                disabled={scanLoading}
              />
            </div>
            <div className="pt-6 sm:pt-0">
              <Button variant="primary" onClick={handleScanSubmit} disabled={scanLoading || !scanText.trim()}>
                {scanLoading ? 'Đang tra...' : 'Thêm'}
              </Button>
            </div>
          </div>
        </Card>

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
