import type { ChangeEvent, ReactNode } from 'react'
import { MapPin } from 'lucide-react'

export type ShippingInfo = {
  ten_khach_hang: string
  so_dien_thoai_khach: string
  dia_chi_giao_hang: string
  ngay_giao_du_kien: string
  ghi_chu: string
}

type Props = {
  shippingInfo: ShippingInfo
  errors: Partial<Record<keyof ShippingInfo, string>>
  updateShipping: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  minDelivery: string
  disabled: boolean
}

function Field({
  id,
  label,
  error,
  children,
  required = false,
}: {
  id: string
  label: string
  error?: string
  children: ReactNode
  required?: boolean
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-fg">
        {label}
        {required && (
          <span aria-hidden className="ml-1 text-danger">
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export default function ShippingAddressForm({
  shippingInfo,
  errors,
  updateShipping,
  minDelivery,
  disabled,
}: Props) {
  const inputClass = (name: keyof ShippingInfo) =>
    `w-full rounded-md border bg-bg-surface px-4 py-3 text-base text-fg placeholder:text-fg-subtle outline-none transition-[border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-focus ${errors[name] ? 'border-danger focus-visible:ring-danger' : 'border-interactive'}`
  return (
    <fieldset>
      <legend className="flex items-center gap-2 font-heading text-xl font-semibold text-fg-strong">
        <MapPin className="size-5 text-brand-fg" />
        Thông tin giao hàng
      </legend>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field id="ten_khach_hang" label="Tên khách hàng" required error={errors.ten_khach_hang}>
          <input
            id="ten_khach_hang"
            name="ten_khach_hang"
            value={shippingInfo.ten_khach_hang}
            onChange={updateShipping}
            autoComplete="name"
            disabled={disabled}
            className={inputClass('ten_khach_hang')}
          />
        </Field>
        <Field
          id="so_dien_thoai_khach"
          label="Số điện thoại"
          required
          error={errors.so_dien_thoai_khach}
        >
          <input
            id="so_dien_thoai_khach"
            name="so_dien_thoai_khach"
            type="tel"
            value={shippingInfo.so_dien_thoai_khach}
            onChange={updateShipping}
            autoComplete="tel"
            placeholder="0901234567"
            disabled={disabled}
            className={inputClass('so_dien_thoai_khach')}
          />
        </Field>
      </div>
      <div className="mt-5">
        <Field
          id="dia_chi_giao_hang"
          label="Địa chỉ giao hàng"
          required
          error={errors.dia_chi_giao_hang}
        >
          <textarea
            id="dia_chi_giao_hang"
            name="dia_chi_giao_hang"
            rows={3}
            value={shippingInfo.dia_chi_giao_hang}
            onChange={updateShipping}
            autoComplete="street-address"
            placeholder="Số nhà, đường, phường/xã, quận/huyện"
            disabled={disabled}
            className={inputClass('dia_chi_giao_hang')}
          />
        </Field>
      </div>
      <div className="mt-5">
        <Field
          id="ngay_giao_du_kien"
          label="Ngày và giờ giao dự kiến"
          required
          error={errors.ngay_giao_du_kien}
        >
          <input
            id="ngay_giao_du_kien"
            name="ngay_giao_du_kien"
            type="datetime-local"
            min={minDelivery}
            value={shippingInfo.ngay_giao_du_kien}
            onChange={updateShipping}
            disabled={disabled}
            className={inputClass('ngay_giao_du_kien')}
          />
        </Field>
        <p className="mt-2 text-sm text-fg-subtle">
          Giờ mở cửa của tiệm: 8:00 — 20:00 · Vui lòng đặt trước tối thiểu 2 giờ để bếp chuẩn bị chu
          đáo nhé.
        </p>
      </div>
      <div className="mt-5">
        <Field id="ghi_chu" label="Ghi chú đơn hàng">
          <textarea
            id="ghi_chu"
            name="ghi_chu"
            rows={3}
            value={shippingInfo.ghi_chu}
            onChange={updateShipping}
            placeholder="Ví dụ: gọi trước khi giao (không bắt buộc)"
            disabled={disabled}
            className={inputClass('ghi_chu')}
          />
        </Field>
      </div>
    </fieldset>
  )
}
