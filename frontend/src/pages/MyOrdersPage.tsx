// My Orders page - view order history
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorMessage from '../components/ui/ErrorMessage'
import { useAuth } from '../contexts/AuthContext'
import { listOrders, OrderListItem } from '../services/orderService'
import { formatPrice } from '../utils/formatPrice'
import { ArrowLeft, Package, Calendar, CreditCard } from 'lucide-react'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  cho: { label: 'Chờ xử lý', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  dang_xu_ly: { label: 'Đang xử lý', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  thanh_toan: { label: 'Đã thanh toán', color: 'text-green-600 bg-green-50 border-green-200' },
  da_nhan: { label: 'Đã nhận', color: 'text-green-700 bg-green-100 border-green-300' },
  huy: { label: 'Đã hủy', color: 'text-gray-500 bg-gray-50 border-gray-200' },
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  pos: 'Tại quầy',
  online: 'Trực tuyến',
  dattruoc: 'Đặt trước',
}

export default function MyOrdersPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    const fetchOrders = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await listOrders()
        setOrders(data)
      } catch (err: unknown) {
        const detail =
          err && typeof err === 'object' && 'detail' in err ? (err as { detail?: unknown }).detail : undefined
        setError((typeof detail === 'string' && detail) || 'Không thể tải danh sách đơn hàng')
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [user, navigate])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8 md:py-12">
      <div className="max-w-[1440px] mx-auto px-6">
        {/* Back Button */}
        <Button variant="outline" onClick={() => navigate('/profile')} className="mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại trang cá nhân
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl md:text-4xl font-semibold text-text-primary mb-3">
            Đơn hàng của tôi
          </h1>
          <p className="text-text-secondary">
            Xem lại lịch sử mua hàng và trạng thái đơn hàng của bạn
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} />
          </div>
        )}

        {/* Empty State */}
        {!loading && orders.length === 0 && !error && (
          <Card className="text-center py-24 px-8">
            <Package className="w-24 h-24 text-accent-brown/20 mx-auto mb-6" />
            <h2 className="font-heading text-2xl font-semibold text-text-primary mb-4">
              Chưa có đơn hàng nào
            </h2>
            <p className="text-text-secondary mb-8 max-w-md mx-auto">
              Bạn chưa có đơn hàng nào. Hãy khám phá các sản phẩm của chúng mình nhé!
            </p>
            <Button variant="primary" onClick={() => navigate('/search')}>
              Khám phá sản phẩm
            </Button>
          </Card>
        )}

        {/* Orders List */}
        {!loading && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusInfo = STATUS_LABELS[order.trang_thai] || {
                label: order.trang_thai,
                color: 'text-gray-600 bg-gray-50 border-gray-200',
              }

              return (
                <Card
                  key={order.donhang_id}
                  className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer"
                  onClick={() => navigate(`/orders/${order.donhang_id}`)}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Left: Order Info */}
                    <div className="flex-1 space-y-3">
                      {/* Order Code & Type */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-lg text-text-primary">
                          {order.ma_don_hang}
                        </h3>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-accent-brown/10 text-accent-brown border border-accent-brown/20">
                          {ORDER_TYPE_LABELS[order.loai_don] || order.loai_don}
                        </span>
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>

                      {/* Date & Customer Info */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(order.ngay_tao)}</span>
                        </div>
                        {order.ten_khach_hang && (
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            <span>{order.ten_khach_hang}</span>
                          </div>
                        )}
                      </div>

                      {/* Delivery Info */}
                      {order.ngay_giao_du_kien && (
                        <div className="text-sm text-text-secondary">
                          <span className="font-medium">Giao dự kiến:</span>{' '}
                          {formatDate(order.ngay_giao_du_kien)}
                        </div>
                      )}

                      {/* Note */}
                      {order.ghi_chu && (
                        <div className="text-sm text-text-secondary italic">
                          Ghi chú: {order.ghi_chu}
                        </div>
                      )}
                    </div>

                    {/* Right: Price Info */}
                    <div className="flex flex-col items-end gap-2 md:min-w-[180px]">
                      <div className="text-right">
                        <p className="text-sm text-text-secondary mb-1">Tổng tiền</p>
                        <p className="text-xl font-bold text-text-primary">
                          {formatPrice(order.tien_thanh_toan)}
                        </p>
                      </div>
                      {order.tien_giam_gia > 0 && (
                        <div className="text-xs text-green-600 flex items-center gap-1">
                          <CreditCard className="w-3 h-3" />
                          <span>Giảm {formatPrice(order.tien_giam_gia)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}


