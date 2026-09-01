import { useEffect } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Copy, CreditCard } from 'lucide-react'
import type { SePayPaymentInfo } from '../services/paymentService'
import { getPaymentStatus } from '../services/paymentService'
import { formatPrice } from '../utils/formatPrice'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import Container from '../components/layout/container'

export default function PaymentQRPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const paymentInfo = location.state?.paymentInfo as SePayPaymentInfo | undefined

  useEffect(() => {
    if (!paymentInfo) navigate('/orders', { replace: true })
  }, [paymentInfo, navigate])

  useEffect(() => {
    if (!paymentInfo || !id) return
    let cancelled = false

    const checkStatus = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        const payment = await getPaymentStatus(paymentInfo.payment_id)
        if (!cancelled && payment.trang_thai === 'thanh_cong') {
          navigate(`/orders/${id}/success?payment_status=success&payment_method=sepay`, { replace: true })
        }
      } catch {
        // A transient polling failure must not interrupt the payment screen.
      }
    }

    void checkStatus()
    const intervalId = window.setInterval(() => void checkStatus(), 3000)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [id, navigate, paymentInfo])

  if (!paymentInfo) return null

  const backToOrder = () => navigate(`/orders/${id}/success?payment_status=pending&payment_method=sepay`)

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // Clipboard access can be blocked by the browser; the value stays visible.
    }
  }

  return <div className="bg-bg-canvas py-8 sm:py-12"><Container>
    <Button variant="ghost" onClick={backToOrder} className="mb-8 -ml-2"><ArrowLeft className="size-4" />Quay về đơn hàng</Button>
    <div className="mb-8"><p className="text-xs font-semibold uppercase tracking-caps text-brand-fg">Thanh toán tự động</p><h1 className="mt-2 text-h1">Thanh toán bằng VietQR</h1><p className="mt-3 max-w-2xl text-fg-muted">Quét mã bằng ứng dụng ngân hàng. Số tiền và nội dung chuyển khoản đã được điền sẵn.</p></div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <Card className="h-fit"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-brand text-fg-on-brand"><CreditCard className="size-5" /></span><div><h2 className="font-heading text-xl font-semibold text-fg-strong">Thông tin chuyển khoản</h2><p className="text-sm text-fg-muted">Mã thanh toán {paymentInfo.transfer_content}</p></div></div><dl className="mt-6 space-y-4 text-sm"><div><dt className="text-fg-subtle">Ngân hàng</dt><dd className="mt-1 font-semibold text-fg-strong">{paymentInfo.bank_code}</dd></div><div><dt className="text-fg-subtle">Chủ tài khoản</dt><dd className="mt-1 font-semibold text-fg-strong">{paymentInfo.account_name}</dd></div><div><dt className="text-fg-subtle">Số tài khoản</dt><dd className="mt-1 flex items-center justify-between gap-3 font-semibold text-fg-strong">{paymentInfo.bank_account}<button type="button" onClick={() => void copy(paymentInfo.bank_account)} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-fg hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-focus"><Copy className="size-3.5" />Copy</button></dd></div><div><dt className="text-fg-subtle">Số tiền</dt><dd className="mt-1 text-2xl font-semibold tabular-nums text-brand-fg">{formatPrice(paymentInfo.amount)}</dd></div><div><dt className="text-fg-subtle">Nội dung chuyển tiền</dt><dd className="mt-1 flex items-center justify-between gap-3 rounded-md bg-bg-subtle px-3 py-2 font-mono text-sm font-semibold text-fg">{paymentInfo.transfer_content}<button type="button" onClick={() => void copy(paymentInfo.transfer_content)} className="flex items-center gap-1 rounded-md px-2 py-1 font-sans text-xs font-medium text-brand-fg hover:bg-bg-surface focus-visible:ring-2 focus-visible:ring-focus"><Copy className="size-3.5" />Copy</button></dd></div></dl><Alert variant="info" className="mt-6"><span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4" />Đang chờ SePay xác nhận. Trang sẽ tự chuyển tiếp khi tiền về.</span></Alert></Card>
      <div className="flex flex-col items-center rounded-xl bg-brand p-6 text-center text-fg-on-brand sm:p-10"><div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-caps text-fg-on-brand/80"><CreditCard className="size-4" />VietQR · SePay</div><h2 className="mt-4 font-heading text-2xl font-semibold text-fg-on-brand">Quét mã để thanh toán</h2><p className="mt-2 max-w-sm text-fg-on-brand/80">Chỉ cần kiểm tra thông tin và xác nhận trong ứng dụng ngân hàng.</p><div className="mt-8 rounded-xl bg-fg-on-brand p-5 shadow-xl"><img src={paymentInfo.qr_image} alt="Mã VietQR thanh toán đơn hàng" width="320" height="320" className="size-64 object-contain sm:size-80" /></div><p className="mt-6 text-sm text-fg-on-brand/80">Cần trợ giúp? <Link to="/contact" className="font-semibold text-fg-on-brand underline underline-offset-4">Liên hệ Leaf Creme</Link>.</p></div>
    </div>
  </Container></div>
}
