import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { ArrowLeft, Check, CreditCard, MapPin, ShoppingBag } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Alert from '../components/ui/Alert'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { formatPrice } from '../utils/formatPrice'
import { createOrder, type OrderCreate } from '../services/orderService'
import { createMomoQRPayment } from '../services/paymentService'
import GiftBoxInfo from '../components/cart/GiftBoxInfo'
import { parseGiftBoxMetadata } from '../utils/giftBoxHelpers'
import { FALLBACK_IMAGE } from '../constants/images'

dayjs.extend(utc)
dayjs.extend(timezone)

const STORE_TIMEZONE = 'Asia/Ho_Chi_Minh'
const STORE_OPEN_HOUR = 8
const STORE_CLOSE_HOUR = 20

type ShippingInfo = { ten_khach_hang: string; so_dien_thoai_khach: string; dia_chi_giao_hang: string; ngay_giao_du_kien: string; ghi_chu: string }
type FieldName = keyof ShippingInfo | 'voucherCode' | 'paymentMethod'

function toStoreTime(value: string) {
  return dayjs.tz(value, STORE_TIMEZONE)
}

function minDeliveryValue() {
  const now = dayjs().tz(STORE_TIMEZONE)
  let minimum = now.add(2, 'hour')
  const open = now.hour(STORE_OPEN_HOUR).minute(0).second(0).millisecond(0)
  const close = now.hour(STORE_CLOSE_HOUR).minute(0).second(0).millisecond(0)
  if (minimum.isBefore(open)) minimum = open
  if (minimum.isAfter(close)) minimum = now.add(1, 'day').hour(STORE_OPEN_HOUR).minute(0).second(0).millisecond(0)
  return minimum.format('YYYY-MM-DDTHH:mm')
}

function validateDelivery(value: string) {
  if (!value) return 'Vui lòng chọn ngày và giờ giao dự kiến.'
  const selected = toStoreTime(value)
  const now = dayjs().tz(STORE_TIMEZONE)
  if (selected.hour() < STORE_OPEN_HOUR || selected.hour() >= STORE_CLOSE_HOUR) return 'Thời gian giao hàng phải trong khoảng 8:00 — 20:00.'
  if (selected.isBefore(now.add(2, 'hour'))) return 'Vui lòng đặt trước tối thiểu 2 giờ để bếp chuẩn bị.'
  return ''
}

function validatePhone(value: string) {
  return /^(0|\+84)(3|5|7|8|9)\d{8}$/.test(value.replace(/[ .-]/g, '')) ? '' : 'Số điện thoại không hợp lệ (ví dụ: 0901234567).'
}

function Field({ id, label, error, children, required = false }: { id: string; label: string; error?: string; children: ReactNode; required?: boolean }) {
  return <div><label htmlFor={id} className="mb-2 block text-sm font-medium text-fg">{label}{required && <span aria-hidden className="ml-1 text-danger">*</span>}</label>{children}{error && <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm font-medium text-danger">{error}</p>}</div>
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { cart, clearCart, appliedVoucher } = useCart()
  const { user } = useAuth()
  const { showSuccess } = useToast()
  const firstErrorRef = useRef<HTMLElement | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({ ten_khach_hang: user?.ho_ten || '', so_dien_thoai_khach: user?.so_dien_thoai || '', dia_chi_giao_hang: user?.dia_chi || '', ngay_giao_du_kien: '', ghi_chu: '' })
  const [voucherCode, setVoucherCode] = useState(appliedVoucher?.code || '')
  const [paymentMethod, setPaymentMethod] = useState<'pay_later' | 'momo_qr'>('pay_later')
  const minDelivery = useMemo(minDeliveryValue, [])

  useEffect(() => { if (!cart.items.length) navigate('/cart') }, [cart.items.length, navigate])
  useEffect(() => { if (appliedVoucher?.code) setVoucherCode(appliedVoucher.code) }, [appliedVoucher])

  const updateShipping = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value } = event.target; setShippingInfo((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: undefined })); setError(null) }
  const inputClass = (name: FieldName) => `w-full rounded-md border bg-bg-surface px-4 py-3 text-base text-fg placeholder:text-fg-subtle outline-none transition-[border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-focus ${errors[name] ? 'border-danger focus-visible:ring-danger' : 'border-interactive'}`

  const validate = () => {
    const next: Partial<Record<FieldName, string>> = {}
    if (!shippingInfo.ten_khach_hang.trim()) next.ten_khach_hang = 'Vui lòng nhập tên khách hàng.'
    if (!shippingInfo.so_dien_thoai_khach.trim()) next.so_dien_thoai_khach = 'Vui lòng nhập số điện thoại.'
    else next.so_dien_thoai_khach = validatePhone(shippingInfo.so_dien_thoai_khach)
    if (!shippingInfo.dia_chi_giao_hang.trim()) next.dia_chi_giao_hang = 'Vui lòng nhập địa chỉ giao hàng.'
    next.ngay_giao_du_kien = validateDelivery(shippingInfo.ngay_giao_du_kien)
    Object.keys(next).forEach((key) => { if (!next[key as FieldName]) delete next[key as FieldName] })
    setErrors(next)
    const first = Object.keys(next)[0] as FieldName | undefined
    if (first) { const element = document.getElementById(first); element?.focus(); firstErrorRef.current = element; return false }
    return true
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault(); setError(null)
    if (!validate()) return
    const orderItems = cart.items.map((item) => {
      const isGiftBox = item.sku?.startsWith('GIFTBOX-') || Boolean(item.variantLabel && parseGiftBoxMetadata(item.variantLabel))
      if (isGiftBox) { const giftBoxId = item.sku?.replace('GIFTBOX-', ''); return { hop_qua_id: giftBoxId ? Number.parseInt(giftBoxId, 10) : undefined, so_luong: item.quantity } }
      return { bienthe_id: item.variantId || undefined, so_luong: item.quantity }
    }).filter((item) => ('bienthe_id' in item ? item.bienthe_id : item.hop_qua_id))
    if (!orderItems.length) { setError('Giỏ hàng không hợp lệ. Vui lòng kiểm tra lại sản phẩm.'); return }
    setLoading(true)
    try {
      const orderData: OrderCreate = { items: orderItems, ten_khach_hang: shippingInfo.ten_khach_hang.trim(), so_dien_thoai_khach: shippingInfo.so_dien_thoai_khach.trim(), dia_chi_giao_hang: shippingInfo.dia_chi_giao_hang.trim(), ngay_giao_du_kien: toStoreTime(shippingInfo.ngay_giao_du_kien).toISOString(), ghi_chu: shippingInfo.ghi_chu.trim() || undefined, phieu_giam_gia_codes: voucherCode.trim() ? [voucherCode.trim()] : undefined }
      const order = await createOrder(orderData, 'online')
      if (paymentMethod === 'momo_qr') {
        const paymentInfo = await createMomoQRPayment(order.donhang_id)
        clearCart()
        showSuccess(`Đơn hàng ${order.ma_don_hang} đã được tạo. Tiếp tục thanh toán qua MoMo.`)
        navigate(`/orders/${order.donhang_id}/payment-qr`, { state: { paymentInfo } })
      } else {
        clearCart()
        showSuccess(`Đơn hàng ${order.ma_don_hang} đã được tạo thành công!`)
        navigate(`/orders/${order.donhang_id}/success`)
      }
    } catch (err: unknown) {
      const detail = err && typeof err === 'object' && 'detail' in err ? (err as { detail?: unknown }).detail : undefined
      setError(typeof detail === 'string' && detail ? detail : 'Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.')
    } finally { setLoading(false) }
  }

  return <div className="bg-bg-canvas py-8 sm:py-12"><div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8"><Button variant="ghost" onClick={() => navigate('/cart')} className="mb-6 -ml-2"><ArrowLeft className="size-4" />Quay lại giỏ hàng</Button><div className="mb-8"><p className="text-xs font-semibold uppercase tracking-caps text-brand-fg">Bước cuối</p><h1 className="mt-2 text-h1">Hoàn tất đơn hàng</h1><p className="mt-3 max-w-2xl text-fg-muted">Kiểm tra thông tin giao hàng và chọn cách thanh toán phù hợp với bạn.</p></div>{error && <Alert variant="danger" title="Chưa thể đặt hàng" className="mb-6">{error}</Alert>}<div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]"><Card className="order-2 lg:order-1"><form onSubmit={handleSubmit} noValidate className="space-y-7"><fieldset><legend className="flex items-center gap-2 font-heading text-xl font-semibold text-fg-strong"><MapPin className="size-5 text-brand-fg" />Thông tin giao hàng</legend><div className="mt-5 grid gap-5 sm:grid-cols-2"><Field id="ten_khach_hang" label="Tên khách hàng" required error={errors.ten_khach_hang}><input id="ten_khach_hang" name="ten_khach_hang" value={shippingInfo.ten_khach_hang} onChange={updateShipping} autoComplete="name" disabled={loading} className={inputClass('ten_khach_hang')} /></Field><Field id="so_dien_thoai_khach" label="Số điện thoại" required error={errors.so_dien_thoai_khach}><input id="so_dien_thoai_khach" name="so_dien_thoai_khach" type="tel" value={shippingInfo.so_dien_thoai_khach} onChange={updateShipping} autoComplete="tel" placeholder="0901234567" disabled={loading} className={inputClass('so_dien_thoai_khach')} /></Field></div><div className="mt-5"><Field id="dia_chi_giao_hang" label="Địa chỉ giao hàng" required error={errors.dia_chi_giao_hang}><textarea id="dia_chi_giao_hang" name="dia_chi_giao_hang" rows={3} value={shippingInfo.dia_chi_giao_hang} onChange={updateShipping} autoComplete="street-address" placeholder="Số nhà, đường, phường/xã, quận/huyện" disabled={loading} className={inputClass('dia_chi_giao_hang')} /></Field></div><div className="mt-5"><Field id="ngay_giao_du_kien" label="Ngày và giờ giao dự kiến" required error={errors.ngay_giao_du_kien}><input id="ngay_giao_du_kien" name="ngay_giao_du_kien" type="datetime-local" min={minDelivery} value={shippingInfo.ngay_giao_du_kien} onChange={updateShipping} disabled={loading} className={inputClass('ngay_giao_du_kien')} /></Field><p className="mt-2 text-sm text-fg-subtle">Giờ cửa hàng: 8:00 — 20:00 · Cần đặt trước tối thiểu 2 giờ · Múi giờ: Việt Nam</p></div><div className="mt-5"><Field id="ghi_chu" label="Ghi chú đơn hàng"><textarea id="ghi_chu" name="ghi_chu" rows={3} value={shippingInfo.ghi_chu} onChange={updateShipping} placeholder="Ví dụ: gọi trước khi giao (không bắt buộc)" disabled={loading} className={inputClass('ghi_chu')} /></Field></div></fieldset><fieldset className="border-t border-border-subtle pt-7"><legend className="flex items-center gap-2 font-heading text-xl font-semibold text-fg-strong"><CreditCard className="size-5 text-brand-fg" />Phương thức thanh toán</legend><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${paymentMethod === 'pay_later' ? 'border-brand bg-brand-subtle' : 'border-border-interactive hover:bg-bg-subtle'}`}><input type="radio" name="paymentMethod" value="pay_later" checked={paymentMethod === 'pay_later'} onChange={() => setPaymentMethod('pay_later')} disabled={loading} className="mt-1 accent-brand" /><span><span className="block font-medium text-fg-strong">Thanh toán khi nhận</span><span className="mt-1 block text-sm text-fg-muted">Thanh toán trực tiếp với nhân viên giao hàng.</span></span></label><label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${paymentMethod === 'momo_qr' ? 'border-brand bg-brand-subtle' : 'border-border-interactive hover:bg-bg-subtle'}`}><input type="radio" name="paymentMethod" value="momo_qr" checked={paymentMethod === 'momo_qr'} onChange={() => setPaymentMethod('momo_qr')} disabled={loading} className="mt-1 accent-brand" /><span><span className="block font-medium text-fg-strong">MoMo QR</span><span className="mt-1 block text-sm text-fg-muted">Quét mã sau khi tạo đơn để thanh toán.</span></span></label></div></fieldset><Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>{loading ? <><LoadingSpinner size="sm" />Đang xử lý...</> : <><Check className="size-5" />Đặt hàng</>}</Button></form></Card><Card className="order-1 h-fit lg:sticky lg:top-24 lg:order-2"><div className="flex items-center gap-2"><ShoppingBag className="size-5 text-brand-fg" /><h2 className="font-heading text-xl font-semibold text-fg-strong">Đơn hàng của bạn</h2></div><div className="mt-5 space-y-4">{cart.items.map((item) => { const isGiftBox = item.sku?.startsWith('GIFTBOX-') || Boolean(item.variantLabel && parseGiftBoxMetadata(item.variantLabel)); return <div key={`${item.productId}-${item.variantId || 'none'}`} className="flex gap-3 border-b border-border-subtle pb-4 last:border-0"><div className="relative shrink-0"><img src={item.productImage || FALLBACK_IMAGE.cart} alt="" className={`rounded-md object-cover ${isGiftBox ? 'size-20' : 'size-16'}`} onError={(event) => { event.currentTarget.src = FALLBACK_IMAGE.cart }} />{isGiftBox && <span className="absolute -right-1 -top-1 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-fg-on-brand">Quà</span>}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-fg-strong">{item.productName}</p>{isGiftBox ? <GiftBoxInfo variantLabel={item.variantLabel} /> : item.variantLabel && <p className="mt-1 text-xs text-fg-subtle">{item.variantLabel}</p>}<p className="mt-1 text-sm text-fg-muted">{item.quantity} × {formatPrice(item.price)}</p></div></div> })}</div><div className="mt-2 space-y-3 border-t border-border-subtle pt-4 text-sm"><div className="flex justify-between text-fg-muted"><span>Tạm tính</span><span className="font-medium text-fg">{formatPrice(cart.total)}</span></div>{appliedVoucher && appliedVoucher.discountAmount > 0 && <div className="flex justify-between text-success"><span>Giảm giá ({appliedVoucher.code})</span><span>-{formatPrice(appliedVoucher.discountAmount)}</span></div>}<div className="flex justify-between text-fg-muted"><span>Phí vận chuyển</span><span className="text-fg">Miễn phí</span></div><div className="flex justify-between border-t border-border-subtle pt-3 text-base font-semibold text-fg-strong"><span>Tổng cộng</span><span>{formatPrice(cart.total - (appliedVoucher?.discountAmount || 0))}</span></div></div></Card></div></div></div>
}
