# Spec 11 — Admin forms

> Phase 7a. 6 form, tổng 2.722 LOC. Chỉ **1/6** có validation.
> Form nhập lô hàng (`AdminBatchCreatePage`, 511 dòng) có **0** validation — và sai ngày hết hạn ở đây làm hỏng trực tiếp FEFO.

---

## 1. Hiện trạng

### 1.1 Bảng khảo sát toàn bộ form admin

| File | LOC | `validate()` | Field errors | Unsaved guard |
|---|---|---|---|---|
| `components/admin/vouchers/VoucherForm.tsx` | 514 | **Có** | **Có** | Không |
| `components/admin/products/ProductForm.tsx` | 500 | Không | Không | Không |
| `pages/admin/AdminBatchCreatePage.tsx` | **511** | **Không** | Không | Không |
| `pages/admin/AdminGiftBoxPage.tsx` | 810 | Không | Không | Không |
| `pages/admin/AdminProductPage.tsx` | 214 | Không | Không | Không |
| `pages/admin/AdminVoucherPage.tsx` | 173 | Không | Không | Không |

```bash
$ grep -rn "beforeunload" frontend/src/{pages,components,layout}/admin | wc -l
0
$ grep -rn "[^.a-zA-Z]alert(" frontend/src/{pages,components}/admin
ProductForm.tsx:113:  alert('Vui lòng chọn file ảnh')
ProductForm.tsx:119:  alert('File ảnh không được vượt quá 5MB')
ProductForm.tsx:162:  alert(error instanceof Error ? error.message : 'Upload ảnh thất bại')
$ grep -rn "console.error" frontend/src/{pages,components}/admin | wc -l
20
```

### 1.2 Ba vấn đề, theo mức độ nghiêm trọng

#### A — `AdminBatchCreatePage` không validate gì: đây là lỗi làm hỏng dữ liệu nghiệp vụ

Form nhập lô hàng là nơi dữ liệu FEFO **bắt đầu**. Nhập sai ở đây thì mọi thứ phía sau sai theo, và không có cách nào phát hiện tự động.

Các cách nhập sai mà hiện tại **không có gì chặn**:

| Nhập sai | Hệ quả |
|---|---|
| `ngay_het_han` **trước** `ngay_san_xuat` | Lô vô nghĩa; FEFO sắp xếp sai |
| `ngay_het_han` = ngày trong quá khứ | Sau khi fix B1 (spec 04 §2.3), lô này **không bao giờ bán được** — nhập hàng xong không bán được mà không ai biết tại sao |
| `so_luong` = 0 hoặc âm | Lô rỗng chiếm chỗ trong query FEFO |
| `so_luong` cực lớn do gõ nhầm (`10000` thay `1000`) | Tồn kho sai, báo cáo sai |
| Shelf life bất thường (bánh tươi mà hạn 2 năm) | Không ai phát hiện; lô đó luôn nằm cuối thứ tự FEFO nên không bao giờ được ưu tiên bán |
| Trùng lô (nhập 2 lần cùng dữ liệu do bấm 2 lần) | Tồn kho gấp đôi |

Dòng "shelf life bất thường" đáng nói riêng: nó không phải lỗi nhập rõ ràng, nên validation kiểu "bắt buộc/không âm" không bắt được. Cần **cảnh báo mềm** dựa trên khoảng hạn dùng thông thường của danh mục đó.

Với bakery bán bánh short-shelf-life, form này quan trọng hơn mọi form khác trong app — kể cả checkout. Checkout sai thì mất một đơn; batch sai thì sai cả hệ thống tồn kho.

#### B — `alert()` native cho lỗi

`ProductForm.tsx:113,119,162`:

```tsx
if (!file.type.startsWith('image/')) {
  alert('Vui lòng chọn file ảnh')
  return
}
if (file.size > 5 * 1024 * 1024) {
  alert('File ảnh không được vượt quá 5MB')
  return
}
```

Bốn vấn đề:

1. **Chặn toàn bộ luồng** — modal của OS, phải bấm OK mới làm được gì.
2. **Không style được**, phá vỡ hoàn toàn cảm giác sản phẩm. Đây là thứ recruiter nhận ra ngay.
3. **Không nói rõ file bao nhiêu MB.** "Không được vượt quá 5MB" — nhưng file của tôi mấy MB? Người dùng phải tự đi xem.
4. **Không gắn với field** → không biết lỗi thuộc ô nào (dù ở đây chỉ có 1 ô file, các form khác thì có).

#### C — Không có unsaved-changes guard: mất dữ liệu thật

`AdminBatchCreatePage` 511 dòng với nhiều field. Nhân viên nhập nửa form → bấm sai một link ở sidebar → **mất hết, không cảnh báo**.

Đây là việc làm nhiều lần mỗi ngày. Mất một lần là bực; mất vài lần là mất tin cậy vào tool và quay lại dùng Excel — đúng cái vấn đề mà README nói project này giải quyết.

Cần chặn **hai đường**:

- Đóng tab / reload → `beforeunload`
- Điều hướng trong SPA (bấm sidebar) → react-router blocker. **Đây là đường hay bị bỏ**, vì `beforeunload` không bắt được navigation nội bộ.

---

## 2. Chuẩn hoá validation

### 2.1 `VoucherForm` là mẫu tốt — nâng nó thành chuẩn

`VoucherForm.tsx:131-168` đã làm đúng: object lỗi theo field, validate hết rồi mới return, message tiếng Việt cụ thể. Không viết lại từ đầu — **trích ra thành pattern dùng chung**.

```ts
// src/hooks/admin/useAdminForm.ts
export type FieldErrors<T> = Partial<Record<keyof T, string>>

export function useAdminForm<T extends Record<string, unknown>>(opts: {
  initial: T
  validate: (v: T) => FieldErrors<T>
  onSubmit: (v: T) => Promise<void>
  /** Thứ tự field theo DOM — để focus đúng field lỗi ĐẦU TIÊN */
  fieldOrder: (keyof T)[]
}) {
  const [values, setValues] = useState<T>(opts.initial)
  const [errors, setErrors] = useState<FieldErrors<T>>({})
  const [touched, setTouched] = useState<Set<keyof T>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const initialRef = useRef(opts.initial)

  const isDirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initialRef.current),
    [values]
  )

  const setField = <K extends keyof T>(k: K, v: T[K]) => {
    setValues((s) => ({ ...s, [k]: v }))
    // Xoá lỗi của field đang gõ — đừng để lỗi đỏ trong khi người dùng đang sửa
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e))
  }

  /** Validate lại field khi rời khỏi nó — bắt lỗi sớm, không đợi submit */
  const blurField = (k: keyof T) => {
    setTouched((t) => new Set(t).add(k))
    const all = opts.validate(values)
    if (all[k]) setErrors((e) => ({ ...e, [k]: all[k] }))
  }

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setSubmitError(null)
    const errs = opts.validate(values)
    setErrors(errs)

    if (Object.keys(errs).length) {
      // Focus field lỗi đầu tiên theo thứ tự DOM — WCAG 3.3.1
      const first = opts.fieldOrder.find((f) => errs[f])
      if (first) document.getElementById(String(first))?.focus()
      return
    }

    setSubmitting(true)
    try {
      await opts.onSubmit(values)
      initialRef.current = values      // reset dirty sau khi lưu thành công
    } catch (err) {
      // KHÔNG alert(), KHÔNG chỉ console.error. Hiện lên UI.
      setSubmitError(err instanceof Error ? err.message : 'Lưu thất bại. Vui lòng thử lại.')
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  return { values, setField, blurField, errors, touched, isDirty,
           submitting, submitError, submit, reset: () => setValues(initialRef.current) }
}
```

### 2.2 Bỏ `alert()` — thay bằng gì

| Loại | Dùng gì | Vì sao |
|---|---|---|
| Lỗi validation của field | `<TextField error helperText>` cạnh field | Người dùng thấy chỗ cần sửa |
| Lỗi upload file | `helperText` dưới ô file **+ nêu số cụ thể** | "File 8,2 MB — tối đa 5 MB" |
| Lỗi submit (network/server) | `<Alert severity="error">` trong `DialogContent`, **không** toast | Cần đọc kỹ và có thể retry; toast biến mất |
| Lưu thành công | `toast` | Đã xong, không cần hành động |
| Xoá thành công | `toast` + nút **Hoàn tác** nếu có thể | Ops tool: xoá nhầm là chuyện thường |

```tsx
// Thay ProductForm.tsx:113-121
const MAX_MB = 5
const onPickFile = (file: File) => {
  if (!file.type.startsWith('image/')) {
    setFileError(`Định dạng "${file.type || 'không rõ'}" không được hỗ trợ. Dùng JPG, PNG hoặc WebP.`)
    return
  }
  const mb = file.size / 1024 / 1024
  if (mb > MAX_MB) {
    // Nêu SỐ CỤ THỂ — "quá 5MB" không cho người dùng biết phải nén xuống bao nhiêu
    setFileError(`Ảnh ${mb.toLocaleString('vi', { maximumFractionDigits: 1 })} MB — tối đa ${MAX_MB} MB.`)
    return
  }
  setFileError(null)
  upload(file)
}
```

Và bỏ 20 chỗ `console.error` đứng một mình — `console.error` là để debug, không phải để thông báo. Giữ `console.error` **cộng thêm** hiển thị lên UI.

---

## 3. Validation cho `AdminBatchCreatePage` — quan trọng nhất

Đây là phần có giá trị nghiệp vụ cao nhất của spec 11.

### 3.1 Ba tầng: lỗi cứng → cảnh báo mềm → xác nhận

```ts
// src/utils/admin/validateBatch.ts
import dayjs from 'dayjs'

export interface BatchInput {
  bienthe_id: number | null
  ngay_san_xuat: string | null
  ngay_het_han: string | null
  so_luong: number
  nhacungcap_id: number | null
  gia_nhap: number | null
  ma_lo?: string
}

/** Khoảng hạn dùng thông thường theo danh mục, tính từ ngày sản xuất.
 *  Dùng để CẢNH BÁO, không phải để chặn. Lấy từ config/backend, không hardcode
 *  trong component. */
export interface ShelfLifeRule { minDays: number; maxDays: number }

/* ---------- Tầng 1: LỖI CỨNG — chặn submit ---------- */
export function validateBatchHard(v: BatchInput): FieldErrors<BatchInput> {
  const e: FieldErrors<BatchInput> = {}
  const today = dayjs().startOf('day')

  if (!v.bienthe_id) e.bienthe_id = 'Chọn biến thể sản phẩm'
  if (!v.nhacungcap_id) e.nhacungcap_id = 'Chọn nhà cung cấp'

  if (!v.ngay_san_xuat) {
    e.ngay_san_xuat = 'Nhập ngày sản xuất'
  } else if (dayjs(v.ngay_san_xuat).isAfter(today)) {
    e.ngay_san_xuat = 'Ngày sản xuất không thể ở tương lai'
  }

  if (!v.ngay_het_han) {
    e.ngay_het_han = 'Nhập ngày hết hạn'
  } else {
    const hsd = dayjs(v.ngay_het_han)
    // Quan trọng nhất: hết hạn phải SAU sản xuất
    if (v.ngay_san_xuat && hsd.isBefore(dayjs(v.ngay_san_xuat))) {
      e.ngay_het_han = 'Ngày hết hạn phải sau ngày sản xuất'
    } else if (hsd.isBefore(today)) {
      // Sau khi fix B1, lô hết hạn KHÔNG BAO GIỜ được phân bổ.
      // Cho nhập mà không cảnh báo = nhập hàng vào hệ thống rồi không bán được.
      e.ngay_het_han = 'Lô đã hết hạn, không thể bán. Kiểm tra lại ngày.'
    }
  }

  if (!Number.isFinite(v.so_luong) || v.so_luong <= 0) {
    e.so_luong = 'Số lượng phải lớn hơn 0'
  } else if (!Number.isInteger(v.so_luong)) {
    e.so_luong = 'Số lượng phải là số nguyên'
  }

  if (v.gia_nhap !== null && v.gia_nhap < 0) e.gia_nhap = 'Giá nhập không được âm'

  return e
}

/* ---------- Tầng 2: CẢNH BÁO MỀM — cho submit, nhưng phải xác nhận ---------- */
export interface SoftWarning { field: keyof BatchInput; message: string }

export function validateBatchSoft(
  v: BatchInput,
  ctx: { shelfLife?: ShelfLifeRule; medianQty?: number; recentDuplicate?: boolean }
): SoftWarning[] {
  const w: SoftWarning[] = []

  // Shelf life bất thường — loại lỗi mà validation cứng không bắt được
  if (v.ngay_san_xuat && v.ngay_het_han && ctx.shelfLife) {
    const days = dayjs(v.ngay_het_han).diff(dayjs(v.ngay_san_xuat), 'day')
    if (days > ctx.shelfLife.maxDays) {
      w.push({ field: 'ngay_het_han',
        message: `Hạn dùng ${days} ngày — dài hơn thông thường (${ctx.shelfLife.maxDays} ngày) cho loại sản phẩm này.` })
    }
    if (days < ctx.shelfLife.minDays) {
      w.push({ field: 'ngay_het_han',
        message: `Hạn dùng chỉ ${days} ngày — ngắn hơn thông thường (${ctx.shelfLife.minDays} ngày).` })
    }
  }

  // Gõ nhầm số lượng: 10000 thay vì 1000
  if (ctx.medianQty && v.so_luong > ctx.medianQty * 10) {
    w.push({ field: 'so_luong',
      message: `${v.so_luong.toLocaleString('vi')} lớn hơn 10 lần mức thường nhập (${ctx.medianQty.toLocaleString('vi')}). Kiểm tra lại.` })
  }

  // Sắp hết hạn ngay khi nhập — không sai, nhưng cần biết
  if (v.ngay_het_han) {
    const left = dayjs(v.ngay_het_han).diff(dayjs(), 'day')
    if (left >= 0 && left <= 2) {
      w.push({ field: 'ngay_het_han',
        message: `Lô này hết hạn sau ${left} ngày. Nên ưu tiên bán ngay hoặc giảm giá.` })
    }
  }

  // Nghi trùng lô (bấm 2 lần / nhập lại)
  if (ctx.recentDuplicate) {
    w.push({ field: 'ma_lo',
      message: 'Vừa có một lô cùng sản phẩm, cùng ngày sản xuất và số lượng được tạo trong 5 phút qua. Có thể bị trùng.' })
  }

  return w
}
```

### 3.2 UX của cảnh báo mềm

```tsx
{softWarnings.length > 0 && (
  <Alert severity="warning" sx={{ mb: 2 }}>
    <AlertTitle>Kiểm tra lại trước khi lưu</AlertTitle>
    <ul style={{ margin: 0, paddingLeft: 20 }}>
      {softWarnings.map((w, i) => <li key={i}>{w.message}</li>)}
    </ul>
    <FormControlLabel
      sx={{ mt: 1 }}
      control={<Checkbox checked={ackWarnings} onChange={(e) => setAckWarnings(e.target.checked)} />}
      label="Tôi đã kiểm tra, số liệu đúng"
    />
  </Alert>
)}

<Button type="submit" variant="contained"
        disabled={submitting || (softWarnings.length > 0 && !ackWarnings)}>
  Tạo lô hàng
</Button>
```

**Checkbox xác nhận, không phải dialog.** Dialog "Bạn có chắc?" bị bấm Yes theo phản xạ sau lần thứ ba. Checkbox nằm cạnh nội dung cảnh báo buộc mắt đi qua chỗ có thông tin.

**Cảnh báo mềm không được chặn cứng.** Có trường hợp hợp lệ thật: bánh khô hạn dài, nhập lô lớn cho đơn đặt tiệc. Chặn cứng thì nhân viên sẽ tìm cách lách (nhập sai ngày rồi sửa sau) — tệ hơn nhiều.

### 3.3 Backend cần cung cấp

| Việc | Endpoint | Dùng cho |
|---|---|---|
| Khoảng hạn dùng theo danh mục | `GET /categories/{id}/shelf-life` hoặc thêm field vào category | `ctx.shelfLife` |
| Median số lượng nhập của biến thể | `GET /batches/stats?bienthe_id=` | `ctx.medianQty` |
| Kiểm trùng lô gần đây | `GET /batches/duplicate-check?bienthe_id=&ngay_san_xuat=&so_luong=` | `ctx.recentDuplicate` |

Nếu chưa có, `validateBatchSoft` graceful degrade: `ctx` rỗng → không cảnh báo gì, form vẫn hoạt động. **Đừng chặn phase 7a để chờ backend** — làm tầng 1 (lỗi cứng) trước, tầng 2 sau.

**Và validation tầng 1 phải có ở backend nữa.** Frontend validate là UX; backend validate là đúng đắn. `ngay_het_han >= ngay_san_xuat` phải là constraint ở DB hoặc Pydantic validator, không thể chỉ dựa vào form.

```python
# app/routers/batches.py
class ProductBatchCreate(BaseModel):
    ngay_san_xuat: date
    ngay_het_han: date
    so_luong: int = Field(..., gt=0)

    @model_validator(mode='after')
    def check_dates(self):
        if self.ngay_het_han < self.ngay_san_xuat:
            raise ValueError('ngay_het_han phải >= ngay_san_xuat')
        return self
```

---

## 4. Unsaved-changes guard

```ts
// src/hooks/admin/useUnsavedChanges.ts
import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'   // react-router 6.19+

export function useUnsavedChanges(isDirty: boolean, message =
  'Bạn có thay đổi chưa lưu. Rời khỏi trang sẽ mất các thay đổi này.') {

  // Đường 1: đóng tab / reload / bấm Back của browser
  useEffect(() => {
    if (!isDirty) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [isDirty])

  // Đường 2: điều hướng TRONG SPA (bấm sidebar). beforeunload KHÔNG bắt được cái này
  // — đây là đường hay bị bỏ, và là đường xảy ra nhiều nhất trong admin.
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    isDirty && currentLocation.pathname !== nextLocation.pathname
  )

  return { blocker, message }
}
```

```tsx
// Trong page
const { blocker, message } = useUnsavedChanges(form.isDirty)

<Dialog open={blocker.state === 'blocked'} onClose={() => blocker.reset?.()}>
  <DialogTitle>Rời khỏi trang?</DialogTitle>
  <DialogContent><DialogContentText>{message}</DialogContentText></DialogContent>
  <DialogActions>
    <Button onClick={() => blocker.reset?.()}>Ở lại</Button>
    <Button color="error" onClick={() => blocker.proceed?.()}>Rời đi, không lưu</Button>
  </DialogActions>
</Dialog>
```

**Nhãn nút phải nói rõ hậu quả.** "Rời đi, không lưu" thay vì "OK". Người dùng đọc nút nhanh hơn đọc nội dung dialog.

**`isDirty` so sánh với snapshot ban đầu**, không phải "đã từng gõ". Nếu người dùng gõ rồi xoá về nguyên trạng, đừng cảnh báo. `useAdminForm` đã làm đúng bằng `JSON.stringify` so với `initialRef`.

**Reset `isDirty` sau khi lưu thành công** — nếu không, lưu xong vẫn bị cảnh báo khi rời trang.

Áp dụng cho: `AdminBatchCreatePage`, `ProductForm`, `VoucherForm`, `AdminGiftBoxBomPage` (form BOM), `AdminProductPage` (nếu có form inline).

---

## 5. Form trong Dialog vs form trong Page

Hiện tại lẫn lộn: `ProductForm` và `VoucherForm` là Dialog; `AdminBatchCreatePage` là page riêng.

**Quy tắc:**

| Dùng Dialog | Dùng Page riêng |
|---|---|
| ≤ 6 field | > 6 field |
| Không cần tham chiếu dữ liệu khác trên màn hình | Cần xem bảng/dữ liệu khác trong lúc nhập |
| Tạo/sửa nhanh, làm liên tục nhiều lần | Nhập một lần, cẩn thận |
| Không cần deep link | **Cần deep link** (share URL cho đồng nghiệp xem) |

Theo quy tắc này:

- `ProductForm` (Dialog) — hợp lý, ~8 field nhưng thao tác nhanh và làm liên tục. Giữ Dialog.
- `VoucherForm` (Dialog, 514 LOC, ~10 field kèm chọn sản phẩm áp dụng) — **nên chuyển thành page**. Chọn sản phẩm áp dụng cần thấy danh sách sản phẩm.
- `AdminBatchCreatePage` (page) — đúng.

**Nếu giữ Dialog, phải có:**

- `disableEscapeKeyDown` khi `isDirty` — Escape đóng dialog làm mất dữ liệu, và Escape là phản xạ
- Click backdrop **không** đóng khi `isDirty`
- Focus vào field đầu tiên khi mở (MUI `autoFocus`)
- `Cmd/Ctrl + Enter` submit — ops tool, nhân viên gõ nhanh không muốn rời bàn phím

```tsx
<Dialog
  open={open}
  onClose={(_, reason) => {
    if (form.isDirty && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
      setConfirmClose(true)     // hỏi trước
      return
    }
    onClose()
  }}
  disableEscapeKeyDown={form.isDirty}
  maxWidth="sm" fullWidth
>
```

---

## 6. A11y form

MUI `TextField` cho sẵn `label` gắn `htmlFor` và `helperText` gắn `aria-describedby`. Phần **phải tự làm**:

- [ ] `id` khớp với `fieldOrder` để `document.getElementById(...).focus()` hoạt động
- [ ] `error` + `helperText` cùng lúc — `error` một mình chỉ đổi màu viền → fail WCAG 1.4.1
- [ ] `required` trên field bắt buộc (MUI thêm `*` và `aria-required`)
- [ ] `<Alert severity="error">` cho lỗi submit phải có `role="alert"` (MUI Alert đã có)
- [ ] `<fieldset>` + `<legend>` cho nhóm radio (loại giảm giá: %/tiền)
- [ ] `autoComplete="off"` cho mã lô, SKU, mã voucher — không thì browser gợi ý giá trị cũ
- [ ] `inputMode="numeric"` cho số lượng, giá
- [ ] `aria-busy` trên form khi submitting
- [ ] Nút submit hiện trạng thái loading nhưng **giữ nguyên text** (đừng đổi thành spinner, nút co lại làm nhảy layout)

**`autoComplete="off"` cho mã lô là quan trọng thật:** nhân viên nhập nhiều lô liên tiếp, browser sẽ gợi ý mã lô cũ, và bấm nhầm tạo ra lô trùng mã.

---

## 7. Files phải sửa

### Tạo mới
| File | Nội dung |
|---|---|
| `src/hooks/admin/useAdminForm.ts` | §2.1 |
| `src/hooks/admin/useUnsavedChanges.ts` | §4 |
| `src/utils/admin/validateBatch.ts` | §3.1 |
| `src/utils/admin/validateBatch.test.ts` | Unit test — §9 |
| `src/utils/admin/validateProduct.ts` | Trích từ pattern VoucherForm |
| `src/components/admin/ui/unsaved-changes-dialog.tsx` | §4 |
| `src/components/admin/ui/soft-warnings.tsx` | §3.2 |

### Sửa
| File | Việc |
|---|---|
| `components/admin/products/ProductForm.tsx` | **Bỏ 3 `alert()`** (`:113,119,162`); thêm validation theo field; `useAdminForm`; guard; `Cmd+Enter` |
| `components/admin/vouchers/VoucherForm.tsx` | Trích `validate()` ra file riêng; dùng `useAdminForm`; guard; **cân nhắc chuyển thành page** (§5) |
| `pages/admin/AdminBatchCreatePage.tsx` | **Thêm toàn bộ validation** (§3); guard; tách 511 → ~180 dòng |
| `pages/admin/AdminGiftBoxBomPage.tsx` | Guard; validation cho BOM (tổng thành phần > 0) |
| `pages/admin/AdminProductPage.tsx` | Bỏ `console.error` đứng một mình |
| `pages/admin/AdminVoucherPage.tsx` | như trên |
| 20 chỗ `console.error` | Giữ `console.error` **và** hiện lỗi lên UI |

### Backend
| File | Việc | Ưu tiên |
|---|---|---|
| `app/routers/batches.py` | `model_validator` cho `ngay_het_han >= ngay_san_xuat`, `so_luong > 0` | **P0** — frontend validate không đủ |
| `app/routers/batches.py` | `GET /batches/duplicate-check` | P2 |
| `app/routers/batches.py` | `GET /batches/stats?bienthe_id=` (median qty) | P2 |
| category | field `shelf_life_min_days` / `shelf_life_max_days` | P2 |

---

## 8. Acceptance criteria

### Bỏ alert()
- [ ] `grep -rn "[^.a-zA-Z]alert(" src/{pages,components}/admin` → **0**
- [ ] Chọn file `.pdf` cho ảnh sản phẩm → lỗi hiện **dưới ô file**, nêu rõ định dạng không hỗ trợ
- [ ] Chọn ảnh 8MB → lỗi ghi **"Ảnh 8,2 MB — tối đa 5 MB"**, có số cụ thể
- [ ] Không có `alert()` nào chặn luồng

### Validation batch (quan trọng nhất)
- [ ] `ngay_het_han` trước `ngay_san_xuat` → **chặn**, message rõ
- [ ] `ngay_het_han` = hôm qua → **chặn**, nói rõ "lô đã hết hạn, không thể bán"
- [ ] `ngay_san_xuat` = ngày mai → **chặn**
- [ ] `so_luong` = 0 → chặn; `= -5` → chặn; `= 1.5` → chặn (phải nguyên)
- [ ] Nhập `so_luong` gấp > 10 lần mức thường → **cảnh báo mềm**, cho submit sau khi tick xác nhận
- [ ] Hạn dùng dài bất thường → cảnh báo mềm, **không chặn cứng**
- [ ] Cảnh báo mềm chưa tick → nút "Tạo lô hàng" **disabled**
- [ ] Backend: `POST /batches/products` với `ngay_het_han < ngay_san_xuat` → **422** (không chỉ dựa frontend)
- [ ] `npm test src/utils/admin/validateBatch.test.ts` pass

### Unsaved guard
- [ ] Nhập nửa `AdminBatchCreatePage` → **bấm link sidebar** → hiện dialog cảnh báo
- [ ] Dialog có 2 nút: "Ở lại" và "Rời đi, không lưu" (nhãn nói rõ hậu quả)
- [ ] "Ở lại" → giữ nguyên dữ liệu đã nhập
- [ ] Nhập nửa form → **reload trang** → browser cảnh báo
- [ ] Gõ vào field rồi **xoá về nguyên trạng** → rời trang **không** cảnh báo
- [ ] **Lưu thành công** → rời trang **không** cảnh báo
- [ ] Dialog form khi `isDirty`: Escape **không** đóng ngay, hỏi trước
- [ ] Dialog form khi `isDirty`: click backdrop **không** đóng ngay

### Validation nhất quán
- [ ] Cả 6 form đều có validation theo field
- [ ] Submit khi có lỗi → focus vào field lỗi **đầu tiên theo thứ tự DOM**
- [ ] Đang gõ vào field có lỗi → lỗi **biến mất** ngay, không đợi submit
- [ ] Rời khỏi field (blur) mà sai → lỗi hiện **ngay**, không đợi submit
- [ ] Lỗi submit (network) hiện `<Alert>` trong form, **không** dùng toast
- [ ] Lưu thành công → toast
- [ ] `grep -rn "console.error" src/{pages,components}/admin` — mỗi chỗ đều **kèm** hiển thị lên UI

### Keyboard & a11y
- [ ] `Cmd/Ctrl + Enter` submit form trong Dialog
- [ ] Mở Dialog → focus vào field đầu tiên
- [ ] Field lỗi có **cả** viền đỏ **và** `helperText` (không chỉ màu)
- [ ] Field bắt buộc có `*` và `aria-required`
- [ ] Nhóm radio có `<fieldset>` + `<legend>`
- [ ] Mã lô / SKU / mã voucher có `autoComplete="off"`
- [ ] Số lượng / giá có `inputMode="numeric"`
- [ ] Nút submit loading: **giữ nguyên text**, không co lại
- [ ] axe trên 6 form → 0 violation
- [ ] Hoàn thành `AdminBatchCreatePage` **chỉ bằng bàn phím**

---

## 9. Unit test `validateBatch`

Đây là hàm thuần, business-critical, xứng đáng có test.

```ts
describe('validateBatchHard', () => {
  it('chặn ngày hết hạn trước ngày sản xuất', ...)
  it('chặn ngày hết hạn trong quá khứ', ...)
  it('chấp nhận ngày hết hạn = hôm nay', ...)        // biên: hôm nay còn dùng được
  it('chặn ngày sản xuất ở tương lai', ...)
  it('chặn số lượng 0, âm, và không nguyên', ...)
  it('không lỗi với input hợp lệ', ...)
})

describe('validateBatchSoft', () => {
  it('cảnh báo khi hạn dùng dài hơn maxDays', ...)
  it('cảnh báo khi số lượng > 10 lần median', ...)
  it('cảnh báo khi lô hết hạn trong 2 ngày', ...)
  it('KHÔNG cảnh báo gì khi ctx rỗng (graceful degrade)', ...)
  it('không chặn — luôn trả mảng, không throw', ...)
})
```

Case `ngày hết hạn = hôm nay` là biên quan trọng: phải **chấp nhận** (hết hạn cuối ngày), khớp với `ngay_het_han >= today` ở FEFO (spec 04 §2.3). Nếu hai chỗ dùng ngưỡng khác nhau thì form cho nhập mà FEFO không phân bổ được.

---

## TL;DR

- **Chỉ 1/6 form có validation.** `AdminBatchCreatePage` (511 dòng, form nhập lô hàng) có **0** — mà đây là nơi dữ liệu FEFO bắt đầu. Sai ở đây thì mọi thứ phía sau sai theo, không phát hiện tự động được.
- **Sáu cách nhập sai hiện không có gì chặn:** hết hạn trước sản xuất, hết hạn trong quá khứ (→ nhập hàng vào rồi không bán được sau khi fix B1), số lượng ≤ 0, gõ nhầm `10000` thay `1000`, shelf life bất thường, trùng lô do bấm 2 lần.
- **Ba tầng validation:** lỗi cứng (chặn) → cảnh báo mềm (tick xác nhận, **không** chặn) → xác nhận. Cảnh báo mềm không được chặn cứng, nếu không nhân viên sẽ lách bằng cách nhập sai ngày rồi sửa sau.
- **Xác nhận bằng checkbox, không bằng dialog "Bạn có chắc?"** — dialog bị bấm Yes theo phản xạ sau lần thứ ba.
- **`VoucherForm.tsx:131` là mẫu tốt sẵn có** — trích nó thành `useAdminForm` dùng chung, không viết lại từ đầu.
- **Unsaved guard phải chặn 2 đường:** `beforeunload` (đóng tab) **và** react-router `useBlocker` (bấm sidebar). Đường thứ 2 hay bị bỏ nhưng lại là đường xảy ra nhiều nhất trong admin.
- **3 `alert()` native** ở `ProductForm.tsx:113,119,162` — chặn luồng, không style được, và không nói file bao nhiêu MB.
- **Validation phải có ở cả backend.** Frontend validate là UX; `model_validator` cho `ngay_het_han >= ngay_san_xuat` là đúng đắn. Không thể chỉ dựa vào form.
- Biên `ngày hết hạn = hôm nay` phải **chấp nhận**, khớp với `>= today` ở FEFO. Hai chỗ khác ngưỡng thì form cho nhập mà FEFO không phân bổ được.
