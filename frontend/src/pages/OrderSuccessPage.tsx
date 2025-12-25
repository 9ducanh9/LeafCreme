// Order success/confirmation page
import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorMessage from '../components/ui/ErrorMessage'
import { formatPrice } from '../utils/formatPrice'
import { getOrder, OrderResponse } from '../services/orderService'
import { CheckCircle, Home, Package } from 'lucide-react'

export default function OrderSuccessPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [order, setOrder] = useState<OrderResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const paymentStatus = new URLSearchParams(location.search).get('payment_status')

  const paymentStatusText =
    paymentStatus === 'success'
      ? 'Thanh toán VNPay thành công.'
      : paymentStatus === 'failed'
      ? 'Thanh toán VNPay thất bại hoặc bị hủy.'
      : paymentStatus === 'invalid_signature'
      ? 'Thanh toán VNPay không hợp lệ (sai chữ ký).' 
      : paymentStatus === 'config_error'
      ? 'Hệ thống thiếu cấu hình VNPay.'
      : paymentStatus
      ? `Trạng thái thanh toán: ${paymentStatus}`
      : null

  useEffect(() => {
    async function fetchOrder() {
      if (!id) {
        setError('Không tìm thấy đơn hàng')
        setLoading(false)
        return
      }

      try {
        const orderId = parseInt(id, 10)
        if (isNaN(orderId)) {
          throw new Error('ID đơn hàng không hợp lệ')
        }

        const orderData = await getOrder(orderId)
        setOrder(orderData)
      } catch (err: unknown) {
        console.error('Error fetching order:', err)
        const detail =
          err && typeof err === 'object' && 'detail' in err ? (err as { detail?: unknown }).detail : undefined
        setError((typeof detail === 'string' && detail) || 'Không thể tải thông tin đơn hàng')
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background py-16">
        <div className="max-w-[1440px] mx-auto px-6">
          <ErrorMessage
            message={error || 'Đơn hàng không tồn tại'}
            onRetry={() => window.location.reload()}
          />
          <div className="mt-8 text-center">
            <Button variant="primary" onClick={() => navigate('/')}>
              Về trang chủ
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="max-w-[1440px] mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          {/* Success Header */}
          <Card className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-accent-yellow/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-accent-brown" />
              </div>
            </div>
            <h1 className="font-heading text-4xl font-semibold text-text-primary mb-2">
              Đặt hàng thành công!
            </h1>
            <p className="text-text-secondary text-lg">
              Cảm ơn bạn đã đặt hàng tại Leaf Creme
            </p>
            {paymentStatusText && (
              <div className="mt-4 p-3 bg-background rounded-card">
                <p className="text-sm text-text-secondary">{paymentStatusText}</p>
              </div>
            )}
            <div className="mt-6 p-4 bg-accent-yellow/20 rounded-card">
              <p className="text-sm text-text-secondary mb-1">Mã đơn hàng</p>
              <p className="font-heading text-2xl font-semibold text-text-primary">
                {order.ma_don_hang}
              </p>
            </div>
          </Card>

          {/* Order Details */}
          <Card className="mb-8">
            <h2 className="font-heading text-2xl font-semibold text-text-primary mb-6">
              Chi tiết đơn hàng
            </h2>

            <div className="space-y-4 mb-6">
              {order.items.map((item) => (
                <div
                  key={item.chitiet_id}
                  className="flex items-center justify-between py-4 border-b border-border last:border-0"
                >
                  <div>
                    <p className="font-medium text-text-primary">
                      Sản phẩm #{item.lohang_sanpham_id || item.lohang_hopqua_id || item.hop_qua_id || 'N/A'}
                    </p>
                    <p className="text-sm text-text-secondary">
                      Số lượng: {item.so_luong}
                    </p>
                  </div>
                  <p className="font-semibold text-text-primary">
                    {formatPrice(Number(item.tong_tien_phu))}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-text-secondary">
                <span>Tạm tính:</span>
                <span className="font-medium text-text-primary">
                  {formatPrice(Number(order.tong_tien))}
                </span>
              </div>
              {order.tien_giam_gia > 0 && (
                <div className="flex justify-between text-text-secondary">
                  <span>Giảm giá:</span>
                  <span className="font-medium text-accent-brown">
                    -{formatPrice(Number(order.tien_giam_gia))}
                  </span>
                </div>
              )}
              <div className="border-t border-border pt-2">
                <div className="flex justify-between">
                  <span className="font-heading text-xl font-semibold text-text-primary">
                    Tổng cộng:
                  </span>
                  <span className="font-heading text-xl font-semibold text-text-primary">
                    {formatPrice(Number(order.tien_thanh_toan))}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Shipping Info */}
          {order.dia_chi_giao_hang && (
            <Card className="mb-8">
              <h2 className="font-heading text-2xl font-semibold text-text-primary mb-4">
                Thông tin giao hàng
              </h2>
              <div className="space-y-2 text-text-secondary">
                {order.ten_khach_hang && (
                  <p>
                    <span className="font-medium text-text-primary">Người nhận:</span>{' '}
                    {order.ten_khach_hang}
                  </p>
                )}
                {order.so_dien_thoai_khach && (
                  <p>
                    <span className="font-medium text-text-primary">Số điện thoại:</span>{' '}
                    {order.so_dien_thoai_khach}
                  </p>
                )}
                {order.dia_chi_giao_hang && (
                  <p>
                    <span className="font-medium text-text-primary">Địa chỉ:</span>{' '}
                    {order.dia_chi_giao_hang}
                  </p>
                )}
                {order.ngay_giao_du_kien && (
                  <p>
                    <span className="font-medium text-text-primary">Ngày giao dự kiến:</span>{' '}
                    {new Date(order.ngay_giao_du_kien).toLocaleDateString('vi-VN')}
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Order Status */}
          <Card className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-6 h-6 text-accent-brown" />
              <h2 className="font-heading text-2xl font-semibold text-text-primary">
                Trạng thái đơn hàng
              </h2>
            </div>
            <div className="p-4 bg-background rounded-card">
              <p className="font-medium text-text-primary capitalize">
                {order.trang_thai === 'cho'
                  ? 'Chờ xử lý'
                  : order.trang_thai === 'dang_xu_ly'
                  ? 'Đang xử lý'
                  : order.trang_thai === 'thanh_toan'
                  ? 'Đã thanh toán'
                  : order.trang_thai === 'da_nhan'
                  ? 'Đã nhận hàng'
                  : order.trang_thai}
              </p>
              <p className="text-sm text-text-secondary mt-2">
                Đơn hàng của bạn đang được xử lý. Chúng tôi sẽ liên hệ với bạn sớm nhất có thể.
              </p>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => navigate('/')}
            >
              <Home className="w-5 h-5 mr-2" />
              Về trang chủ
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate('/profile')}
            >
              Xem đơn hàng của tôi
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}


