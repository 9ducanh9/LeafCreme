// Order Detail page - view single order details
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorMessage from '../components/ui/ErrorMessage'
import { useAuth } from '../contexts/AuthContext'
import { getOrder, OrderResponse } from '../services/orderService'
import { formatPrice } from '../utils/formatPrice'
import { ArrowLeft, Package, Calendar, MapPin, Phone, User, CreditCard, FileText } from 'lucide-react'

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

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function OrderDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [order, setOrder] = useState<OrderResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    if (!id) {
      setError('ID đơn hàng không hợp lệ')
      setLoading(false)
      return
    }

    const fetchOrder = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getOrder(Number(id))
        setOrder(data)
      } catch (err: unknown) {
        const detail =
          err && typeof err === 'object' && 'detail' in err ? (err as { detail?: unknown }).detail : undefined
        setError((typeof detail === 'string' && detail) || 'Không thể tải thông tin đơn hàng')
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [id, user, navigate])

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
          <Button variant="outline" onClick={() => navigate('/orders')} className="mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại danh sách đơn hàng
          </Button>
          <ErrorMessage message={error || 'Không tìm thấy đơn hàng'} />
        </div>
      </div>
    )
  }

  const statusInfo = STATUS_LABELS[order.trang_thai] || {
    label: order.trang_thai,
    color: 'text-gray-600 bg-gray-50 border-gray-200',
  }

  return (
    <div className="min-h-screen bg-background py-8 md:py-12">
      <div className="max-w-[1440px] mx-auto px-6">
        {/* Back Button */}
        <Button variant="outline" onClick={() => navigate('/orders')} className="mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại danh sách đơn hàng
        </Button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="font-heading text-3xl md:text-4xl font-semibold text-text-primary">
              {order.ma_don_hang}
            </h1>
            <span
              className={`text-sm px-3 py-1.5 rounded-full border font-medium ${statusInfo.color}`}
            >
              {statusInfo.label}
            </span>
          </div>
          <p className="text-text-secondary">
            {ORDER_TYPE_LABELS[order.loai_don] || order.loai_don} • Ngày tạo: {formatDate(order.ngay_tao)}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            {(order.ten_khach_hang || order.so_dien_thoai_khach || order.dia_chi_giao_hang) && (
              <Card className="p-6">
                <h2 className="font-semibold text-lg text-text-primary mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-accent-brown" />
                  Thông tin khách hàng
                </h2>
                <div className="space-y-3 text-sm">
                  {order.ten_khach_hang && (
                    <div className="flex items-center gap-2 text-text-secondary">
                      <span className="font-medium text-text-primary min-w-[100px]">Tên:</span>
                      <span>{order.ten_khach_hang}</span>
                    </div>
                  )}
                  {order.so_dien_thoai_khach && (
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Phone className="w-4 h-4 text-accent-brown" />
                      <span>{order.so_dien_thoai_khach}</span>
                    </div>
                  )}
                  {order.dia_chi_giao_hang && (
                    <div className="flex items-start gap-2 text-text-secondary">
                      <MapPin className="w-4 h-4 text-accent-brown flex-shrink-0 mt-0.5" />
                      <span>{order.dia_chi_giao_hang}</span>
                    </div>
                  )}
                  {order.ngay_giao_du_kien && (
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Calendar className="w-4 h-4 text-accent-brown" />
                      <span>Giao dự kiến: {formatDate(order.ngay_giao_du_kien)}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Order Items */}
            <Card className="p-6">
              <h2 className="font-semibold text-lg text-text-primary mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-accent-brown" />
                Chi tiết đơn hàng
              </h2>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div
                    key={item.chitiet_id}
                    className={`flex items-center justify-between py-4 ${
                      index !== order.items.length - 1 ? 'border-b border-border' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-text-primary">
                        Item #{item.chitiet_id}
                      </p>
                      <p className="text-sm text-text-secondary mt-1">
                        Số lượng: {item.so_luong} × {formatPrice(item.gia_don_vi)}
                      </p>
                      {item.ghi_chu && (
                        <p className="text-xs text-text-secondary/70 italic mt-1">
                          {item.ghi_chu}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-text-primary">
                        {formatPrice(item.tong_tien_phu)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Note */}
            {order.ghi_chu && (
              <Card className="p-6">
                <h2 className="font-semibold text-lg text-text-primary mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent-brown" />
                  Ghi chú
                </h2>
                <p className="text-sm text-text-secondary">{order.ghi_chu}</p>
              </Card>
            )}
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h2 className="font-semibold text-lg text-text-primary mb-6">Tổng quan</h2>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Tổng tiền:</span>
                  <span className="font-semibold text-text-primary">
                    {formatPrice(order.tong_tien)}
                  </span>
                </div>

                {order.tien_giam_gia > 0 && (
                  <div className="flex justify-between items-center text-green-600">
                    <span className="flex items-center gap-1">
                      <CreditCard className="w-4 h-4" />
                      Giảm giá:
                    </span>
                    <span className="font-semibold">-{formatPrice(order.tien_giam_gia)}</span>
                  </div>
                )}

                {order.tien_dat_coc > 0 && (
                  <div className="flex justify-between items-center text-blue-600">
                    <span>Đã đặt cọc:</span>
                    <span className="font-semibold">{formatPrice(order.tien_dat_coc)}</span>
                  </div>
                )}

                <div className="pt-4 border-t border-border">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-text-primary">Cần thanh toán:</span>
                    <span className="text-xl font-bold text-accent-brown">
                      {formatPrice(order.tien_thanh_toan)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Applied Vouchers */}
              {order.vouchers && order.vouchers.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="font-medium text-text-primary mb-3 text-sm">Voucher đã dùng</h3>
                  <div className="space-y-2">
                    {order.vouchers.map((voucher: any, index: number) => (
                      <div
                        key={index}
                        className="text-xs px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700"
                      >
                        <div className="font-medium">{voucher.ma_phieu}</div>
                        <div className="text-green-600">-{formatPrice(voucher.so_tien_giam)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Order Info */}
              <div className="mt-6 pt-6 border-t border-border space-y-3 text-xs text-text-secondary">
                <div>
                  <span className="font-medium text-text-primary">Mã đơn:</span> {order.ma_don_hang}
                </div>
                <div>
                  <span className="font-medium text-text-primary">Loại đơn:</span>{' '}
                  {ORDER_TYPE_LABELS[order.loai_don] || order.loai_don}
                </div>
                <div>
                  <span className="font-medium text-text-primary">Ngày tạo:</span>{' '}
                  {formatDate(order.ngay_tao)}
                </div>
                {order.ngay_nhan && (
                  <div>
                    <span className="font-medium text-text-primary">Ngày nhận:</span>{' '}
                    {formatDate(order.ngay_nhan)}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
