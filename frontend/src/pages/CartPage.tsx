// Cart page - displays and manages shopping cart
import { useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { formatPrice } from '../utils/formatPrice'
import { useCart } from '../contexts/CartContext'
import { ArrowLeft, Plus, Minus, Trash2 } from 'lucide-react'

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80'

export default function CartPage() {
  const navigate = useNavigate()
  const { cart, updateQuantity, removeFromCart, clearCart } = useCart()

  const handleQuantityChange = (productId: number, currentQuantity: number, change: number, variantId?: number) => {
    const newQuantity = currentQuantity + change
    updateQuantity(productId, newQuantity, variantId)
  }

  const handleRemoveItem = (productId: number, variantId?: number) => {
    if (confirm('Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?')) {
      removeFromCart(productId, variantId)
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-background py-16">
        <div className="max-w-[1440px] mx-auto px-6">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="mb-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tiếp tục mua sắm
          </Button>

          <Card className="text-center py-16">
            <h2 className="font-heading text-3xl font-semibold text-text-primary mb-4">
              Giỏ hàng trống
            </h2>
            <p className="text-text-secondary mb-8">
              Bạn chưa có sản phẩm nào trong giỏ hàng.
            </p>
            <Button variant="primary" onClick={() => navigate('/')}>
              Xem sản phẩm
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
          <Button
            variant="outline"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tiếp tục mua sắm
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (confirm('Bạn có chắc muốn xóa tất cả sản phẩm khỏi giỏ hàng?')) {
                clearCart()
              }
            }}
            className="text-sm"
          >
            Xóa tất cả
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => (
              <Card key={`${item.productId}-${item.variantId || 'none'}`}>
                <div className="flex gap-6">
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    <img
                      src={item.productImage || FALLBACK_IMAGE}
                      alt={item.productName}
                      className="w-24 h-24 object-cover rounded-card"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = FALLBACK_IMAGE
                      }}
                    />
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex-1">
                      <h3 className="font-heading text-xl font-semibold text-text-primary mb-1">
                        {item.productName}
                      </h3>
                      {item.variantLabel && (
                        <p className="text-text-secondary text-sm mb-2">
                          {item.variantLabel}
                        </p>
                      )}
                      <p className="font-semibold text-text-primary">
                        {formatPrice(item.price)}
                      </p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            handleQuantityChange(
                              item.productId,
                              item.quantity,
                              -1,
                              item.variantId
                            )
                          }
                          className="p-1 rounded-button border border-border hover:border-accent-brown transition-default"
                          aria-label="Giảm số lượng"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-semibold text-text-primary w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            handleQuantityChange(
                              item.productId,
                              item.quantity,
                              1,
                              item.variantId
                            )
                          }
                          className="p-1 rounded-button border border-border hover:border-accent-brown transition-default"
                          aria-label="Tăng số lượng"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-lg text-text-primary">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                        <button
                          onClick={() =>
                            handleRemoveItem(item.productId, item.variantId)
                          }
                          className="p-2 text-text-secondary hover:text-accent-brown transition-default"
                          aria-label="Xóa sản phẩm"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <h2 className="font-heading text-2xl font-semibold text-text-primary mb-6">
                Tóm tắt đơn hàng
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-text-secondary">
                  <span>Số lượng sản phẩm:</span>
                  <span className="font-medium text-text-primary">
                    {cart.itemCount}
                  </span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Tạm tính:</span>
                  <span className="font-medium text-text-primary">
                    {formatPrice(cart.total)}
                  </span>
                </div>
                <div className="border-t border-border pt-4">
                  <div className="flex justify-between">
                    <span className="font-heading text-xl font-semibold text-text-primary">
                      Tổng cộng:
                    </span>
                    <span className="font-heading text-xl font-semibold text-text-primary">
                      {formatPrice(cart.total)}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full py-4 text-lg"
                onClick={() => navigate('/checkout')}
              >
                Thanh toán
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

