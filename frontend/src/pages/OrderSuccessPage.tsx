import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, Home, Package } from 'lucide-react'
import { getOrder, OrderResponse } from '../services/orderService'
import { formatPrice } from '../utils/formatPrice'
import { Container, Section } from '../components/layout'
import Card, { CardBody, CardHeader, CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import Skeleton from '../components/ui/Skeleton'

const statusLabels: Record<string, string> = {
  cho: 'Chờ xử lý', dang_xu_ly: 'Đang xử lý', thanh_toan: 'Đã thanh toán', dang_giao: 'Đang giao', da_nhan: 'Đã nhận hàng',
}

export default function OrderSuccessPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const params = new URLSearchParams(location.search)
  const paymentStatus = params.get('payment_status')

  useEffect(() => {
    if (!id || Number.isNaN(Number(id))) { setError('Mã đơn hàng không hợp lệ'); setLoading(false); return }
    getOrder(Number(id)).then(setOrder).catch(() => setError('Không thể tải thông tin đơn hàng.')).finally(() => setLoading(false))
  }, [id])

  if (loading) return <Section tone="canvas"><Container className="max-w-3xl space-y-4"><Skeleton className="h-48" /><Skeleton className="h-64" /><Skeleton className="h-40" /></Container></Section>
  if (error || !order) return <Section tone="canvas"><Container className="max-w-3xl"><Alert variant="danger" title="Không tải được đơn hàng">{error || 'Đơn hàng không tồn tại.'}</Alert><Button href="/" className="mt-6">Về trang chủ</Button></Container></Section>

  const paymentMessage = paymentStatus === 'success' ? 'Thanh toán chuyển khoản đã được SePay xác nhận.' : paymentStatus === 'failed' ? 'Thanh toán thất bại hoặc bị hủy.' : paymentStatus === 'checking' || paymentStatus === 'pending' ? 'Đang chờ SePay xác nhận thanh toán.' : paymentStatus ? `Trạng thái thanh toán: ${paymentStatus}` : null

  return (
    <Section tone="canvas">
      <Container className="max-w-3xl">
        <Card className="mb-6 text-center">
          <CardBody className="items-center gap-4 py-10">
            <div className="grid size-16 place-items-center rounded-full bg-success-bg text-success"><CheckCircle2 className="size-9" aria-hidden /></div>
            <div><p className="text-xs font-semibold uppercase tracking-caps text-brand-fg">Cảm ơn bạn</p><h1 className="mt-2 text-h1">Đặt hàng thành công</h1><p className="mt-3 text-fg-muted">Mã đơn hàng <strong className="text-fg">{order.ma_don_hang}</strong></p></div>
            {paymentMessage && <Alert variant={paymentStatus === 'failed' ? 'danger' : 'info'}>{paymentMessage}</Alert>}
          </CardBody>
        </Card>

        <Card className="mb-6"><CardHeader><CardTitle className="flex items-center gap-2"><Package className="size-5 text-brand-fg" />Chi tiết đơn hàng</CardTitle></CardHeader><CardBody className="gap-5">
          <div className="divide-y divide-border-subtle">{order.items.map((item) => <div key={item.chitiet_id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"><div><p className="font-medium text-fg">{item.product_name}</p><p className="mt-1 text-sm text-fg-muted">Số lượng: {item.so_luong}</p></div><p className="font-semibold text-fg">{formatPrice(Number(item.tong_tien_phu))}</p></div>)}</div>
          <dl className="space-y-3 border-t border-border-subtle pt-5 text-sm"><div className="flex justify-between gap-4"><dt className="text-fg-muted">Tạm tính</dt><dd className="font-medium text-fg">{formatPrice(Number(order.tong_tien))}</dd></div>{order.tien_giam_gia > 0 && <div className="flex justify-between gap-4"><dt className="text-fg-muted">Giảm giá</dt><dd className="font-medium text-success">-{formatPrice(Number(order.tien_giam_gia))}</dd></div>}<div className="flex justify-between gap-4 border-t border-border-subtle pt-3 text-base"><dt className="font-semibold text-fg">Tổng cộng</dt><dd className="font-semibold text-fg">{formatPrice(Number(order.tien_thanh_toan))}</dd></div></dl>
        </CardBody></Card>

        <Card className="mb-6"><CardHeader><CardTitle>Trạng thái đơn hàng</CardTitle></CardHeader><CardBody className="gap-3"><div className="flex items-center gap-3"><Badge variant="brand">{statusLabels[order.trang_thai] || order.trang_thai}</Badge><span className="text-sm text-fg-muted">Leaf Creme sẽ liên hệ nếu cần thêm thông tin.</span></div>{order.dia_chi_giao_hang && <dl className="grid gap-2 border-t border-border-subtle pt-4 text-sm sm:grid-cols-2"><div><dt className="text-fg-muted">Người nhận</dt><dd className="font-medium text-fg">{order.ten_khach_hang || '—'}</dd></div><div><dt className="text-fg-muted">Số điện thoại</dt><dd className="font-medium text-fg">{order.so_dien_thoai_khach || '—'}</dd></div><div className="sm:col-span-2"><dt className="text-fg-muted">Địa chỉ giao hàng</dt><dd className="font-medium text-fg">{order.dia_chi_giao_hang}</dd></div></dl>}</CardBody></Card>

        <div className="flex flex-wrap gap-3"><Button onClick={() => navigate('/')}><Home className="size-4" />Về trang chủ</Button><Button href={`/orders/${order.donhang_id}`} variant="outline">Xem đơn hàng</Button><Link to="/search" className="inline-flex min-h-11 items-center rounded-md px-4 text-sm font-semibold text-brand-fg hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-focus">Tiếp tục mua sắm</Link></div>
      </Container>
    </Section>
  )
}
