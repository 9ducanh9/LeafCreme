import { CreditCard } from 'lucide-react'

export type CheckoutPaymentMethod = 'pay_later' | 'sepay_qr'

type Props = {
  paymentMethod: CheckoutPaymentMethod
  setPaymentMethod: (method: CheckoutPaymentMethod) => void
  disabled: boolean
}

export default function PaymentMethodSelector({
  paymentMethod,
  setPaymentMethod,
  disabled,
}: Props) {
  return (
    <fieldset className="border-t border-border-subtle pt-7">
      <legend className="flex items-center gap-2 font-heading text-xl font-semibold text-fg-strong">
        <CreditCard className="size-5 text-brand-fg" />
        Phương thức thanh toán
      </legend>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${paymentMethod === 'pay_later' ? 'border-brand bg-brand-subtle' : 'border-border-interactive hover:bg-bg-subtle'}`}
        >
          <input
            type="radio"
            name="paymentMethod"
            value="pay_later"
            checked={paymentMethod === 'pay_later'}
            onChange={() => setPaymentMethod('pay_later')}
            disabled={disabled}
            className="mt-1 accent-brand"
          />
          <span>
            <span className="block font-medium text-fg-strong">Thanh toán khi nhận</span>
            <span className="mt-1 block text-sm text-fg-muted">
              Thanh toán trực tiếp với nhân viên giao hàng khi nhận bánh.
            </span>
          </span>
        </label>
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${paymentMethod === 'sepay_qr' ? 'border-brand bg-brand-subtle' : 'border-border-interactive hover:bg-bg-subtle'}`}
        >
          <input
            type="radio"
            name="paymentMethod"
            value="sepay_qr"
            checked={paymentMethod === 'sepay_qr'}
            onChange={() => setPaymentMethod('sepay_qr')}
            disabled={disabled}
            className="mt-1 accent-brand"
          />
          <span>
            <span className="block font-medium text-fg-strong">Chuyển khoản QR</span>
            <span className="mt-1 block text-sm text-fg-muted">
              Quét VietQR; hệ thống tự động xác nhận ngay khi nhận được tiền.
            </span>
          </span>
        </label>
      </div>
    </fieldset>
  )
}
