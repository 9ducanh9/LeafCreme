import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Clock3, Copy, CreditCard } from 'lucide-react'
import type { MomoQRPaymentInfo } from '../services/paymentService'
import { formatPrice } from '../utils/formatPrice'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import Container from '../components/layout/container'

export default function PaymentQRPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const paymentInfo = location.state?.paymentInfo as MomoQRPaymentInfo | undefined
  const [timeLeft, setTimeLeft] = useState(600)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { if (!paymentInfo) navigate('/orders') }, [paymentInfo, navigate])
  useEffect(() => { if (!paymentInfo || timeLeft <= 0) return; const timer = window.setInterval(() => setTimeLeft((value) => Math.max(0, value - 1)), 1000); return () => window.clearInterval(timer) }, [paymentInfo, timeLeft])
  if (!paymentInfo) return null

  const copy = async (key: string, value: string) => { try { await navigator.clipboard.writeText(value); setCopied(key); window.setTimeout(() => setCopied(null), 1800) } catch { setCopied(null) } }
  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0')
  const seconds = (timeLeft % 60).toString().padStart(2, '0')
  const backToOrder = () => navigate(`/orders/${id}/success?payment_status=pending&payment_method=momo_qr`)

  return <div className="bg-bg-canvas py-8 sm:py-12"><Container>
    <Button variant="ghost" onClick={backToOrder} className="mb-8 -ml-2"><ArrowLeft className="size-4" />Quay về đơn hàng</Button>
    <div className="mb-8"><p className="text-xs font-semibold uppercase tracking-caps text-brand-fg">Thanh toán an toàn</p><h1 className="mt-2 text-h1">Thanh toán qua MoMo</h1><p className="mt-3 max-w-2xl text-fg-muted">Mở ứng dụng MoMo, quét mã và giữ nguyên nội dung chuyển khoản để hệ thống đối soát chính xác.</p></div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <Card className="h-fit"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-brand text-lg font-bold text-fg-on-brand">M</span><div><h2 className="font-heading text-xl font-semibold text-fg-strong">Thông tin chuyển khoản</h2><p className="text-sm text-fg-muted">Đơn {paymentInfo.transfer_content}</p></div></div><dl className="mt-6 space-y-4 text-sm"><div><dt className="text-fg-subtle">Tài khoản nhận</dt><dd className="mt-1 font-semibold text-fg-strong">{paymentInfo.account_name}</dd></div><div><dt className="text-fg-subtle">Số điện thoại</dt><dd className="mt-1 flex items-center justify-between gap-3 font-semibold text-fg-strong">{paymentInfo.phone_number}<button type="button" onClick={() => void copy('phone', paymentInfo.phone_number)} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-fg hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-focus"><Copy className="size-3.5" />{copied === 'phone' ? 'Đã copy' : 'Copy'}</button></dd></div><div><dt className="text-fg-subtle">Số tiền</dt><dd className="mt-1 text-2xl font-semibold tabular-nums text-brand-fg">{formatPrice(paymentInfo.amount)}</dd></div><div><dt className="text-fg-subtle">Nội dung chuyển khoản</dt><dd className="mt-1 flex items-center justify-between gap-3 rounded-md bg-bg-subtle px-3 py-2 font-mono text-sm font-semibold text-fg">{paymentInfo.transfer_content}<button type="button" onClick={() => void copy('content', paymentInfo.transfer_content)} className="flex items-center gap-1 rounded-md px-2 py-1 font-sans text-xs font-medium text-brand-fg hover:bg-bg-surface focus-visible:ring-2 focus-visible:ring-focus"><Copy className="size-3.5" />{copied === 'content' ? 'Đã copy' : 'Copy'}</button></dd></div></dl><div className="mt-6 flex items-center gap-3 rounded-md bg-warning-bg p-3 text-sm text-warning"><Clock3 className="size-5 shrink-0" /><span>Mã thanh toán còn hiệu lực <strong>{minutes}:{seconds}</strong>.</span></div><Button variant="outline" className="mt-6 w-full" onClick={backToOrder}><Check className="size-4" />Tôi đã thanh toán</Button></Card>
      <div className="flex flex-col items-center rounded-xl bg-brand p-6 text-center text-fg-on-brand sm:p-10"><div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-caps text-fg-on-brand/80"><CreditCard className="size-4" />MoMo QR</div><h2 className="mt-4 font-heading text-2xl font-semibold text-fg-on-brand">Quét mã để thanh toán</h2><p className="mt-2 max-w-sm text-sm text-fg-on-brand/80">Sau khi thanh toán, bạn có thể quay về đơn hàng để xem trạng thái.</p><div className="mt-8 rounded-xl bg-fg-on-brand p-5 shadow-xl">{paymentInfo.qr_code || paymentInfo.qr_image ? <img src={paymentInfo.qr_code || paymentInfo.qr_image} alt="Mã QR thanh toán MoMo" width="320" height="320" className="size-64 object-contain sm:size-80" /> : <div className="grid size-64 place-items-center bg-bg-inset text-sm text-fg-muted sm:size-80">Mã QR chưa sẵn sàng</div>}</div>{timeLeft === 0 && <Alert variant="warning" className="mt-6 w-full text-left">Mã QR đã hết hạn. Vui lòng quay về đơn hàng và thử lại.</Alert>}<p className="mt-6 text-sm text-fg-on-brand/80">Cần trợ giúp? <Link to="/contact" className="font-semibold text-fg-on-brand underline underline-offset-4">Liên hệ Leaf Crème</Link>.</p></div>
    </div>
  </Container></div>
}
