import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Check, CreditCard, FileText, MapPin, Package, Phone, QrCode, User } from 'lucide-react'
import Container from '../components/layout/container'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge, { type BadgeVariant } from '../components/ui/Badge'
import Skeleton from '../components/ui/Skeleton'
import Alert from '../components/ui/Alert'
import { getOrder } from '../services/orderService'
import type { OrderResponse } from '../services/orderService'
import { createSePayPayment, getOrderPayments, type PaymentStatus } from '../services/paymentService'
import { formatPrice } from '../utils/formatPrice'

const statuses: Record<string, { label: string; variant: BadgeVariant }> = {
  cho: { label: 'Chờ xử lý', variant: 'warning' },
  cho_coc: { label: 'Chờ thanh toán đủ', variant: 'warning' },
  dang_xu_ly: { label: 'Đang xử lý', variant: 'info' },
  dang_giao: { label: 'Đang giao', variant: 'info' },
  hoan_thanh: { label: 'Đã giao / khách nhận', variant: 'success' },
  da_huy: { label: 'Đã hủy', variant: 'neutral' },
}
const types: Record<string, string> = { pos: 'Tại quầy', online: 'Trực tuyến', dat_truoc: 'Đặt trước', dattruoc: 'Đặt trước' }
const date = (value: string) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderResponse | null>(null)
  const [payments, setPayments] = useState<PaymentStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingPayment, setCreatingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([getOrder(Number(id)), getOrderPayments(Number(id))])
      .then(([orderResult, paymentResult]) => {
        if (cancelled) return
        setOrder(orderResult)
        setPayments(paymentResult)
      })
      .catch((err: unknown) => {
        const detail = err && typeof err === 'object' && 'detail' in err ? (err as { detail?: unknown }).detail : undefined
        if (!cancelled) setError(typeof detail === 'string' ? detail : 'Không thể tải thông tin đơn hàng.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  const openSePayQr = async () => {
    if (!order || creatingPayment) return
    setCreatingPayment(true)
    setPaymentError(null)
    try {
      const paymentInfo = await createSePayPayment(order.donhang_id)
      navigate(`/orders/${order.donhang_id}/payment-qr`, { state: { paymentInfo } })
    } catch (err: unknown) {
      const detail = err && typeof err === 'object' && 'detail' in err ? (err as { detail?: unknown }).detail : undefined
      setPaymentError(typeof detail === 'string' ? detail : 'Chưa thể tạo hoặc khôi phục mã QR SePay.')
    } finally {
      setCreatingPayment(false)
    }
  }

  if (loading) return <div className="py-12"><Container><Skeleton className="mb-8 h-10 w-40" /><Skeleton className="mb-4 h-10 w-72" /><div className="grid gap-6 lg:grid-cols-3"><div className="space-y-6 lg:col-span-2"><Skeleton className="h-48" /><Skeleton className="h-64" /></div><Skeleton className="h-72" /></div></Container></div>
  if (error || !order) return <div className="py-12"><Container><Button variant="ghost" onClick={() => navigate('/orders')} className="mb-8 -ml-2"><ArrowLeft className="size-4" />Quay lại đơn hàng</Button><Alert variant="danger">{error || 'Không tìm thấy đơn hàng.'}</Alert></Container></div>

  const status = statuses[order.trang_thai] || { label: order.trang_thai, variant: 'neutral' as BadgeVariant }
  const paidTotal = payments.filter((payment) => payment.trang_thai === 'thanh_cong').reduce((sum, payment) => sum + Number(payment.so_tien), 0)
  const amountDue = Number(order.tien_thanh_toan)
  const isPaid = amountDue <= 0 || paidTotal >= amountDue
  const hasPendingSePay = payments.some((payment) => payment.phuong_thuc === 'chuyen_khoan' && payment.trang_thai === 'dang_xu_ly')
  const paymentSummary = amountDue <= 0
    ? 'Không phát sinh thanh toán'
    : isPaid
      ? 'Đã thanh toán đủ'
      : paidTotal > 0
        ? `Đã trả ${formatPrice(paidTotal)} / ${formatPrice(amountDue)}`
        : payments.some((payment) => payment.trang_thai === 'dang_xu_ly')
          ? 'Đang chờ xác nhận thanh toán'
          : 'Chưa thanh toán'
  const preparing = ['dang_xu_ly', 'dang_giao', 'hoan_thanh'].includes(order.trang_thai)

  return (
    <div className="bg-bg-canvas py-8 sm:py-12">
      <Container>
        <Button variant="ghost" onClick={() => navigate('/orders')} className="mb-8 -ml-2"><ArrowLeft className="size-4" />Quay lại đơn hàng</Button>
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-caps text-brand-fg">Chi tiết đơn hàng</p><h1 className="mt-2 text-h1">{order.ma_don_hang}</h1><p className="mt-3 text-sm text-fg-muted">{types[order.loai_don] || order.loai_don} · Tạo lúc {date(order.ngay_tao)}</p></div>
          <Badge variant={status.variant} className="self-start text-sm sm:self-auto">{status.label}</Badge>
        </div>

        {order.trang_thai === 'da_huy' && <Alert variant="danger" className="mb-6">Đơn hàng đã bị hủy. Nếu tiền đã chuyển, khoản thu đang được đối soát riêng.</Alert>}

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-md border border-brand-border-subtle bg-brand-subtle p-3"><Check className="size-4 text-brand-fg" /><p className="mt-2 text-xs text-fg-muted">Đã đặt</p></div>
          <div className={`rounded-md border p-3 ${preparing ? 'border-brand-border-subtle bg-brand-subtle' : 'border-border-subtle bg-bg-surface'}`}><Package className="size-4 text-brand-fg" /><p className="mt-2 text-xs text-fg-muted">Đang chuẩn bị</p></div>
          <div className={`rounded-md border p-3 ${isPaid ? 'border-brand-border-subtle bg-brand-subtle' : 'border-border-subtle bg-bg-surface'}`}><CreditCard className="size-4 text-brand-fg" /><p className="mt-2 text-xs text-fg-muted">{paymentSummary}</p></div>
          <div className={`rounded-md border p-3 ${order.trang_thai === 'hoan_thanh' ? 'border-brand-border-subtle bg-brand-subtle' : 'border-border-subtle bg-bg-surface'}`}><Check className="size-4 text-brand-fg" /><p className="mt-2 text-xs text-fg-muted">{order.trang_thai === 'hoan_thanh' ? 'Đã giao / nhận' : 'Chưa bàn giao'}</p></div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
          <div className="space-y-6">
            <Card><h2 className="flex items-center gap-2 font-heading text-xl font-semibold text-fg-strong"><Package className="size-5 text-brand-fg" />Sản phẩm</h2><div className="mt-5 divide-y divide-border-subtle">{order.items.map((item) => <div key={item.chitiet_id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"><div><p className="font-medium text-fg-strong">{item.product_name}</p><p className="mt-1 text-sm text-fg-muted">{item.so_luong} × {formatPrice(item.gia_don_vi)}</p>{item.ghi_chu && <p className="mt-1 text-xs italic text-fg-subtle">{item.ghi_chu}</p>}</div><p className="font-semibold tabular-nums text-fg">{formatPrice(item.tong_tien_phu)}</p></div>)}</div></Card>
            {(order.ten_khach_hang || order.so_dien_thoai_khach || order.dia_chi_giao_hang) && <Card><h2 className="flex items-center gap-2 font-heading text-xl font-semibold text-fg-strong"><MapPin className="size-5 text-brand-fg" />Giao đến</h2><div className="mt-5 space-y-3 text-sm text-fg-muted">{order.ten_khach_hang && <p className="flex gap-3"><User className="size-4 shrink-0 text-brand-fg" />{order.ten_khach_hang}</p>}{order.so_dien_thoai_khach && <p className="flex gap-3"><Phone className="size-4 shrink-0 text-brand-fg" />{order.so_dien_thoai_khach}</p>}{order.dia_chi_giao_hang && <p className="flex gap-3"><MapPin className="size-4 shrink-0 text-brand-fg" />{order.dia_chi_giao_hang}</p>}{order.ngay_giao_du_kien && <p className="flex gap-3"><Calendar className="size-4 shrink-0 text-brand-fg" />Giao dự kiến: {date(order.ngay_giao_du_kien)}</p>}</div></Card>}
            {order.ghi_chu && <Card><h2 className="flex items-center gap-2 font-heading text-xl font-semibold text-fg-strong"><FileText className="size-5 text-brand-fg" />Ghi chú</h2><p className="mt-4 text-sm text-fg-muted">{order.ghi_chu}</p></Card>}
          </div>
          <Card className="h-fit lg:sticky lg:top-24"><h2 className="font-heading text-xl font-semibold text-fg-strong">Tổng quan</h2><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between text-fg-muted"><span>Tổng tiền</span><span className="font-medium text-fg">{formatPrice(order.tong_tien)}</span></div>{order.tien_giam_gia > 0 && <div className="flex justify-between text-success"><span>Giảm giá</span><span>-{formatPrice(order.tien_giam_gia)}</span></div>}{order.tien_dat_coc > 0 && <div className="flex justify-between text-info"><span>Đã đặt cọc</span><span>{formatPrice(order.tien_dat_coc)}</span></div>}<div className="flex justify-between border-t border-border-subtle pt-4 text-base font-semibold text-fg-strong"><span>Cần thanh toán</span><span className="tabular-nums text-brand-fg">{formatPrice(order.tien_thanh_toan)}</span></div><div className="flex justify-between text-fg-muted"><span>Đã thanh toán</span><span>{formatPrice(paidTotal)}</span></div>{paymentError && <Alert variant="danger">{paymentError}</Alert>}{!isPaid && !['da_huy', 'hoan_thanh'].includes(order.trang_thai) && <Button variant="primary" className="mt-3 w-full" disabled={creatingPayment} onClick={() => void openSePayQr()}><QrCode className="size-4" />{creatingPayment ? 'Đang mở QR...' : hasPendingSePay ? 'Tiếp tục thanh toán SePay' : 'Thanh toán phần còn lại bằng QR SePay'}</Button>}</div></Card>
        </div>
      </Container>
    </div>
  )
}
