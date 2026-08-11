import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, ChevronRight, Package } from 'lucide-react'
import Container from '../components/layout/container'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge, { type BadgeVariant } from '../components/ui/Badge'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import Alert from '../components/ui/Alert'
import { listOrders } from '../services/orderService'
import type { OrderListItem } from '../services/orderService'
import { formatPrice } from '../utils/formatPrice'

const statuses: Record<string, { label: string; variant: BadgeVariant }> = { cho: { label: 'Chờ xử lý', variant: 'warning' }, dang_xu_ly: { label: 'Đang xử lý', variant: 'info' }, thanh_toan: { label: 'Đã thanh toán', variant: 'success' }, da_nhan: { label: 'Đã nhận', variant: 'success' }, huy: { label: 'Đã hủy', variant: 'neutral' } }
const types: Record<string, string> = { pos: 'Tại quầy', online: 'Trực tuyến', dattruoc: 'Đặt trước' }
const date = (value: string) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))

export default function MyOrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { listOrders().then(setOrders).catch((err: unknown) => { const detail = err && typeof err === 'object' && 'detail' in err ? (err as { detail?: unknown }).detail : undefined; setError(typeof detail === 'string' ? detail : 'Không thể tải lịch sử đơn hàng.') }).finally(() => setLoading(false)) }, [])
  return <div className="bg-bg-canvas py-8 sm:py-12"><Container><Button variant="ghost" onClick={() => navigate('/profile')} className="mb-8 -ml-2"><ArrowLeft className="size-4" />Quay lại trang cá nhân</Button><div className="mb-8"><p className="text-xs font-semibold uppercase tracking-caps text-brand-fg">Tài khoản</p><h1 className="mt-2 text-h1">Đơn hàng của tôi</h1><p className="mt-3 text-fg-muted">Theo dõi những món bánh đang trên đường đến với bạn.</p></div>{error && <Alert variant="danger" className="mb-6">{error}</Alert>}{loading ? <div className="space-y-4">{[1, 2, 3].map((item) => <Card key={item}><Skeleton className="h-5 w-40" /><Skeleton className="mt-4 h-4 w-64" /></Card>)}</div> : orders.length === 0 ? <EmptyState title="Chưa có đơn hàng nào" description="Hãy chọn một món bánh để bắt đầu bộ sưu tập ngọt ngào của bạn." action={<Button href="/search" variant="primary">Khám phá menu</Button>} /> : <div className="space-y-4">{orders.map((order) => { const status = statuses[order.trang_thai] || { label: order.trang_thai, variant: 'neutral' as BadgeVariant }; return <Card key={order.donhang_id} interactive className="cursor-pointer p-5 sm:p-6" onClick={() => navigate(`/orders/${order.donhang_id}`)}><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-heading text-lg font-semibold text-fg-strong">{order.ma_don_hang}</h2><Badge variant="brand">{types[order.loai_don] || order.loai_don}</Badge><Badge variant={status.variant}>{status.label}</Badge></div><div className="mt-3 flex flex-wrap gap-4 text-sm text-fg-muted"><span className="flex items-center gap-2"><Calendar className="size-4" />{date(order.ngay_tao)}</span>{order.ten_khach_hang && <span className="flex items-center gap-2"><Package className="size-4" />{order.ten_khach_hang}</span>}</div>{order.ngay_giao_du_kien && <p className="mt-2 text-sm text-fg-muted">Giao dự kiến: <span className="font-medium text-fg">{date(order.ngay_giao_du_kien)}</span></p>}</div><div className="flex items-center justify-between gap-5 sm:justify-end"><div className="sm:text-right"><p className="text-xs text-fg-subtle">Tổng thanh toán</p><p className="mt-1 text-lg font-semibold tabular-nums text-brand-fg">{formatPrice(order.tien_thanh_toan)}</p></div><ChevronRight className="size-5 text-fg-subtle" aria-hidden /></div></div></Card> })}</div>}</Container></div>
}
