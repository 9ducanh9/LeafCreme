import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import dayjs from 'dayjs'
import { CalendarDays, MapPin } from 'lucide-react'

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
  updateDelivery: (value: string) => void
  minDelivery: string
  disabled: boolean
}

function formatDateInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('/')
}

function formatTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  return [digits.slice(0, 2), digits.slice(2, 4)].filter(Boolean).join(':')
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
  updateDelivery,
  minDelivery,
  disabled,
}: Props) {
  const datePickerRef = useRef<HTMLInputElement>(null)
  const [deliveryDate, setDeliveryDate] = useState(() => shippingInfo.ngay_giao_du_kien ? dayjs(shippingInfo.ngay_giao_du_kien).format('DD/MM/YYYY') : '')
  const [deliveryTime, setDeliveryTime] = useState(() => shippingInfo.ngay_giao_du_kien ? dayjs(shippingInfo.ngay_giao_du_kien).format('HH:mm') : '')
  const setDelivery = (date: string, time: string) => {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date)
    const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
    const isoDate = match ? `${match[3]}-${match[2]}-${match[1]}` : ''
    const parsed = dayjs(`${isoDate}T${time}`)
    updateDelivery(match && validTime && parsed.isValid() && parsed.format('YYYY-MM-DD') === isoDate ? `${isoDate}T${time}` : '')
  }
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
          <div className="grid grid-cols-2 gap-3">
            <div className="relative min-w-0">
              <input id="ngay_giao_du_kien" type="text" inputMode="numeric" placeholder="dd/mm/yyyy" aria-label="Ngày giao, định dạng ngày/tháng/năm" aria-describedby={errors.ngay_giao_du_kien ? 'ngay_giao_du_kien-error' : undefined} maxLength={10} value={deliveryDate} onChange={(event) => { const value = formatDateInput(event.target.value); setDeliveryDate(value); setDelivery(value, deliveryTime) }} disabled={disabled} className={`${inputClass('ngay_giao_du_kien')} pr-12`} />
              <button type="button" aria-label="Chọn ngày giao từ lịch" disabled={disabled} className="absolute inset-y-0 right-0 px-3 text-fg-muted focus-visible:ring-2 focus-visible:ring-focus" onClick={() => { const picker = datePickerRef.current; if (!picker) return; if (typeof picker.showPicker === 'function') picker.showPicker(); else picker.focus() }}><CalendarDays className="size-5" aria-hidden /></button>
              <input ref={datePickerRef} type="date" tabIndex={-1} aria-hidden="true" min={minDelivery.slice(0, 10)} disabled={disabled} className="pointer-events-none absolute bottom-0 right-0 h-0 w-0 opacity-0" onChange={(event) => { const value = event.target.value ? dayjs(event.target.value).format('DD/MM/YYYY') : ''; setDeliveryDate(value); setDelivery(value, deliveryTime) }} />
            </div>
            <input type="text" inputMode="numeric" placeholder="hh:mm" aria-label="Giờ giao, định dạng 24 giờ" maxLength={5} value={deliveryTime} onChange={(event) => { const value = formatTimeInput(event.target.value); setDeliveryTime(value); setDelivery(deliveryDate, value) }} disabled={disabled} className={inputClass('ngay_giao_du_kien')} />
          </div>
        </Field>
        <p className="mt-2 text-sm text-fg-subtle">
          Nhập ngày theo dạng dd/mm/yyyy và giờ theo dạng 24 giờ (ví dụ: 14:30). Giờ mở cửa của tiệm: 8:00 — 20:00 · Vui lòng đặt trước tối thiểu 2 giờ để bếp chuẩn bị chu
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
