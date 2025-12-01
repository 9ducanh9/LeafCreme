// Checkout page - order placement
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorMessage from '../components/ui/ErrorMessage'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { formatPrice } from '../utils/formatPrice'
import { createOrder, OrderCreate } from '../services/orderService'
import { ArrowLeft } from 'lucide-react'
import ProtectedRoute from '../components/routing/ProtectedRoute'

import { FALLBACK_IMAGE } from '../constants/images'

function CheckoutPageContent() {
  const navigate = useNavigate()
  const { cart, clearCart } = useCart()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [shippingInfo, setShippingInfo] = useState({
    ten_khach_hang: user?.ho_ten || '',
    so_dien_thoai_khach: user?.so_dien_thoai || '',
    dia_chi_giao_hang: user?.dia_chi || '',
    ngay_giao_du_kien: '',
    ghi_chu: '',
  })

  const [voucherCode, setVoucherCode] = useState('')

  useEffect(() => {
    if (cart.items.length === 0) {
      navigate('/cart')
    }
  }, [cart.items.length, navigate])

  const handleShippingChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setShippingInfo({
      ...shippingInfo,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!shippingInfo.ten_khach_hang.trim()) {
      setError('Vui lòng nhập tên khách hàng')
      return
    }

    if (!shippingInfo.so_dien_thoai_khach.trim()) {
      setError('Vui lòng nhập số điện thoại')
      return
    }

    if (!shippingInfo.dia_chi_giao_hang.trim()) {
      setError('Vui lòng nhập địa chỉ giao hàng')
      return
    }

    // Convert cart items to order items
    const orderItems = cart.items.map((item) => ({
      bienthe_id: item.variantId || undefined,
      so_luong: item.quantity,
    }))

    // Filter out items without variantId (shouldn't happen, but safety check)
    const validItems = orderItems.filter((item) => item.bienthe_id)

    if (validItems.length === 0) {
      setError('Giỏ hàng không hợp lệ. Vui lòng kiểm tra lại.')
      return
    }

    setLoading(true)

    try {
      const orderData: OrderCreate = {
        items: validItems,
        ten_khach_hang: shippingInfo.ten_khach_hang,
        so_dien_thoai_khach: shippingInfo.so_dien_thoai_khach,
        dia_chi_giao_hang: shippingInfo.dia_chi_giao_hang,
        ngay_giao_du_kien: shippingInfo.ngay_giao_du_kien
          ? new Date(shippingInfo.ngay_giao_du_kien).toISOString()
          : undefined,
        ghi_chu: shippingInfo.ghi_chu || undefined,
        phieu_giam_gia_codes: voucherCode ? [voucherCode] : undefined,
      }

      const order = await createOrder(orderData, 'online')

      // Clear cart after successful order
      clearCart()

      // Redirect to order confirmation
      navigate(`/orders/${order.donhang_id}/success`)
    } catch (err: any) {
      console.error('Error creating order:', err)
      setError(
        err.detail || 'Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.'
      )
    } finally {
      setLoading(false)
    }
  }

  // Calculate delivery date (minimum tomorrow)
  const minDeliveryDate = new Date()
  minDeliveryDate.setDate(minDeliveryDate.getDate() + 1)
  const minDateStr = minDeliveryDate.toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="max-w-[1440px] mx-auto px-6">
        <Button
          variant="outline"
          onClick={() => navigate('/cart')}
          className="mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại giỏ hàng
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <Card className="sticky top-24">
              <h2 className="font-heading text-2xl font-semibold text-text-primary mb-6">
                Đơn hàng của bạn
              </h2>

              <div className="space-y-4 mb-6">
                {cart.items.map((item) => (
                  <div key={`${item.productId}-${item.variantId || 'none'}`} className="flex gap-3">
                    <img
                      src={item.productImage || FALLBACK_IMAGE.cart}
                      alt={item.productName}
                      className="w-16 h-16 object-cover rounded-card"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = FALLBACK_IMAGE.cart
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-text-primary text-sm">
                        {item.productName}
                      </p>
                      {item.variantLabel && (
                        <p className="text-xs text-text-secondary">
                          {item.variantLabel}
                        </p>
                      )}
                      <p className="text-sm text-text-secondary">
                        {item.quantity} x {formatPrice(item.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-text-secondary">
                  <span>Tạm tính:</span>
                  <span className="font-medium text-text-primary">
                    {formatPrice(cart.total)}
                  </span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Phí vận chuyển:</span>
                  <span className="font-medium text-text-primary">
                    {formatPrice(0)}
                  </span>
                </div>
                <div className="border-t border-border pt-2">
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
            </Card>
          </div>

          {/* Checkout Form */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <Card>
              <h2 className="font-heading text-3xl font-semibold text-text-primary mb-6">
                Thông tin giao hàng
              </h2>

              {error && <ErrorMessage message={error} />}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="ten_khach_hang"
                      className="block text-sm font-medium text-text-primary mb-2"
                    >
                      Tên khách hàng <span className="text-accent-brown">*</span>
                    </label>
                    <input
                      id="ten_khach_hang"
                      name="ten_khach_hang"
                      type="text"
                      value={shippingInfo.ten_khach_hang}
                      onChange={handleShippingChange}
                      required
                      className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="so_dien_thoai_khach"
                      className="block text-sm font-medium text-text-primary mb-2"
                    >
                      Số điện thoại <span className="text-accent-brown">*</span>
                    </label>
                    <input
                      id="so_dien_thoai_khach"
                      name="so_dien_thoai_khach"
                      type="tel"
                      value={shippingInfo.so_dien_thoai_khach}
                      onChange={handleShippingChange}
                      required
                      className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="dia_chi_giao_hang"
                    className="block text-sm font-medium text-text-primary mb-2"
                  >
                    Địa chỉ giao hàng <span className="text-accent-brown">*</span>
                  </label>
                  <textarea
                    id="dia_chi_giao_hang"
                    name="dia_chi_giao_hang"
                    value={shippingInfo.dia_chi_giao_hang}
                    onChange={handleShippingChange}
                    required
                    rows={3}
                    className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default resize-none"
                    disabled={loading}
                    placeholder="Nhập địa chỉ chi tiết"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ngay_giao_du_kien"
                    className="block text-sm font-medium text-text-primary mb-2"
                  >
                    Ngày giao dự kiến
                  </label>
                  <input
                    id="ngay_giao_du_kien"
                    name="ngay_giao_du_kien"
                    type="date"
                    value={shippingInfo.ngay_giao_du_kien}
                    onChange={handleShippingChange}
                    min={minDateStr}
                    className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
                    disabled={loading}
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    Chọn ngày giao hàng mong muốn (tối thiểu ngày mai)
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="voucherCode"
                    className="block text-sm font-medium text-text-primary mb-2"
                  >
                    Mã giảm giá (nếu có)
                  </label>
                  <input
                    id="voucherCode"
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
                    disabled={loading}
                    placeholder="Nhập mã giảm giá"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ghi_chu"
                    className="block text-sm font-medium text-text-primary mb-2"
                  >
                    Ghi chú đơn hàng
                  </label>
                  <textarea
                    id="ghi_chu"
                    name="ghi_chu"
                    value={shippingInfo.ghi_chu}
                    onChange={handleShippingChange}
                    rows={3}
                    className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default resize-none"
                    disabled={loading}
                    placeholder="Ghi chú thêm cho đơn hàng (tùy chọn)"
                  />
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full py-4 text-lg"
                    disabled={loading || cart.items.length === 0}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <LoadingSpinner size="sm" />
                        Đang xử lý...
                      </span>
                    ) : (
                      'Đặt hàng'
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <ProtectedRoute>
      <CheckoutPageContent />
    </ProtectedRoute>
  )
}


