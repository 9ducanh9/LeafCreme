import { useEffect, useState } from 'react'
import { Tag, X } from 'lucide-react'
import { formatPrice } from '../../utils/formatPrice'
import Button from '../ui/Button'
import { cn } from '../../lib/cn'

interface CartSummaryProps {
  subtotal: number
  itemCount?: number
  shipping?: number
  showShipping?: boolean
  discount?: number
  onCheckout?: () => void
  onContinueShopping?: () => void
  onApplyVoucher?: (voucherCode: string) => Promise<{ success: boolean; error?: string; discountAmount?: number }>
  checkoutLabel?: string
  continueShoppingLabel?: string
  compact?: boolean
}

export default function CartSummary({ subtotal, itemCount, shipping = 0, showShipping = false, discount = 0, onCheckout, onContinueShopping, onApplyVoucher, checkoutLabel = 'Thanh toán', continueShoppingLabel = 'Tiếp tục mua sắm', compact = false }: CartSummaryProps) {
  const [voucherCode, setVoucherCode] = useState('')
  const [appliedCode, setAppliedCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const total = Math.max(0, subtotal - discount + shipping)

  useEffect(() => { if (!discount) setAppliedCode(null) }, [discount])
  const apply = async () => {
    if (!onApplyVoucher || !voucherCode.trim()) return
    setApplying(true); setError(null)
    try { const result = await onApplyVoucher(voucherCode.trim()); if (result.success) { setAppliedCode(voucherCode.trim().toUpperCase()); setVoucherCode('') } else setError(result.error || 'Mã giảm giá không hợp lệ') } catch { setError('Không thể áp dụng mã giảm giá lúc này') } finally { setApplying(false) }
  }
  const remove = () => { onApplyVoucher?.(''); setAppliedCode(null); setVoucherCode(''); setError(null) }

  return <div className={cn('space-y-5', compact && 'space-y-4')}>
    {onApplyVoucher && <div><label htmlFor="voucher-code" className="mb-2 block text-sm font-medium text-fg-muted">Mã giảm giá</label>{appliedCode ? <div className="flex items-center justify-between rounded-md border border-brand-border-subtle bg-brand-subtle px-3 py-2"><span className="flex items-center gap-2 text-sm font-medium text-brand-fg"><Tag className="size-4" />{appliedCode}</span><button type="button" onClick={remove} className="rounded-md p-1 text-fg-subtle hover:bg-bg-surface" aria-label="Xóa mã giảm giá"><X className="size-4" /></button></div> : <div className="flex gap-2"><input id="voucher-code" value={voucherCode} onChange={(event) => { setVoucherCode(event.target.value.toUpperCase()); setError(null) }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void apply() } }} placeholder="Nhập mã" autoComplete="off" className={cn('h-11 min-w-0 flex-1 rounded-md border border-interactive bg-bg-surface px-3 text-sm uppercase text-fg placeholder:text-fg-subtle outline-none focus-visible:ring-2 focus-visible:ring-focus', error && 'border-danger')} /><Button type="button" variant="outline" size="sm" onClick={() => void apply()} disabled={!voucherCode.trim() || applying}>{applying ? 'Đang áp dụng' : 'Áp dụng'}</Button></div>}{error && <p role="alert" className="mt-1 text-sm text-danger">{error}</p>}</div>}
    <div className="space-y-3 text-sm"><div className="flex justify-between gap-4 text-fg-muted"><span>{itemCount === undefined ? 'Tạm tính' : 'Số lượng sản phẩm'}</span><span className="font-medium text-fg">{itemCount === undefined ? formatPrice(subtotal) : itemCount}</span></div>{itemCount !== undefined && <div className="flex justify-between gap-4 text-fg-muted"><span>Tạm tính</span><span className="font-medium text-fg">{formatPrice(subtotal)}</span></div>}{discount > 0 && <div className="flex justify-between gap-4 text-success"><span>Giảm giá</span><span className="font-medium">-{formatPrice(discount)}</span></div>}{showShipping && <div className="flex justify-between gap-4 text-fg-muted"><span>Phí vận chuyển</span><span className="font-medium text-fg">{shipping ? formatPrice(shipping) : 'Miễn phí'}</span></div>}<div className="flex justify-between gap-4 border-t border-border-subtle pt-4 text-base font-semibold text-fg-strong"><span>Tổng cộng</span><span className="tabular-nums">{formatPrice(total)}</span></div></div>
    <div className="grid gap-2">{onCheckout && <Button type="button" variant="primary" className="w-full" onClick={onCheckout} disabled={subtotal <= 0}>{checkoutLabel}</Button>}{onContinueShopping && <Button type="button" variant="outline" className="w-full" onClick={onContinueShopping}>{continueShoppingLabel}</Button>}</div>
  </div>
}
