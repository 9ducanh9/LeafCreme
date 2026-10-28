import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { ArrowLeft, Check } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Alert from '../components/ui/Alert'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { checkoutOrder, type CheckoutCreate } from '../services/orderService'
import {
  clearCheckoutAttempt,
  getOrCreateCheckoutAttempt,
  readCheckoutAttempt,
  isDefinitiveCheckoutRejection,
  type CheckoutAttempt,
} from '../services/checkoutAttempt'
import { parseGiftBoxMetadata } from '../utils/giftBoxHelpers'
import ShippingAddressForm, { type ShippingInfo } from '../components/checkout/ShippingAddressForm'
import PaymentMethodSelector, {
  type CheckoutPaymentMethod,
} from '../components/checkout/PaymentMethodSelector'
import CheckoutOrderSummary from '../components/checkout/CheckoutOrderSummary'

dayjs.extend(utc)
dayjs.extend(timezone)

const STORE_TIMEZONE = 'Asia/Ho_Chi_Minh'
const STORE_OPEN_HOUR = 8
const STORE_CLOSE_HOUR = 20

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
  if (!value) return 'Vui lòng nhập ngày hợp lệ theo dd/mm/yyyy và giờ theo hh:mm.'
  const selected = toStoreTime(value)
  const now = dayjs().tz(STORE_TIMEZONE)
  if (selected.hour() < STORE_OPEN_HOUR || selected.hour() >= STORE_CLOSE_HOUR)
    return 'Thời gian giao hàng phải trong khoảng 8:00 — 20:00.'
  // The kitchen needs two hours to prepare a fresh cake before delivery.
  if (selected.isBefore(now.add(2, 'hour')))
    return 'Vui lòng đặt trước tối thiểu 2 giờ để bếp chuẩn bị.'
  return ''
}

function validatePhone(value: string) {
  return /^(0|\+84)(3|5|7|8|9)\d{8}$/.test(value.replace(/[ .-]/g, ''))
    ? ''
    : 'Số điện thoại không hợp lệ (ví dụ: 0901234567).'
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { cart, clearCart, appliedVoucher } = useCart()
  const { user } = useAuth()
  const { showSuccess } = useToast()
  const firstErrorRef = useRef<HTMLElement | null>(null)
  const checkoutCompletedRef = useRef(false)
  const submittingRef = useRef(false)
  const [restored] = useState(() => {
    try {
      return { attempt: user ? readCheckoutAttempt(user.nguoidung_id) : null, error: null }
    } catch (err) {
      return {
        attempt: null,
        error:
          err instanceof Error
            ? err.message
            : 'Không thể tải thông tin đơn hàng đang xử lý. Bạn vui lòng liên hệ tiệm để được hỗ trợ nhé.',
      }
    }
  })
  const [pendingAttempt, setPendingAttempt] = useState<CheckoutAttempt | null>(restored.attempt)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(restored.error)
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    ten_khach_hang: pendingAttempt?.payload.ten_khach_hang || user?.ho_ten || '',
    so_dien_thoai_khach: pendingAttempt?.payload.so_dien_thoai_khach || user?.so_dien_thoai || '',
    dia_chi_giao_hang: pendingAttempt?.payload.dia_chi_giao_hang || user?.dia_chi || '',
    ngay_giao_du_kien: pendingAttempt?.payload.ngay_giao_du_kien
      ? dayjs(pendingAttempt.payload.ngay_giao_du_kien)
          .tz(STORE_TIMEZONE)
          .format('YYYY-MM-DDTHH:mm')
      : '',
    ghi_chu: pendingAttempt?.payload.ghi_chu || '',
  })
  const [voucherCode, setVoucherCode] = useState(
    pendingAttempt?.payload.phieu_giam_gia_codes?.[0] || appliedVoucher?.code || '',
  )
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>(
    pendingAttempt?.payload.payment_method || 'pay_later',
  )
  const minDelivery = useMemo(minDeliveryValue, [])

  useEffect(() => {
    if (!cart.items.length && !checkoutCompletedRef.current && !pendingAttempt) navigate('/cart')
  }, [cart.items.length, navigate, pendingAttempt])
  useEffect(() => {
    if (appliedVoucher?.code) setVoucherCode(appliedVoucher.code)
  }, [appliedVoucher])

  const updateShipping = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    setShippingInfo((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setError(null)
  }

  const validate = () => {
    const next: Partial<Record<FieldName, string>> = {}
    if (!shippingInfo.ten_khach_hang.trim()) next.ten_khach_hang = 'Vui lòng nhập tên khách hàng.'
    if (!shippingInfo.so_dien_thoai_khach.trim())
      next.so_dien_thoai_khach = 'Vui lòng nhập số điện thoại.'
    else next.so_dien_thoai_khach = validatePhone(shippingInfo.so_dien_thoai_khach)
    if (!shippingInfo.dia_chi_giao_hang.trim())
      next.dia_chi_giao_hang = 'Vui lòng nhập địa chỉ giao hàng.'
    next.ngay_giao_du_kien = validateDelivery(shippingInfo.ngay_giao_du_kien)
    Object.keys(next).forEach((key) => {
      if (!next[key as FieldName]) delete next[key as FieldName]
    })
    setErrors(next)
    const first = Object.keys(next)[0] as FieldName | undefined
    if (first) {
      const element = document.getElementById(first)
      element?.focus()
      firstErrorRef.current = element
      return false
    }
    return true
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (submittingRef.current || checkoutCompletedRef.current || !user) return
    if (!pendingAttempt && !validate()) return
    const orderItems = cart.items
      .map((item) => {
        const isGiftBox =
          item.sku?.startsWith('GIFTBOX-') ||
          Boolean(item.variantLabel && parseGiftBoxMetadata(item.variantLabel))
        if (isGiftBox) {
          const giftBoxId = item.sku?.replace('GIFTBOX-', '')
          return {
            hop_qua_id: giftBoxId ? Number.parseInt(giftBoxId, 10) : undefined,
            so_luong: item.quantity,
          }
        }
        return { bienthe_id: item.variantId || undefined, so_luong: item.quantity }
      })
      .filter((item) => ('bienthe_id' in item ? item.bienthe_id : item.hop_qua_id))
    if (!pendingAttempt && !orderItems.length) {
      setError('Giỏ hàng không hợp lệ. Vui lòng kiểm tra lại sản phẩm.')
      return
    }
    submittingRef.current = true
    setLoading(true)
    let attempt: CheckoutAttempt | null = pendingAttempt
    try {
      const orderData: CheckoutCreate = {
        items: orderItems,
        payment_method: paymentMethod,
        ten_khach_hang: shippingInfo.ten_khach_hang.trim(),
        so_dien_thoai_khach: shippingInfo.so_dien_thoai_khach.trim(),
        dia_chi_giao_hang: shippingInfo.dia_chi_giao_hang.trim(),
        ngay_giao_du_kien: shippingInfo.ngay_giao_du_kien
          ? toStoreTime(shippingInfo.ngay_giao_du_kien).toISOString()
          : undefined,
        ghi_chu: shippingInfo.ghi_chu.trim() || undefined,
        phieu_giam_gia_codes: voucherCode.trim() ? [voucherCode.trim()] : undefined,
      }
      attempt = await getOrCreateCheckoutAttempt(user.nguoidung_id, orderData)
      setPendingAttempt(attempt)
      const {
        order,
        payment_info: paymentInfo,
        payment_status: paymentStatus,
      } = await checkoutOrder(attempt.payload, attempt.key)
      checkoutCompletedRef.current = true
      clearCheckoutAttempt(user.nguoidung_id, attempt.key)
      setPendingAttempt(null)
      clearCart()
      if (order.trang_thai === 'da_huy') {
        navigate(`/orders/${order.donhang_id}`)
      } else if (paymentInfo) {
        showSuccess(`Đơn hàng ${order.ma_don_hang} đã được tạo. Tiếp tục thanh toán bằng mã QR.`)
        navigate(`/orders/${order.donhang_id}/payment-qr`, { state: { paymentInfo } })
      } else {
        showSuccess(
          paymentStatus === 'paid'
            ? `Đơn hàng ${order.ma_don_hang} đã thanh toán đủ.`
            : `Đơn hàng ${order.ma_don_hang} đã được tạo; còn chờ thanh toán khi nhận hàng.`,
        )
        navigate(`/orders/${order.donhang_id}/success?payment_status=${paymentStatus}`)
      }
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'detail' in err
          ? (err as { detail?: unknown }).detail
          : undefined
      const status = err && typeof err === 'object' && 'status' in err ? Number(err.status) : 0
      if (attempt && isDefinitiveCheckoutRejection(status)) {
        clearCheckoutAttempt(user.nguoidung_id, attempt.key)
        setPendingAttempt(null)
      }
      setError(
        typeof detail === 'string' && detail
          ? detail
          : err instanceof Error
            ? err.message
            : 'Chưa thể xác nhận đơn hàng lúc này. Bạn thử lại để tiếp tục nhé.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-bg-canvas py-8 sm:py-12">
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" onClick={() => navigate('/cart')} className="mb-6 -ml-2">
          <ArrowLeft className="size-4" />
          Quay lại giỏ hàng
        </Button>
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-caps text-brand-fg">Bước cuối</p>
          <h1 className="mt-2 text-h1">Hoàn tất đơn hàng</h1>
          <p className="mt-3 max-w-2xl text-fg-muted">
            Kiểm tra thông tin giao hàng và chọn cách thanh toán phù hợp với bạn.
          </p>
        </div>
        {pendingAttempt && (
          <Alert className="mb-6">
            Bạn đang có một đơn hàng chờ hoàn tất. Nhấn tiếp tục để kiểm tra và đặt bánh nhé.
          </Alert>
        )}
        {error && (
          <Alert variant="danger" title="Chưa thể đặt hàng" className="mb-6">
            {error}
          </Alert>
        )}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
          <Card className="order-2 lg:order-1">
            <form onSubmit={handleSubmit} noValidate className="space-y-7">
              <ShippingAddressForm
                shippingInfo={shippingInfo}
                errors={errors}
                updateShipping={updateShipping}
                minDelivery={minDelivery}
                updateDelivery={(value) => {
                  setShippingInfo((current) => ({ ...current, ngay_giao_du_kien: value }))
                  setErrors((current) => ({ ...current, ngay_giao_du_kien: undefined }))
                  setError(null)
                }}
                disabled={loading || Boolean(pendingAttempt)}
              />
              <PaymentMethodSelector
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                disabled={loading || Boolean(pendingAttempt)}
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Check className="size-5" />
                    {pendingAttempt ? 'Tiếp tục đặt hàng' : 'Đặt hàng'}
                  </>
                )}
              </Button>
            </form>
          </Card>
          <CheckoutOrderSummary cart={cart} appliedVoucher={appliedVoucher} />
        </div>
      </div>
    </div>
  )
}
