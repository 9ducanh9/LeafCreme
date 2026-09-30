import { useCallback, useEffect, useRef, useState } from 'react'
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
  const adminReturn = location.state?.adminReturn === true
  const [isChecking, setIsChecking] = useState(false)
  const [checkMessage, setCheckMessage] = useState<string | null>(null)
  const [terminalMessage, setTerminalMessage] = useState<string | null>(null)
  const inFlight = useRef(false)
  const stopped = useRef(false)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  useEffect(() => {
    if (!paymentInfo) navigate('/orders', { replace: true })
  }, [paymentInfo, navigate])

  const checkPaymentStatus = useCallback(async (manual = false) => {
    if (!paymentInfo || !id || document.visibilityState === 'hidden' || inFlight.current || stopped.current) return
    inFlight.current = true
    if (manual) {
      setIsChecking(true)
      setCheckMessage(null)
    }
    try {
      const payment = await getPaymentStatus(paymentInfo.payment_id)
      if (!mounted.current) return
      if (payment.reconciliation_status === 'refund_required' || payment.reconciliation_status === 'refunded') {
        stopped.current = true
        setTerminalMessage(payment.reconciliation_status === 'refunded' ? 'Cửa hàng đã xác nhận hoàn tiền cho khoản chuyển này.' : 'Khoản chuyển tiền đang được đối soát để hoàn tiền. Vui lòng liên hệ cửa hàng nếu cần hỗ trợ.')
        return
      }
      if (payment.order_status === 'da_huy' || payment.trang_thai === 'that_bai' || payment.trang_thai === 'da_hoan_tien') {
        stopped.current = true
        setTerminalMessage('Đơn hoặc khoản thanh toán đã bị hủy. Không chuyển tiền theo mã QR này.')
        return
      }
      if (payment.trang_thai === 'thanh_cong') {
        stopped.current = true
        navigate(adminReturn ? `/admin/orders/${id}` : `/orders/${id}/success?payment_status=success&payment_method=sepay`, { replace: true })
        return
      }
      if (manual) setCheckMessage('SePay chưa xác nhận giao dịch này. Trang sẽ tự chuyển tiếp ngay khi tiền được đối soát.')
    } catch {
      if (mounted.current) setCheckMessage('Chưa thể kiểm tra giao dịch. Hãy thử lại sau ít phút.')
    } finally {
      inFlight.current = false
      if (manual && mounted.current) setIsChecking(false)
    }
  }, [adminReturn, id, navigate, paymentInfo])

  useEffect(() => {
    if (!paymentInfo || !id) return
    let disposed = false
    let timer: number | undefined
    const poll = async () => {
      await checkPaymentStatus()
      if (!disposed && !stopped.current) timer = window.setTimeout(() => void poll(), 3000)
    }
    const resume = () => { if (document.visibilityState === 'visible') void checkPaymentStatus() }
    void poll()
    document.addEventListener('visibilitychange', resume)
    return () => {
      disposed = true
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', resume)
    }
  }, [checkPaymentStatus, id, paymentInfo])

  if (!paymentInfo) return null

  const backToOrder = () => navigate(adminReturn ? `/admin/orders/${id}` : `/orders/${id}/success?payment_status=pending&payment_method=sepay`)

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // Clipboard access can be blocked by the browser; the value stays visible.
    }
  }

  return <div className="bg-bg-canvas py-6 sm:py-8"><Container className="max-w-[1120px]">
    <Button variant="ghost" onClick={backToOrder} className="mb-6 -ml-2"><ArrowLeft className="size-4" />Quay về đơn hàng</Button>
    <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-caps text-brand-fg">Thanh toán tự động</p><h1 className="mt-2 text-h1">Thanh toán bằng VietQR</h1><p className="mt-2 max-w-2xl text-sm text-fg-muted">Quét mã bằng ứng dụng ngân hàng. Số tiền và nội dung chuyển khoản đã được điền sẵn.</p></div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <Card className="h-fit"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-brand text-fg-on-brand"><CreditCard className="size-4" /></span><div><h2 className="font-heading text-lg font-semibold text-fg-strong">Thông tin chuyển khoản</h2><p className="text-sm text-fg-muted">Mã thanh toán {paymentInfo.transfer_content}</p></div></div><dl className="mt-5 space-y-3 text-sm"><div><dt className="text-fg-subtle">Ngân hàng</dt><dd className="mt-1 font-semibold text-fg-strong">{paymentInfo.bank_code}</dd></div>{paymentInfo.account_name && <div><dt className="text-fg-subtle">Chủ tài khoản</dt><dd className="mt-1 font-semibold text-fg-strong">{paymentInfo.account_name}</dd></div>}<div><dt className="text-fg-subtle">Số tài khoản</dt><dd className="mt-1 flex items-center justify-between gap-3 font-semibold text-fg-strong">{paymentInfo.bank_account}<button type="button" onClick={() => void copy(paymentInfo.bank_account)} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-fg hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-focus"><Copy className="size-3.5" />Copy</button></dd></div><div><dt className="text-fg-subtle">Số tiền</dt><dd className="mt-1 text-2xl font-semibold tabular-nums text-brand-fg">{formatPrice(paymentInfo.amount)}</dd></div><div><dt className="text-fg-subtle">Nội dung chuyển tiền</dt><dd className="mt-1 flex items-center justify-between gap-3 rounded-md bg-bg-subtle px-3 py-2 font-mono text-sm font-semibold text-fg">{paymentInfo.transfer_content}<button type="button" onClick={() => void copy(paymentInfo.transfer_content)} className="flex items-center gap-1 rounded-md px-2 py-1 font-sans text-xs font-medium text-brand-fg hover:bg-bg-surface focus-visible:ring-2 focus-visible:ring-focus"><Copy className="size-3.5" />Copy</button></dd></div></dl><Alert variant="info" className="mt-5" action={<Button type="button" variant="outline" size="sm" onClick={() => void checkPaymentStatus(true)} disabled={isChecking || Boolean(terminalMessage)}>{isChecking ? 'Đang kiểm tra...' : 'Kiểm tra lại'}</Button>}><div><span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4" />{terminalMessage || 'Đang chờ SePay xác nhận. Trang sẽ tự chuyển tiếp khi tiền về.'}</span>{checkMessage && <p className="mt-2">{checkMessage}</p>}</div></Alert></Card>
      <div className="flex flex-col items-center rounded-lg border border-brand bg-brand p-5 text-center text-fg-on-brand sm:p-7"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-caps text-fg-on-brand/80"><CreditCard className="size-4" />VietQR · SePay</div><h2 className="mt-3 font-heading text-xl font-semibold text-fg-on-brand">Quét mã để thanh toán</h2><p className="mt-2 max-w-sm text-sm text-fg-on-brand/80">Kiểm tra thông tin và xác nhận trong ứng dụng ngân hàng.</p><div hidden={Boolean(terminalMessage)} className="mt-6 rounded-lg bg-fg-on-brand p-4 shadow-lg"><img src={paymentInfo.qr_image} alt="Mã VietQR thanh toán đơn hàng" width="256" height="256" className="size-52 object-contain sm:size-64" /></div><p className="mt-5 text-sm text-fg-on-brand/80">Cần trợ giúp? <Link to="/contact" className="font-semibold text-fg-on-brand underline underline-offset-4">Liên hệ Leaf Creme</Link>.</p></div>
    </div>
  </Container></div>
}
