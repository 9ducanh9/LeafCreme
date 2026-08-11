# Spec 05 — Cart, Checkout, Payment

> Phase 5. Đây là flow tạo doanh thu — mọi lỗi ở đây tốn tiền thật.
> Spec này chứa **3 bug logic** phát hiện khi đọc `CheckoutPage.tsx`, không chỉ vấn đề UI.

---

## 1. Phạm vi

| File | LOC | Trạng thái |
|---|---|---|
| `pages/CartPage.tsx` | 233 | Chỉnh |
| `pages/CheckoutPage.tsx` | **633** | **Tách + sửa bug** |
| `pages/PaymentQRPage.tsx` | 190 | Chỉnh + sửa polling |
| `pages/OrderSuccessPage.tsx` | 270 | Chỉnh |
| `components/cart/CartDrawer.tsx` | 143 | Chuyển sang Radix Drawer |
| `components/cart/CartItem.tsx` | 164 | Chỉnh |
| `components/cart/CartSummary.tsx` | 290 | Tách voucher ra |
| `components/cart/GiftBoxInfo.tsx` | 33 | Giữ |

---

## 2. Ba bug logic trong `CheckoutPage.tsx`

Trước khi nói về UI, đây là 3 vấn đề nghiêm trọng hơn màu sắc.

### Bug 1 — Toast báo thành công trước khi payment hoàn tất (dòng 165-171)

```tsx
const order = await createOrder(orderData, 'online')
clearCart()                                                    // ← xoá giỏ
showSuccess(`Đơn hàng ${order.ma_don_hang} đã được tạo thành công!...`)   // ← báo thành công

if (paymentMethod === 'momo_qr') {
  const paymentInfo = await createMomoQRPayment(order.donhang_id)   // ← có thể THROW
  navigate(`/orders/${order.donhang_id}/payment-qr`, { state: { paymentInfo } })
  return
}
```

Nếu `createMomoQRPayment` throw:

1. Giỏ hàng **đã bị xoá**
2. Toast **đã** báo "thành công"
3. Rơi vào `catch` → `setError(...)` hiện lỗi đỏ ở đầu trang checkout
4. Người dùng thấy: giỏ trống + toast xanh "thành công" + lỗi đỏ, ở lại trang checkout
5. Đơn hàng **đã tồn tại** trong DB nhưng người dùng không biết → bấm submit lại → **đơn trùng**

**Fix:** không `clearCart()` và không `showSuccess()` cho đến khi đã điều hướng thành công. Với luồng MoMo, thứ tự phải là: tạo đơn → tạo payment → navigate → clear cart ở trang đích. Nếu payment fail, đơn đã tạo thì điều hướng tới `/orders/:id` với thông báo "Đơn đã tạo, chưa thanh toán được — thử lại thanh toán" chứ không để người dùng ở lại checkout.

```tsx
// Đúng
const order = await createOrder(orderData, 'online', { idempotencyKey })

if (paymentMethod === 'momo_qr') {
  try {
    const paymentInfo = await createMomoQRPayment(order.donhang_id)
    clearCart()
    navigate(`/orders/${order.donhang_id}/payment-qr`, { state: { paymentInfo }, replace: true })
  } catch {
    // Đơn ĐÃ tạo. Không được để người dùng tưởng là chưa.
    clearCart()
    navigate(`/orders/${order.donhang_id}`, {
      replace: true,
      state: { notice: 'Đơn hàng đã được tạo nhưng chưa tạo được mã thanh toán. Bạn có thể thanh toán lại từ trang này.' },
    })
  }
  return
}
clearCart()
navigate(`/orders/${order.donhang_id}/success`, { replace: true })
```

`replace: true` để back button không quay lại form checkout với giỏ đã trống.

### Bug 2 — Không có idempotency key → double submit tạo đơn trùng

`createOrder` được gọi không có khoá chống trùng. Nút bị `disabled` khi `loading` giúp chặn double-click, nhưng **không** chặn:

- Người dùng bấm submit, request chậm, họ reload rồi submit lại
- Mobile network retry ở tầng OS
- Double-tap trên iOS trước khi React re-render

Với đơn hàng có thanh toán, đơn trùng là lỗi tốn tiền và tốn uy tín.

**Fix:** sinh `idempotencyKey` **một lần** khi vào trang checkout, gửi kèm header `Idempotency-Key`. Backend lưu key + trả lại đơn cũ nếu key trùng.

```tsx
// Sinh 1 lần, giữ nguyên qua các lần retry submit
const idempotencyKey = useMemo(() => crypto.randomUUID(), [])
```

Cần backend hỗ trợ. Ghi vào backlog P1 — không phải UI nhưng phải nêu vì nó thuộc luồng này.

### Bug 3 — Validation: một lỗi một lần, không gắn với field

Dòng 85-113:

```tsx
if (!shippingInfo.ten_khach_hang.trim()) { setError('Vui lòng nhập tên khách hàng'); return }
if (!shippingInfo.so_dien_thoai_khach.trim()) { setError('Vui lòng nhập số điện thoại'); return }
if (!shippingInfo.dia_chi_giao_hang.trim()) { setError('Vui lòng nhập địa chỉ giao hàng'); return }
if (!deliveryDateTime) { setDeliveryTimeTouched(true); setError('Vui lòng chọn ngày và giờ giao dự kiến'); return }
```

Bốn vấn đề:

1. **Early return** → chỉ báo lỗi đầu tiên. Người dùng để trống cả 4 field: submit → sửa tên → submit → sửa SĐT → submit → sửa địa chỉ → submit → sửa ngày → submit. **5 lần submit.**
2. **Lỗi hiện ở đầu trang, không cạnh field.** Trên mobile, `setError` render ở đầu form nhưng người dùng đang ở cuối trang → họ bấm submit và **không thấy gì xảy ra**. WCAG 3.3.1 yêu cầu chỉ rõ field nào lỗi.
3. **Không có `aria-invalid`, không `aria-describedby`** → screen reader không biết field nào sai.
4. **Không validate format SĐT.** `so_dien_thoai_khach` chỉ check `.trim()` — nhập "abc" cũng qua. Với đơn hàng cần gọi giao, số sai = đơn không giao được.

**Fix:** validate tất cả field cùng lúc, trả về object lỗi theo field, dùng `FormField` từ spec 02.

```tsx
type FieldErrors = Partial<Record<keyof ShippingInfo | 'deliveryDateTime', string>>

function validate(s: ShippingInfo, dt: Dayjs | null, hours: StoreHours): FieldErrors {
  const e: FieldErrors = {}
  if (!s.ten_khach_hang.trim())        e.ten_khach_hang = 'Vui lòng nhập tên người nhận'
  if (!s.so_dien_thoai_khach.trim())   e.so_dien_thoai_khach = 'Vui lòng nhập số điện thoại'
  // SĐT Việt Nam: 0 + 9 số, hoặc +84 + 9 số
  else if (!/^(0|\+84)(3|5|7|8|9)\d{8}$/.test(s.so_dien_thoai_khach.replace(/[\s.-]/g, '')))
    e.so_dien_thoai_khach = 'Số điện thoại không hợp lệ. Ví dụ: 0901234567'
  if (!s.dia_chi_giao_hang.trim())     e.dia_chi_giao_hang = 'Vui lòng nhập địa chỉ giao hàng'
  else if (s.dia_chi_giao_hang.trim().length < 10)
    e.dia_chi_giao_hang = 'Địa chỉ quá ngắn. Vui lòng ghi rõ số nhà, đường, phường/quận'
  if (!dt) e.deliveryDateTime = 'Vui lòng chọn thời gian giao'
  else {
    const err = validateDeliveryTime(dt, hours)
    if (err) e.deliveryDateTime = err
  }
  return e
}

const onSubmit = async (ev: React.FormEvent) => {
  ev.preventDefault()
  const errs = validate(shippingInfo, deliveryDateTime, storeHours)
  setFieldErrors(errs)
  if (Object.keys(errs).length > 0) {
    // Focus vào field lỗi ĐẦU TIÊN theo thứ tự DOM — WCAG 3.3.1
    const first = FIELD_ORDER.find((f) => errs[f])
    document.getElementById(fieldIds[first!])?.focus()
    return
  }
  // ...
}
```

**Focus vào field lỗi đầu tiên** là chi tiết nhỏ nhưng tác động lớn: người dùng mobile bấm submit ở cuối trang → browser tự scroll tới field lỗi → họ hiểu ngay phải làm gì. Không có nó, submit trông như không phản hồi.

---

## 3. Thay `@mui/x-date-pickers` — điểm chạm MUI duy nhất của storefront

### 3.1 Yêu cầu nghiệp vụ (trích từ code hiện tại, dòng 216-256)

- Giờ cửa hàng 8:00–20:00
- Tối thiểu +2 giờ từ lúc đặt
- Nếu min-time trước 8h → dùng 8h hôm nay
- Nếu min-time sau 20h → 8h ngày mai

**Vấn đề: giờ cửa hàng hardcode trong component** (`storeOpenHour = 8`, `storeCloseHour = 20`, dòng 238-239). Bakery đổi giờ mở cửa = phải deploy frontend. Chuyển sang config, tốt nhất là từ backend (`GET /store/config`) để admin đổi được.

### 3.2 Component `DeliverySlotPicker`

Đề xuất **không** dùng datetime picker chung, mà dùng 2 bước rõ ràng: chọn **ngày** → chọn **khung giờ**.

```
Ngày giao
[Hôm nay 11/08] [Mai 12/08] [T5 13/08] [Chọn ngày khác ▾]

Khung giờ  (đã bỏ các khung không còn khả thi)
[08:00–10:00] [10:00–12:00] [~~12:00–14:00~~] [14:00–16:00] [16:00–18:00] [18:00–20:00]
                              ↑ đã qua / không đủ 2h chuẩn bị
```

**Lý do tốt hơn `DateTimePicker`:**

1. **Ràng buộc trở nên hiển nhiên.** Với `DateTimePicker`, người dùng chọn 21:30, bấm submit, rồi bị báo "phải trong 8:00–20:00". Với khung giờ, giờ không hợp lệ **không tồn tại để chọn**. Ngăn lỗi tốt hơn báo lỗi (WCAG 3.3.4 nói đúng điều này).
2. **Bakery giao theo khung, không theo phút.** Không ai giao bánh đúng 14:37. Khung giờ khớp thực tế vận hành và đặt kỳ vọng đúng.
3. **Bỏ được `@mui/x-date-pickers`** (~60KB gzip) — dependency nặng nhất còn lại của storefront.
4. **Mobile tốt hơn nhiều.** MUI `DateTimePicker` trên mobile mở modal có clock picker — thao tác chậm và hay bấm sai. Chip khung giờ là 1 tap.

```tsx
// src/components/checkout/delivery-slot-picker.tsx
export function DeliverySlotPicker({
  value, onChange, error, storeHours, leadTimeHours = 2,
}: {
  value: { date: string; slot: string } | null
  onChange: (v: { date: string; slot: string }) => void
  error?: string
  storeHours: { open: number; close: number }
  leadTimeHours?: number
}) {
  const days = useMemo(() => nextAvailableDays(7, storeHours, leadTimeHours), [storeHours, leadTimeHours])
  const slots = useMemo(
    () => value?.date ? slotsForDate(value.date, storeHours, leadTimeHours) : [],
    [value?.date, storeHours, leadTimeHours]
  )

  return (
    <FormField error={error} required>
      <fieldset>
        <legend className="text-sm font-medium text-fg">Ngày giao</legend>
        <RadioGroup
          value={value?.date} onValueChange={(d) => onChange({ date: d, slot: '' })}
          className="mt-3 flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x"
        >
          {days.map((d) => (
            <RadioGroupItem key={d.iso} value={d.iso}
              className="flex min-w-24 shrink-0 snap-start flex-col items-center gap-0.5 rounded-md border border-border-interactive px-4 py-3 data-[state=checked]:border-brand data-[state=checked]:bg-brand-subtle">
              <span className="text-xs text-fg-subtle">{d.weekdayLabel}</span>
              <span className="text-sm font-semibold tabular-nums">{d.dayLabel}</span>
            </RadioGroupItem>
          ))}
        </RadioGroup>
      </fieldset>

      {value?.date && (
        <fieldset className="mt-6">
          <legend className="text-sm font-medium text-fg">Khung giờ</legend>
          <RadioGroup
            value={value.slot} onValueChange={(s) => onChange({ date: value.date, slot: s })}
            className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3"
          >
            {slots.map((s) => (
              <RadioGroupItem key={s.id} value={s.id} disabled={!s.available}
                className={cn(
                  'flex min-h-11 items-center justify-center rounded-md border border-border-interactive text-sm tabular-nums',
                  'data-[state=checked]:border-brand data-[state=checked]:bg-brand-subtle data-[state=checked]:font-medium',
                  !s.available && 'cursor-not-allowed text-fg-disabled line-through'
                )}>
                {s.label}
                {!s.available && <span className="sr-only"> (không còn khả dụng)</span>}
              </RadioGroupItem>
            ))}
          </RadioGroup>
          {slots.every((s) => !s.available) && (
            <p className="mt-3 text-sm text-fg-muted">
              Hôm nay đã hết khung giờ giao. Vui lòng chọn ngày khác.
            </p>
          )}
        </fieldset>
      )}
    </FormField>
  )
}
```

### 3.3 Timezone — điểm dễ sai nhất

Code hiện tại: `dayjs.extend(utc)`, `dayjs.extend(timezone)`, `dayjs.locale('vi')`, rồi gửi `deliveryDateTime.toISOString()`.

`toISOString()` chuyển sang UTC theo **timezone của máy khách**. Nếu khách ở nước ngoài đặt bánh giao ở Sài Gòn (kịch bản rất thật: Việt kiều đặt bánh tặng gia đình), họ chọn "14:00" trên máy múi giờ Mỹ → backend nhận giờ lệch 14 tiếng.

**Fix:** gửi giờ theo timezone cửa hàng, tường minh.

```ts
// Slot đã chọn LUÔN là giờ địa phương của CỬA HÀNG, không phải của máy khách
const STORE_TZ = 'Asia/Ho_Chi_Minh'

const deliveryAt = dayjs
  .tz(`${value.date} ${slotStartTime}`, 'YYYY-MM-DD HH:mm', STORE_TZ)
  .toISOString()
```

Và hiển thị rõ cho người dùng: "Giao 14:00–16:00 (giờ Việt Nam)". Bỏ dòng chữ đó thì khách ở múi giờ khác không biết mình đang chọn giờ nào.

Cùng lý do, `getMinDeliveryTime()` phải tính theo `dayjs().tz(STORE_TZ)`, không `dayjs()`. Hiện tại dùng `dayjs()` — sai với khách ngoài VN.

---

## 4. Layout Checkout mới

```
Desktop (>= lg)                              Mobile
┌──────────────────────┬──────────────────┐  ┌────────────────────┐
│ Bước 1 · Người nhận  │ Đơn hàng         │  │ [◂ Giỏ hàng]       │
│  [Tên] [SĐT]         │  ─────────────   │  │ ▸ Đơn hàng (3) ⌄   │ ← Accordion, đóng sẵn
│  [Địa chỉ]           │  3 sản phẩm      │  │ ─────────────────  │
│  [Ghi chú]           │  Tạm tính  450k  │  │ Người nhận         │
│ ──────────────────── │  Giảm giá  -50k  │  │ [Tên][SĐT][Địa chỉ]│
│ Bước 2 · Thời gian   │  Phí ship   30k  │  │ Thời gian giao     │
│  [ngày][khung giờ]   │  ─────────────   │  │ [ngày][khung giờ]  │
│ ──────────────────── │  Tổng     430k   │  │ Thanh toán         │
│ Bước 3 · Thanh toán  │  [Mã giảm giá]   │  │ [radio card ×2]    │
│  ○ Khi nhận hàng     │  sticky top-20   │  │ ─── sticky đáy ────│
│  ○ MoMo QR           │                  │  │ Tổng 430k [Đặt]    │
│ [Đặt hàng]           │                  │  └────────────────────┘
└──────────────────────┴──────────────────┘
```

### Thay đổi so với hiện tại

| Hiện tại | Mới | Lý do |
|---|---|---|
| Summary ở **cột 1** (`lg:col-span-1 order-2 lg:order-1`) | Summary cột **phải** | Người đọc trái→phải; form là việc chính, phải ở luồng đọc chính. Summary là tham chiếu → bên phải, sticky |
| Mobile: summary hiện toàn bộ ở trên | Accordion đóng sẵn, chỉ hiện tổng tiền | Summary 3+ sản phẩm chiếm hết màn hình đầu → người dùng phải scroll qua thứ họ vừa xem ở trang giỏ hàng mới tới form |
| Không có bước rõ ràng | Đánh số 3 bước | Giảm cảm giác "form dài vô tận", cho người dùng biết còn bao nhiêu |
| Không có nút submit cố định trên mobile | Sticky bar đáy: tổng tiền + nút | Không phải scroll xuống cuối để đặt hàng |
| `min-h-screen bg-background py-16` | `<Container>` + `Section` | Token + container thống nhất |
| Payment method là radio thường | `RadioCard` — card bấm được cả vùng | Target lớn hơn nhiều trên mobile |

### Payment method dùng RadioCard

```tsx
<fieldset>
  <legend className="text-sm font-medium text-fg">Phương thức thanh toán</legend>
  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="mt-3 grid gap-3">
    <RadioCard value="pay_later"
      title="Thanh toán khi nhận hàng"
      description="Trả tiền mặt cho người giao hàng."
      icon={Banknote} />
    <RadioCard value="momo_qr"
      title="MoMo QR"
      description="Quét mã QR bằng app MoMo. Đơn được xác nhận sau khi cửa hàng kiểm tra."
      icon={QrCode} />
  </RadioGroup>
</fieldset>
```

Mô tả MoMo QR ghi rõ **"sau khi cửa hàng kiểm tra"** — vì luồng hiện tại là *MoMo QR with manual confirmation* (theo README). Không nói rõ thì khách quét xong đợi tự động xác nhận, không thấy gì, rồi gọi điện phàn nàn. Đây là kiểu kỳ vọng phải set đúng ngay trên UI.

---

## 5. Tách `CheckoutPage.tsx`

```
src/pages/CheckoutPage.tsx                    ~110 dòng — layout + submit orchestration
src/components/checkout/
├── recipient-form.tsx           ~90   bước 1
├── delivery-slot-picker.tsx    ~120   bước 2 (§3.2)
├── payment-method-picker.tsx    ~60   bước 3
├── order-summary.tsx           ~140   desktop sticky + mobile accordion (1 component, 2 mode)
├── order-summary-line.tsx       ~40
├── voucher-field.tsx            ~80   tách khỏi CartSummary
└── mobile-submit-bar.tsx        ~40
src/hooks/
├── useCheckoutForm.ts           ~90   state + validate + submit
└── useStoreHours.ts             ~30   config giờ cửa hàng (§3.1)
src/utils/deliverySlots.ts        ~80   nextAvailableDays, slotsForDate, validateDeliveryTime
```

**`order-summary.tsx` một component hai mode**, không viết hai bản desktop/mobile. Truyền `variant="sidebar" | "collapsible"`.

**Logic tách khỏi UI:** `deliverySlots.ts` là hàm thuần → **test được bằng unit test**. Hiện tại `getMinDeliveryTime` và `validateDeliveryTime` nằm trong component nên không test được. Đây là 2 hàm duy nhất trong storefront xứng đáng có unit test ngay:

```ts
// src/utils/deliverySlots.test.ts
describe('slotsForDate', () => {
  it('bỏ khung giờ không đủ leadTime', () => { /* ... */ })
  it('bỏ toàn bộ khung nếu đã sau giờ đóng cửa', () => { /* ... */ })
  it('tính theo timezone cửa hàng, không theo máy khách', () => {
    // Giả lập máy khách ở America/New_York
  })
  it('xử lý đúng biên: đúng giờ mở cửa, đúng giờ đóng cửa', () => { /* ... */ })
})
```

---

## 6. Gift box detection — string parsing làm domain logic

Dòng 118-119 và lặp lại ở dòng 283-284:

```tsx
const isGiftBox = item.sku?.startsWith('GIFTBOX-') ||
                 (item.variantLabel && parseGiftBoxMetadata(item.variantLabel) !== null)
```

`types/cart.ts`:

```ts
export interface CartItem {
  productId: number
  productName: string
  variantId?: number
  variantLabel?: string     // ← đang nhồi JSON metadata gift box vào đây
  sku?: string              // ← đang mang cả ý nghĩa "GIFTBOX-{id}"
  price: number
  quantity: number
}
```

Ba vấn đề:

1. `sku` là mã sản phẩm, không phải discriminator. Nếu admin đặt SKU sản phẩm thường bắt đầu bằng "GIFTBOX-" → checkout gửi sai payload.
2. `variantLabel` là nhãn để **hiển thị**, đang bị nhồi JSON metadata → parse ngược ra. Cùng một field làm 2 việc.
3. Logic `isGiftBox` lặp ở ít nhất 2 chỗ trong `CheckoutPage`, và chắc còn ở `CartItem`, `CartSummary`, `CartDrawer`.

**Fix — discriminated union:**

```ts
// src/types/cart.ts
interface CartItemBase {
  productName: string
  productImage?: string
  price: number
  quantity: number
}

export interface ProductCartItem extends CartItemBase {
  kind: 'product'
  productId: number
  variantId: number
  variantLabel?: string        // chỉ để hiển thị
  sku?: string
  /** Tồn kho khả dụng lúc thêm vào giỏ — dùng để cảnh báo khi thay đổi (§7.2) */
  availableAtAdd?: number
}

export interface GiftBoxCartItem extends CartItemBase {
  kind: 'giftbox'
  giftBoxId: number
  components: { ten: string; soLuong: number }[]
  earliestExpiry?: string
}

export type CartItem = ProductCartItem | GiftBoxCartItem
```

Rồi `orderItems` trở thành:

```tsx
const orderItems = cart.items.map((item) =>
  item.kind === 'giftbox'
    ? { hop_qua_id: item.giftBoxId, so_luong: item.quantity }
    : { bienthe_id: item.variantId,  so_luong: item.quantity }
)
// Không cần filter "items không hợp lệ" nữa — TypeScript đảm bảo luôn có id
```

Đoạn `validItems.filter(...)` (dòng 138-141) và `if (validItems.length === 0)` (dòng 142) biến mất — vì trạng thái đó **không biểu diễn được** nữa. Đây là kiểu refactor đúng: làm bug không thể tồn tại, thay vì thêm check.

**Chi phí:** phải migrate dữ liệu giỏ hàng đang lưu (localStorage?). Cần đọc `CartContext.tsx` để xác định. Thêm version + migration:

```ts
const CART_VERSION = 2
function migrateCart(raw: unknown): Cart {
  // v1 → v2: suy ra kind từ sku prefix (dùng logic cũ ĐÚNG MỘT LẦN, ở đây)
}
```

---

## 7. `CartPage` + `CartDrawer`

### 7.1 Chuẩn hoá

- `CartDrawer` → Radix `Drawer side="right"` (spec 02 §5). Bỏ prop `isOpen`/`onClose`, dùng `useCart()` trực tiếp.
- `QuantityStepper` (spec 02 §9) thay các cụm `- n +` tự viết.
- Xoá item: **không** dùng `ConfirmDialog`. Dùng xoá ngay + toast có "Hoàn tác" (5s). Confirm dialog cho việc xoá 1 dòng giỏ hàng là ma sát vô nghĩa — undo tốt hơn confirm cho hành động rẻ và đảo ngược được.

```tsx
const removeItem = (item: CartItem) => {
  const snapshot = { ...item }
  cart.remove(item)
  toast({
    title: `Đã xoá ${item.productName}`,
    action: <Button variant="ghost" size="sm" onClick={() => cart.add(snapshot)}>Hoàn tác</Button>,
  })
}
```

### 7.2 Kiểm tra tồn kho khi vào giỏ — tính năng cần có cho perishable

Với bánh short-shelf-life, sản phẩm có thể hết hàng **trong lúc** đang ở giỏ. Hiện tại người dùng chỉ biết khi submit checkout và nhận lỗi từ backend.

```tsx
// Khi mở CartPage / CartDrawer: revalidate tồn kho
const { data: stock } = useCartStockCheck(cart.items)

// Trong CartItem
{stock?.[item.key]?.available === 0 && (
  <Alert variant="warning" className="mt-2">
    <AlertDescription>
      Sản phẩm này đã hết hàng. Xoá khỏi giỏ để tiếp tục thanh toán.
    </AlertDescription>
  </Alert>
)}
{stock?.[item.key]?.available > 0 && stock[item.key].available < item.quantity && (
  <Alert variant="warning" className="mt-2">
    <AlertDescription>
      Chỉ còn {stock[item.key].available} sản phẩm.
      <Button variant="link" size="sm" onClick={() => setQty(stock[item.key].available)}>
        Cập nhật số lượng
      </Button>
    </AlertDescription>
  </Alert>
)}
```

Và **chặn** vào checkout khi có item không khả dụng, ghi rõ lý do trên nút thay vì để người dùng bấm rồi mới lỗi.

Dùng endpoint `/products/{id}/availability` từ spec 04 §2.3, hoặc thêm `POST /cart/validate` nhận danh sách item trả trạng thái từng cái (1 request thay N).

### 7.3 `CartSummary` (290 dòng) — tách voucher

`CartSummary` đang giữ state voucher riêng (`voucherCode`, `voucherError`, `appliedVoucherCode`) và **sync với prop `discount`** qua `useEffect` (dòng 41-46):

```tsx
useEffect(() => {
  if (discount === 0 && appliedVoucherCode) setAppliedVoucherCode(null)
}, [discount, appliedVoucherCode])
```

Đây là dấu hiệu điển hình của **state trùng lặp**: nguồn sự thật về voucher đã áp dụng nằm ở `CartContext` (`appliedVoucher`), nhưng `CartSummary` giữ bản sao rồi phải sync ngược. Kiểu này luôn dẫn tới bug lệch state.

**Fix:** `VoucherField` không giữ state "đã áp dụng" — đọc trực tiếp từ `useCart().appliedVoucher`. Chỉ giữ state của input đang gõ và lỗi vừa nhận. `useEffect` sync biến mất.

Đây cũng là lý do `CheckoutPage.tsx:60-64` có thêm một `useEffect` nữa để auto-fill `voucherCode` từ `appliedVoucher` — cùng một state được nhân bản ở 3 chỗ.

---

## 8. `PaymentQRPage` — polling

`PaymentQRPage.tsx:24` có `setInterval` với `clearInterval` ở cleanup — đúng cơ bản. Cần kiểm và bổ sung:

| Điểm | Yêu cầu |
|---|---|
| Countdown hết hạn QR | Hiện rõ "Mã hết hạn sau 09:42", `aria-live="polite"` nhưng **throttle** — không đọc từng giây (spam screen reader). Chỉ announce ở mốc 5 phút, 1 phút, hết hạn |
| QR hết hạn | Che QR + nút "Tạo mã mới", không để người dùng quét mã chết |
| Tab ẩn | `document.visibilityState === 'hidden'` → **dừng** polling. Người dùng mở app MoMo trên cùng máy → tab checkout ẩn → không cần poll |
| Quay lại tab | Poll ngay 1 lần rồi tiếp tục interval |
| Backoff | Poll 3s trong 1 phút đầu, sau đó 10s. Đừng poll 3s trong 15 phút |
| Thanh toán thành công | `navigate(..., { replace: true })` sang trang success, **dừng interval trước khi navigate** |
| Rời trang | Cảnh báo "Đơn hàng chưa thanh toán. Bạn có thể thanh toán lại từ trang đơn hàng." — chứ không im lặng |
| Không có JS timer nào chạy sau unmount | `clearInterval` trong cleanup **và** guard `if (!mounted) return` sau mỗi await |

```tsx
useEffect(() => {
  let alive = true
  let timer: ReturnType<typeof setTimeout>
  const startedAt = Date.now()

  const tick = async () => {
    if (!alive || document.visibilityState === 'hidden') { schedule(); return }
    try {
      const s = await getPaymentStatus(orderId)
      if (!alive) return
      if (s.paid) { navigate(`/orders/${orderId}/success`, { replace: true }); return }
    } catch { /* im lặng, thử lại lần sau */ }
    schedule()
  }
  const schedule = () => {
    const elapsed = Date.now() - startedAt
    timer = setTimeout(tick, elapsed < 60_000 ? 3_000 : 10_000)
  }

  const onVisible = () => { if (document.visibilityState === 'visible') { clearTimeout(timer); tick() } }
  document.addEventListener('visibilitychange', onVisible)
  schedule()

  return () => { alive = false; clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible) }
}, [orderId, navigate])
```

**QR code phải có `alt` hữu ích.** Người dùng screen reader không quét được QR. Cần cung cấp phương án khác:

```tsx
<img src={qrDataUrl} alt="" aria-hidden />
<div className="mt-4 rounded-md bg-bg-subtle p-4 text-sm">
  <p className="font-medium text-fg">Không quét được mã?</p>
  <dl className="mt-2 space-y-1">
    <div className="flex justify-between gap-4">
      <dt className="text-fg-muted">Số điện thoại</dt>
      <dd className="font-medium tabular-nums">{momoPhone}
        <CopyButton value={momoPhone} label="Sao chép số điện thoại" />
      </dd>
    </div>
    <div className="flex justify-between gap-4">
      <dt className="text-fg-muted">Số tiền</dt>
      <dd className="font-medium tabular-nums">{formatPrice(amount)}
        <CopyButton value={String(amount)} label="Sao chép số tiền" />
      </dd>
    </div>
    <div className="flex justify-between gap-4">
      <dt className="text-fg-muted">Nội dung chuyển khoản</dt>
      <dd className="font-medium">{orderCode}
        <CopyButton value={orderCode} label="Sao chép nội dung" />
      </dd>
    </div>
  </dl>
</div>
```

Đây không chỉ là a11y — người dùng desktop cũng không quét QR trên chính màn hình mình được. Thiếu phương án nhập tay là mất một phần khách thật.

---

## 9. `OrderSuccessPage`

| Cần | Lý do |
|---|---|
| Mã đơn **to, copy được** | Khách cần mã để hỏi cửa hàng. `CopyButton` cạnh mã |
| Ngày + khung giờ giao, ghi rõ "(giờ Việt Nam)" | Xác nhận lại điều họ vừa chọn |
| Trạng thái thanh toán rõ ràng | "Đã thanh toán" vs "Sẽ trả khi nhận hàng" vs "Chờ cửa hàng xác nhận chuyển khoản" — 3 trạng thái khác nhau, không gộp |
| Việc tiếp theo | "Xem chi tiết đơn" + "Tiếp tục mua" — 2 nút, không dead end |
| Thời gian phản hồi dự kiến | "Cửa hàng sẽ gọi xác nhận trong 30 phút (trong giờ mở cửa)" — đặt kỳ vọng, giảm cuộc gọi hỏi |
| Không có confetti/animation nặng | Brand Soft Craft; và animation lớn trên trang cần đọc thông tin là phản tác dụng |
| `<h1>` là "Đặt hàng thành công" | Hiện tại cần verify. Trang này h1 phải là kết quả, không phải logo |
| Chặn back vào checkout | Đã dùng `replace: true` khi navigate (§2 Bug 1) |

---

## 10. Files phải sửa

### Backend (backlog, không phải UI nhưng luồng này phụ thuộc)
| Việc | Ưu tiên |
|---|---|
| Hỗ trợ header `Idempotency-Key` cho `POST /orders` | **P1** |
| `POST /cart/validate` — validate tồn kho nhiều item trong 1 request | P1 |
| `GET /store/config` — giờ mở cửa, lead time, khung giờ giao | P2 |

### Tạo mới
`src/components/checkout/{recipient-form,delivery-slot-picker,payment-method-picker,order-summary,order-summary-line,voucher-field,mobile-submit-bar}.tsx`, `src/hooks/{useCheckoutForm,useStoreHours,useCartStockCheck}.ts`, `src/utils/deliverySlots.ts` + `deliverySlots.test.ts`, `src/components/ui/{radio-card,copy-button}.tsx`

### Sửa
| File | Việc |
|---|---|
| `src/pages/CheckoutPage.tsx` | Từ 633 → ~110 dòng. Fix Bug 1/2/3 (§2). Bỏ `@mui/x-date-pickers` |
| `src/types/cart.ts` | Discriminated union (§6) |
| `src/contexts/CartContext.tsx` | Migrate cart v1→v2; bỏ state voucher trùng lặp |
| `src/components/cart/CartSummary.tsx` | Tách `VoucherField`, bỏ `useEffect` sync (§7.3) |
| `src/components/cart/CartDrawer.tsx` | Radix Drawer |
| `src/components/cart/CartItem.tsx` | `QuantityStepper`, cảnh báo tồn kho, undo thay confirm |
| `src/pages/CartPage.tsx` | `<Container>`, stock check, chặn checkout khi có item hết hàng |
| `src/pages/PaymentQRPage.tsx` | §8 — polling backoff, visibility, phương án nhập tay |
| `src/pages/OrderSuccessPage.tsx` | §9 |
| `src/utils/giftBoxHelpers.ts` | `parseGiftBoxMetadata` chỉ còn dùng trong migration v1→v2 |

---

## 11. Acceptance criteria

### Bug fix (§2)
- [ ] Giả lập `createMomoQRPayment` fail (DevTools block request) → người dùng **không** thấy toast "thành công" rồi lỗi; được điều hướng tới trang đơn hàng với thông báo rõ ràng
- [ ] Submit 2 lần nhanh (throttle network 3G, double-tap) → chỉ **1** đơn trong DB
- [ ] Để trống cả 4 field bắt buộc → submit **1 lần** hiện **cả 4** lỗi, mỗi lỗi cạnh field của nó
- [ ] Submit khi có lỗi → focus tự nhảy vào field lỗi đầu tiên, trang scroll tới đó
- [ ] Nhập SĐT `"abc"` → bị chặn với thông báo có ví dụ; nhập `0901234567` → qua
- [ ] Screen reader vào field lỗi → đọc label rồi đọc nội dung lỗi

### Delivery slot & timezone
- [ ] Đặt lúc 19:30 → khung giờ hôm nay **không còn cái nào** khả dụng, hiện gợi ý chọn ngày khác
- [ ] Đặt lúc 07:00 → khung 08:00-10:00 hiện nhưng disabled (chưa đủ 2h), khung 10:00-12:00 khả dụng
- [ ] **Timezone:** đổi timezone máy sang `America/New_York`, chọn khung 14:00-16:00 → payload gửi lên là 14:00 giờ VN (`+07:00`), không lệch
- [ ] UI hiện chữ "(giờ Việt Nam)" cạnh khung giờ
- [ ] `npm test src/utils/deliverySlots.test.ts` pass, có case biên giờ mở/đóng cửa và case timezone
- [ ] `grep -rn "storeOpenHour = 8" src` → 0 kết quả (đã chuyển sang config)

### MUI removal
- [ ] `grep -rn "@mui" src/pages src/components --exclude-dir=admin` → **0 kết quả**
- [ ] `grep -rn "@mui/x-date-pickers" src/pages/CheckoutPage.tsx` → 0
- [ ] Bundle: so với baseline spec 00, storefront chunk giảm ≥ 50KB gzip

### Cart type safety
- [ ] `grep -rn "startsWith('GIFTBOX-')" src` → chỉ còn trong hàm migration
- [ ] Đổi `CartItem` sang union → TypeScript báo lỗi ở mọi chỗ đọc `item.variantId` không narrow `kind` (chứng minh union hoạt động)
- [ ] Giỏ hàng lưu từ version cũ (localStorage v1) → mở app → migrate được, không mất item, không crash
- [ ] Đoạn `validItems.filter` và `if (validItems.length === 0)` (dòng 142) đã **xoá**

### Stock validation
- [ ] Thêm sản phẩm vào giỏ → xoá hết tồn kho trong DB → refresh trang giỏ → hiện cảnh báo "đã hết hàng"
- [ ] Giảm tồn kho xuống nhỏ hơn số trong giỏ → hiện "Chỉ còn N" + nút cập nhật số lượng, bấm thì số lượng đổi đúng
- [ ] Có item không khả dụng → nút "Thanh toán" disabled + ghi rõ lý do trên nút
- [ ] Kiểm tra tồn kho cả giỏ = **1** request, không phải N

### Payment QR
- [ ] Chuyển sang tab khác → Network tab **dừng** polling
- [ ] Quay lại tab → poll ngay lập tức 1 lần
- [ ] Sau 1 phút → khoảng poll giãn từ 3s sang 10s
- [ ] QR hết hạn → QR bị che, nút "Tạo mã mới" hiện
- [ ] Countdown **không** đọc từng giây trên screen reader; chỉ announce ở 5 phút / 1 phút / hết hạn
- [ ] Có phương án nhập tay: SĐT, số tiền, nội dung CK — mỗi cái có nút copy hoạt động
- [ ] Unmount trang khi đang có request bay → không warning "setState on unmounted", không timer sót (kiểm bằng React DevTools Profiler)

### Mobile UX
- [ ] Mobile: summary là accordion **đóng sẵn**, chỉ hiện tổng tiền
- [ ] Sticky submit bar đáy hiện tổng tiền + nút, không bị home indicator che (test iPhone thật)
- [ ] Mọi radio khung giờ, radio payment ≥ 44px chiều cao

---

## TL;DR

- **Bug 1 (P0):** `clearCart()` + toast "thành công" chạy **trước** `createMomoQRPayment`. Payment fail → người dùng thấy giỏ trống + toast xanh + lỗi đỏ, đơn đã tồn tại nhưng họ không biết → submit lại → **đơn trùng**.
- **Bug 2 (P1):** không có idempotency key ở `POST /orders` → double submit / network retry tạo đơn trùng.
- **Bug 3 (P1):** validation early-return, một lỗi một lần, hiện ở đầu trang → để trống 4 field phải submit **5 lần**; trên mobile submit trông như không phản hồi. Và SĐT không validate format — đơn không giao được.
- **Timezone sai:** `getMinDeliveryTime()` dùng `dayjs()` (giờ máy khách) rồi `toISOString()`. Khách ở nước ngoài đặt bánh giao Sài Gòn sẽ lệch giờ.
- Bỏ `@mui/x-date-pickers` (~60KB) bằng **chip ngày + khung giờ** thay datetime picker: ràng buộc trở nên không thể vi phạm thay vì phải báo lỗi sau, và khớp cách bakery giao thật.
- `CartItem` dùng `sku.startsWith('GIFTBOX-')` làm discriminator → đổi sang **discriminated union**, làm `validItems.filter` và check "giỏ không hợp lệ" biến mất vì trạng thái đó không biểu diễn được nữa.
- `CartSummary` nhân bản state voucher rồi `useEffect` sync ngược — nguồn sự thật ở `CartContext`, cùng state đang tồn tại ở 3 chỗ.
- QR payment cần phương án nhập tay (SĐT/số tiền/nội dung + copy): screen reader không quét được QR, và người dùng desktop cũng không.
