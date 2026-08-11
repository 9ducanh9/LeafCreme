# Spec 06 — Account, Auth, Orders

> Phase 6. Login, Register, Profile, MyOrders, OrderDetail.
> Spec này chứa **1 bug conversion** và **1 lỗi UX toàn cục** (không có `autoComplete` ở đâu cả).

---

## 1. Phạm vi

| File | LOC | Vấn đề chính |
|---|---|---|
| `pages/LoginPage.tsx` | ~110 | Không `autoComplete`, redirect sai chỗ, input viết tay không dùng primitive |
| `pages/RegisterPage.tsx` | 300 | Không `autoComplete`, 1 error state cho cả form, không strength meter |
| `pages/UserProfilePage.tsx` | 446 | **2 thẻ `<h1>` trong 1 trang**, tab tự viết không có ARIA |
| `pages/MyOrdersPage.tsx` | 208 | Không filter theo trạng thái, không phân trang |
| `pages/OrderDetailPage.tsx` | 301 | — |
| `components/routing/ProtectedRoute.tsx` | 35 | **Bug: mất intent sau khi login** |
| `components/bakery/{ProfileForm,PasswordForm,ProfileSidebar,AvatarUploadSection}.tsx` | — | Dùng primitive mới |

---

## 2. Bug conversion — mất intent sau khi login

`components/routing/ProtectedRoute.tsx:23`

```tsx
if (!isAuthenticated) {
  return <Navigate to="/login" replace />
}
```

Không lưu trang người dùng muốn tới. Và `LoginPage.tsx:25`:

```tsx
await login(username, password)
navigate('/')        // ← luôn về trang chủ
```

**Kịch bản thực tế:**

1. Khách chọn bánh, thêm vào giỏ
2. Bấm "Thanh toán" → `/checkout` là protected → bị đẩy sang `/login`
3. Đăng nhập xong → hạ cánh ở **trang chủ**
4. Khách phải tự nhớ mình đang định làm gì, tìm lại icon giỏ hàng, bấm thanh toán lại

Đây là bước rơi ở đúng chỗ đắt nhất của phễu. Người dùng đã có ý định mua, đã đăng nhập, rồi bị bỏ giữa đường.

**Fix:**

```tsx
// ProtectedRoute.tsx
const location = useLocation()

if (!isAuthenticated) {
  return <Navigate to="/login" replace state={{ from: location }} />
}
```

```tsx
// LoginPage.tsx
const location = useLocation()
// Chỉ nhận đường dẫn nội bộ — chặn open-redirect
const rawFrom = (location.state as { from?: Location } | null)?.from
const from = rawFrom && typeof rawFrom.pathname === 'string' && rawFrom.pathname.startsWith('/')
  ? `${rawFrom.pathname}${rawFrom.search ?? ''}`
  : '/'

await login(username, password)
navigate(from, { replace: true })
```

**Chú ý bảo mật:** phải validate `from` là path nội bộ. Nếu đọc redirect từ query param (`?next=`) mà không validate, attacker gửi link `/login?next=https://evil.com` → sau khi đăng nhập người dùng bị đẩy sang site lừa đảo, và họ vừa mới nhập mật khẩu nên đang ở trạng thái tin tưởng. Đây là lỗ hổng open-redirect phổ biến. Dùng `location.state` (không nằm trong URL) an toàn hơn query param, và vẫn nên check `startsWith('/')`.

**`replace: true`** để back button không quay lại trang login.

Tương tự: nút "Đăng nhập" trong `MobileNav` và `Header` (khi chưa auth) cũng nên truyền `state={{ from: location }}`.

---

## 3. Lỗi UX toàn cục — không có `autoComplete` ở bất kỳ đâu

```bash
$ grep -rn "autoComplete" frontend/src --include=*.tsx | wc -l
0
```

Không một input nào trong toàn bộ app có `autoComplete`. Hệ quả:

| Ảnh hưởng | Chi tiết |
|---|---|
| Password manager không tự điền | 1Password / Bitwarden / iCloud Keychain / Chrome đều dựa vào `autoComplete` để nhận diện field. Không có → không lưu, không điền |
| Trình duyệt không tự điền địa chỉ/SĐT ở checkout | Người dùng phải gõ tay địa chỉ dài mỗi lần đặt hàng. Trên mobile đây là ma sát lớn nhất của cả luồng |
| Bàn phím mobile sai loại | Không `inputMode` + `autoComplete="tel"` → field SĐT hiện bàn phím chữ |
| A11y | WCAG 1.3.5 (Identify Input Purpose, AA) **yêu cầu** `autocomplete` cho các field thuộc danh sách chuẩn. Đây là fail rõ ràng, không phải chuyện tranh luận |

Đây có lẽ là fix **rẻ nhất so với giá trị** trong toàn bộ bộ spec: thêm 1 attribute mỗi field.

### 3.1 Bảng `autoComplete` cần dùng

| Field | `autoComplete` | Kèm thêm |
|---|---|---|
| Tên đăng nhập / email (login) | `username` | `inputMode="email"` nếu chỉ nhận email |
| Mật khẩu (login) | `current-password` | |
| Mật khẩu mới (register) | `new-password` | |
| Xác nhận mật khẩu | `new-password` | |
| Mật khẩu hiện tại (đổi mật khẩu) | `current-password` | |
| Họ tên | `name` | |
| Email | `email` | `inputMode="email"` |
| Số điện thoại | `tel` | `inputMode="tel"` |
| Địa chỉ giao hàng | `street-address` | |
| Tên người nhận (checkout) | `name` (hoặc `shipping name`) | |
| SĐT người nhận (checkout) | `shipping tel` | `inputMode="tel"` |
| Địa chỉ giao (checkout) | `shipping street-address` | |
| Mã giảm giá | `off` | `autoCapitalize="characters"` |
| Ô tìm kiếm | `off` | trong `<form role="search">` |

**Quan trọng:** `autoComplete="new-password"` trên field mật khẩu mới là thứ báo cho password manager **đề xuất tạo mật khẩu mạnh**. Dùng sai (`password` hoặc bỏ trống) thì manager điền mật khẩu cũ vào field mật khẩu mới.

**`autoComplete="off"` trên field mã giảm giá** — không thì browser gợi ý mã cũ đã hết hạn.

---

## 4. `LoginPage` viết lại

### 4.1 Vấn đề hiện tại

```tsx
// LoginPage.tsx:36
<div className="min-h-screen bg-background flex items-center justify-center py-16 px-6">
```

`min-h-screen` bên trong `MainLayout` — nhưng `MainLayout` đã render `<Header>` (64px) và `<Footer>`. Nghĩa là tổng chiều cao = header + 100vh + footer → **luôn có scrollbar** trên trang login dù nội dung ngắn. Phải là `min-h-[calc(100dvh-var(--header-height))]` hoặc đơn giản là `py-16` không cần min-h.

```tsx
// LoginPage.tsx:39-41
<h1 className="font-heading text-4xl font-semibold">Leaf Creme</h1>
<p>Chào mừng bạn trở lại</p>
```

`<h1>` là tên brand. Nhưng logo trong header **cũng** là brand. Trang login có 2 lần thương hiệu và **0 lần** nói trang này làm gì. `<h1>` nên là "Đăng nhập".

```tsx
// LoginPage.tsx:57-65 — input viết tay, không dùng primitive
className="... focus:outline-none focus:border-accent-brown ..."
```

`focus:outline-none` → thuộc 52 chỗ ở D3.

Ngoài ra: `{error && <ErrorMessage message={error} />}` — không có `role="alert"`/`aria-live`, nên screen reader **không đọc** lỗi đăng nhập. Người dùng mù bấm đăng nhập sai mật khẩu → không có phản hồi nào.

### 4.2 Bản mới

```tsx
export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const from = safeInternalPath((location.state as any)?.from) ?? '/'

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); setLoading(true)
    try {
      await login(form.username, form.password)
      navigate(from, { replace: true })
    } catch (err) {
      // Thông báo chung — KHÔNG nói "email không tồn tại" vs "sai mật khẩu"
      setError('Tên đăng nhập hoặc mật khẩu không đúng.')
    } finally { setLoading(false) }
  }

  return (
    <Container width="form" className="py-12 md:py-20">
      <div className="mb-8 text-center">
        <h1 className="text-h2">Đăng nhập</h1>
        <p className="mt-2 text-sm text-fg-muted">Chào mừng bạn trở lại Leaf Crème.</p>
      </div>

      <Card>
        <CardBody className="pt-5">
          {/* noValidate: dùng validation của mình để thông báo lỗi nhất quán,
              thay vì tooltip mặc định của browser (không style được, không a11y tốt) */}
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
            {error && (
              <Alert variant="danger" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FormField required>
              <Label>Tên đăng nhập hoặc email</Label>
              <Input
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                disabled={loading}
              />
            </FormField>

            <FormField required>
              <div className="flex items-baseline justify-between">
                <Label>Mật khẩu</Label>
                <Link to="/forgot-password" className="text-sm text-brand-fg hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
              <PasswordInput
                name="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                disabled={loading}
              />
            </FormField>

            <Button type="submit" size="lg" fullWidth loading={loading} loadingText="Đang đăng nhập">
              Đăng nhập
            </Button>
          </form>
        </CardBody>
      </Card>

      <p className="mt-6 text-center text-sm text-fg-muted">
        Chưa có tài khoản?{' '}
        <Link to="/register" state={{ from: location.state?.from }} className="font-medium text-brand-fg hover:underline">
          Đăng ký
        </Link>
      </p>
    </Container>
  )
}
```

### 4.3 Ba chi tiết cần giải thích

**Thông báo lỗi chung, không tiết lộ field nào sai.** Hiện tại code hiển thị `detail` từ backend. Nếu backend trả "Tên đăng nhập không tồn tại" thì đó là **user enumeration** — attacker dò được email nào đã đăng ký. Nên dùng thông báo chung ở frontend, và ghi backlog kiểm tra backend không trả detail phân biệt.

Trade-off: thông báo chung khó dùng hơn một chút cho người dùng thật (không biết gõ sai email hay sai mật khẩu). Với bakery bán bánh, mức rủi ro không cao, nhưng nguyên tắc này rẻ nên vẫn nên làm.

**`state={{ from }}` truyền tiếp sang trang Register.** Người dùng bị đẩy tới login, phát hiện chưa có tài khoản, sang register — intent phải theo được cả 2 chặng, không thì lại rơi về trang chủ.

**Link "Quên mật khẩu?" — hiện chưa có route.** Nếu backend chưa hỗ trợ reset password, **không** thêm link chết. Thay bằng dòng text "Quên mật khẩu? Liên hệ cửa hàng qua Zalo." Link tới trang 404 tệ hơn không có link. Ghi vào backlog: forgot-password là feature thiếu cơ bản của mọi app có auth.

### 4.4 `PasswordInput` — component mới

```tsx
// src/components/ui/password-input.tsx
export const PasswordInput = forwardRef<HTMLInputElement, ComponentProps<typeof Input>>(
  (props, ref) => {
    const [show, setShow] = useState(false)
    return (
      <div className="relative">
        <Input ref={ref} type={show ? 'text' : 'password'} className="pr-12" {...props} />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          // aria-pressed cho AT biết đây là toggle và trạng thái hiện tại
          aria-pressed={show}
          className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-fg-subtle hover:bg-bg-subtle outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          <span className="sr-only">{show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</span>
        </button>
      </div>
    )
  }
)
```

Toggle hiện mật khẩu giảm lỗi gõ đáng kể trên mobile — nơi gõ sai nhiều nhất và không thấy mình gõ gì.

---

## 5. `RegisterPage` (300 dòng)

### 5.1 Vấn đề

- Một `error` state cho cả form (dòng 29) → cùng vấn đề như `CheckoutPage` Bug 3
- Có `type="password"` ×2 (dòng 155, 173) nhưng **không** `autoComplete="new-password"`
- Không có kiểm tra khớp mật khẩu real-time — người dùng gõ xong 2 field rồi submit mới biết không khớp
- Không có strength meter → người dùng đặt mật khẩu yếu mà không biết
- `showOptionalFields` (dòng 31) — có progressive disclosure, tốt. Giữ.
- `minLength={6}` ở login (dòng 76) nhưng phải verify register có cùng ràng buộc; nếu register cho 6 ký tự thì 6 là quá thấp cho app có thông tin thanh toán

### 5.2 Thiết kế

```tsx
<FormField error={errors.mat_khau} required>
  <Label>Mật khẩu</Label>
  <PasswordInput autoComplete="new-password" value={pw} onChange={...} />
  <PasswordStrength value={pw} />
  <HelperText>Tối thiểu 8 ký tự, nên có cả chữ và số.</HelperText>
</FormField>

<FormField
  // Kiểm khớp NGAY khi người dùng đã rời field (onBlur), không đợi submit
  error={confirmTouched && confirm !== pw ? 'Mật khẩu nhập lại không khớp' : undefined}
  required
>
  <Label>Nhập lại mật khẩu</Label>
  <PasswordInput autoComplete="new-password" value={confirm}
                 onChange={...} onBlur={() => setConfirmTouched(true)} />
</FormField>
```

```tsx
// src/components/ui/password-strength.tsx
export function PasswordStrength({ value }: { value: string }) {
  const score = scorePassword(value)     // 0-4
  const labels = ['Rất yếu', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh']
  const colors = ['bg-danger-solid', 'bg-danger-solid', 'bg-warning', 'bg-success', 'bg-success']

  if (!value) return null
  return (
    <div className="mt-2">
      <div className="flex gap-1" aria-hidden>
        {[0,1,2,3].map((i) => (
          <div key={i} className={cn('h-1 flex-1 rounded-full',
            i < score ? colors[score] : 'bg-bg-inset')} />
        ))}
      </div>
      {/* Thanh màu là aria-hidden; text mới là thông tin thật cho AT */}
      <p aria-live="polite" className="mt-1.5 text-xs text-fg-subtle">
        Độ mạnh: {labels[score]}
      </p>
    </div>
  )
}
```

**Thanh màu `aria-hidden`, text `aria-live`.** Thanh 4 vạch màu là thông tin **chỉ bằng màu** → fail WCAG 1.4.1 nếu đứng một mình. Text "Độ mạnh: Trung bình" là kênh thứ hai và là thứ AT đọc.

**Không chặn submit vì mật khẩu yếu**, chỉ cảnh báo — trừ khi dưới độ dài tối thiểu. Chặn theo điểm strength gây frustration và người dùng sẽ đặt `Password1!` để lách, không mạnh hơn thật.

**Nâng `minLength` từ 6 lên 8.** 6 ký tự là quá ngắn cho app lưu địa chỉ và lịch sử đơn hàng. Cần đồng bộ với validation backend, không thì frontend chặn mà API vẫn nhận.

---

## 6. `UserProfilePage` (446 dòng) — 2 thẻ `<h1>`

### 6.1 Bug

Dòng 225 và dòng 428 — mỗi tab có một `<h1>`:

```tsx
{activeTab === 'profile' ? (
  ...
  <h1 className="...">Thông tin cá nhân</h1>     // dòng 225
) : (
  ...
  <h1 className="...">Đổi mật khẩu</h1>          // dòng 428
)}
```

Chỉ một cái render tại một thời điểm, nên về mặt DOM không có 2 h1 cùng lúc — nhưng vấn đề khác: **`<h1>` đổi khi bấm tab.** Với screen reader, `h1` là tiêu đề của **trang**; tab chỉ đổi một panel bên trong. Đúng cấu trúc phải là:

```
h1: Tài khoản của tôi          ← tiêu đề trang, không đổi
  tablist
    tab: Thông tin cá nhân
    tab: Đổi mật khẩu
  tabpanel
    h2: Thông tin cá nhân      ← tiêu đề panel
```

### 6.2 Tab tự viết → Radix Tabs

Dòng 177-205: tab implement bằng `<button onClick={() => setActiveTab(...)}>`. Thiếu:

- `role="tablist"` / `role="tab"` / `role="tabpanel"`
- `aria-selected`, `aria-controls`, `id` liên kết
- Điều hướng bằng phím mũi trái/phải (chuẩn ARIA cho tab)
- `tabIndex` management (chỉ tab đang chọn nằm trong tab order)

Screen reader đọc chúng như 2 nút rời rạc, không biết đây là tab và không biết cái nào đang chọn.

```tsx
<Container className="py-8 md:py-12">
  <h1 className="text-h1">Tài khoản của tôi</h1>

  <Tabs value={tab} onValueChange={setTab} className="mt-8">
    {/* Mobile: tab ngang cuộn được. Desktop: sidebar dọc */}
    <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
      <TabsList className="mb-6 flex gap-1 overflow-x-auto lg:mb-0 lg:flex-col lg:overflow-visible">
        <TabsTrigger value="profile">Thông tin cá nhân</TabsTrigger>
        <TabsTrigger value="password">Đổi mật khẩu</TabsTrigger>
        <TabsTrigger value="orders" asChild>
          {/* Đơn hàng là TRANG riêng, không phải tab — dùng Link */}
          <Link to="/orders">Đơn hàng của tôi</Link>
        </TabsTrigger>
      </TabsList>

      <div>
        <TabsContent value="profile">
          <h2 className="text-2xl">Thông tin cá nhân</h2>
          <ProfileForm />
        </TabsContent>
        <TabsContent value="password">
          <h2 className="text-2xl">Đổi mật khẩu</h2>
          <PasswordForm />
        </TabsContent>
      </div>
    </div>
  </Tabs>
</Container>
```

**Tab state nên vào URL** (`/profile?tab=password`) để share/reload/back hoạt động. Dùng `useSearchParams` như spec 04 §5.2.

### 6.3 `success` state — dùng toast, không dùng inline

Dòng 22: `const [success, setSuccess] = useState<string | null>(null)`. Thông báo "Đã cập nhật thành công" hiện inline rồi ở đó mãi (hoặc bị clear bởi logic nào đó).

Chuyển sang `toast({ title: 'Đã lưu thông tin', variant: 'success' })` — theo quy tắc ở spec 02 §8: toast cho việc đã xong không cần hành động. Bớt được 1 state và 1 nhánh render.

### 6.4 `AvatarUploadSection`

| Cần | Chi tiết |
|---|---|
| Validate ở client trước khi upload | Loại file (`image/jpeg,image/png,image/webp`), kích thước (≤ 5MB). Hiện tại nếu chỉ dựa backend thì người dùng mobile upload ảnh 8MB, đợi 30s rồi mới bị từ chối |
| Preview trước khi upload | `URL.createObjectURL` — có `avatarPreview` state rồi (dòng 33), verify đã dùng |
| `URL.revokeObjectURL` khi unmount | Không revoke → memory leak. Rất hay bị bỏ |
| Progress khi upload | Ảnh 5MB trên 3G mất ~20s. Không có progress → người dùng tưởng treo |
| Trạng thái lỗi rõ ràng | "Ảnh quá lớn (8.2MB). Tối đa 5MB." — nêu số cụ thể, không nói chung |
| Input file phải có label thật | `<input type="file">` styled thì thường bị `sr-only` — phải có `<label>` gắn đúng, không thì không operate được bằng bàn phím |
| Crop 1:1 | Avatar hiện `rounded-full object-cover` (Header.tsx:203) → ảnh không vuông bị crop tuỳ ý. Nếu không làm crop tool, ít nhất báo trước "Ảnh sẽ được cắt vuông" |

---

## 7. `MyOrdersPage` (208 dòng)

### 7.1 Thiếu

| Thiếu | Tác động |
|---|---|
| Filter theo trạng thái | Khách mua nhiều lần có 20+ đơn, muốn xem "đơn đang giao" phải scroll tìm |
| Phân trang / infinite scroll | Fetch tất cả đơn 1 lần → chậm dần theo thời gian |
| Sắp xếp | Không rõ đang sort theo gì |
| Empty state có đường ra | Khách chưa có đơn nào → phải có nút "Xem sản phẩm" |
| Trạng thái đơn giải thích được | `STATUS_LABELS` (dòng 123) map trạng thái → label + màu. Cần verify: có tooltip/mô tả nghĩa từng trạng thái không? "Đang xử lý" khác gì "Đã xác nhận"? |
| Nút hành động nhanh | "Đặt lại" (reorder) cho đơn đã hoàn tất — với bakery, khách mua lại cùng loại bánh là hành vi rất phổ biến. Đây là tính năng ROI cao và dễ làm |

### 7.2 Status badge — không chỉ dựa vào màu

Dòng 146:

```tsx
className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusInfo.color}`}
```

Badge chỉ có màu + label text. Label text đã là kênh thứ hai nên **không** fail WCAG 1.4.1. Nhưng cần verify màu trong `STATUS_LABELS` đạt contrast — nếu là màu Tailwind mặc định (`bg-yellow-100 text-yellow-800`) thì sau khi ghi đè `theme.colors` ở spec 01 sẽ **fail build**. Đây là một trong những chỗ phải sửa.

Map trạng thái sang variant của `Badge`:

```ts
// src/constants/orderStatus.ts
export const ORDER_STATUS: Record<string, {
  label: string
  variant: 'neutral' | 'info' | 'warning' | 'success' | 'danger'
  description: string        // ← MỚI: giải thích nghĩa, hiện trong Tooltip
}> = {
  cho_xac_nhan: { label: 'Chờ xác nhận', variant: 'warning',
                  description: 'Cửa hàng sẽ gọi xác nhận đơn trong giờ mở cửa.' },
  da_xac_nhan:  { label: 'Đã xác nhận',  variant: 'info',
                  description: 'Đơn đã được xác nhận và đang chờ làm bánh.' },
  dang_giao:    { label: 'Đang giao',    variant: 'info',
                  description: 'Đơn đang trên đường tới địa chỉ của bạn.' },
  hoan_tat:     { label: 'Hoàn tất',     variant: 'success',
                  description: 'Đơn đã giao thành công.' },
  da_huy:       { label: 'Đã huỷ',       variant: 'danger',
                  description: 'Đơn đã bị huỷ.' },
}
```

`description` giải quyết một vấn đề thật: khách không biết "Đã xác nhận" nghĩa là bánh đang làm hay chưa, nên gọi điện hỏi. Một dòng mô tả tiết kiệm cuộc gọi.

### 7.3 Layout

```
┌────────────────────────────────────────────┐
│ h1  Đơn hàng của tôi                       │
│ [Tất cả] [Chờ xác nhận] [Đang giao] [...]  │ ← Tabs/chip, state vào URL
│ ┌────────────────────────────────────────┐ │
│ │ #DH2026081101      [Đang giao]         │ │
│ │ 11/08/2026 · 3 sản phẩm · 430.000đ     │ │
│ │ [thumbnail ×3]                         │ │
│ │            [Xem chi tiết] [Đặt lại]    │ │
│ └────────────────────────────────────────┘ │
│                [Tải thêm]                  │
└────────────────────────────────────────────┘
```

Thumbnail sản phẩm trong card đơn hàng: khách nhận diện đơn bằng **hình bánh** nhanh hơn bằng mã đơn. Rẻ để làm, tác động rõ.

Card đơn hàng dùng **stretched link** (spec 02 §6.1) — cả card bấm được, nút "Đặt lại" nổi lên trên.

---

## 8. `OrderDetailPage` (301 dòng)

| Cần | Chi tiết |
|---|---|
| Timeline trạng thái | Dạng dọc: Đã đặt → Đã xác nhận → Đang giao → Hoàn tất, có timestamp mỗi mốc. Đây là câu hỏi số 1 của khách sau khi đặt |
| Thông tin giao hàng đầy đủ | Tên, SĐT, địa chỉ, khung giờ giao (kèm "giờ Việt Nam") |
| Trạng thái thanh toán tách riêng khỏi trạng thái đơn | Đơn "Đang giao" + thanh toán "Chưa trả" là trạng thái hợp lệ. Gộp 2 thứ này vào 1 badge là sai |
| Nút "Thanh toán lại" nếu chưa trả | Nối với luồng ở spec 05 §2 (payment fail nhưng đơn đã tạo) |
| Nút "Huỷ đơn" nếu còn được huỷ | Dùng `AlertDialog` — đây là hành động **không đảo ngược được**, khác với xoá item giỏ hàng (spec 05 §7.1). Confirm ở đây là đúng |
| Chi tiết từng dòng | Tên, biến thể, số lượng, đơn giá, tổng dòng — dùng `tabular-nums` để cột số thẳng hàng |
| Với gift box: hiện thành phần | Nối với spec 04 §8 |
| Liên hệ cửa hàng | Nút Zalo/gọi điện — khách có thắc mắc về đơn thì đây là hành động họ muốn làm |
| In / lưu PDF | `@media print` stylesheet đơn giản. Một số khách cần hoá đơn |

**Bảng chi tiết đơn trên mobile:** đừng dùng `<table>` với scroll ngang. Chuyển sang stacked card mỗi dòng (`<dl>` với `<dt>`/`<dd>`) dưới `md`. Bảng scroll ngang trên mobile là một trong những pattern tệ nhất và rất phổ biến.

---

## 9. Files phải sửa

### Tạo mới
| File | Nội dung |
|---|---|
| `src/components/ui/password-input.tsx` | §4.4 |
| `src/components/ui/password-strength.tsx` | §5.2 |
| `src/components/ui/status-timeline.tsx` | §8 |
| `src/constants/orderStatus.ts` | §7.2 — có `description` |
| `src/utils/safeInternalPath.ts` | §2 — validate redirect |
| `src/utils/passwordScore.ts` | §5.2 |
| `src/hooks/useOrders.ts` | fetch + filter + pagination |
| `src/components/account/{order-card,order-timeline,order-items-list}.tsx` | |

### Sửa
| File | Việc |
|---|---|
| `src/components/routing/ProtectedRoute.tsx` | **§2 — fix bug intent.** Bỏ `min-h-screen` ở loading state |
| `src/pages/LoginPage.tsx` | §4 — viết lại; `autoComplete`; `h1` = "Đăng nhập"; redirect `from`; error `role="alert"` |
| `src/pages/RegisterPage.tsx` | §5 — field-level error, `autoComplete="new-password"`, strength meter, khớp mật khẩu real-time, `minLength` 8 |
| `src/pages/UserProfilePage.tsx` | §6 — 1 `h1`, Radix Tabs, tab vào URL, success → toast. Từ 446 → ~140 dòng |
| `src/pages/MyOrdersPage.tsx` | §7 — filter, pagination, thumbnail, reorder, empty state |
| `src/pages/OrderDetailPage.tsx` | §8 — timeline, tách trạng thái thanh toán, mobile stacked |
| `src/components/bakery/ProfileForm.tsx` | `FormField` + `autoComplete` |
| `src/components/bakery/PasswordForm.tsx` | `PasswordInput` + `autoComplete` đúng |
| `src/components/bakery/ProfileSidebar.tsx` | Gộp vào `TabsList`, có thể xoá |
| `src/components/bakery/AvatarUploadSection.tsx` | §6.4 |
| **Mọi form trong app** | Thêm `autoComplete` theo bảng §3.1 |

### Backlog (không phải UI)
| Việc | Ưu tiên |
|---|---|
| Forgot password / reset password — hiện **không có** | P1 |
| Kiểm backend không trả lỗi login phân biệt (user enumeration) | P2 |
| Đồng bộ `minLength` mật khẩu FE/BE lên 8 | P2 |
| `POST /orders/{id}/reorder` cho tính năng đặt lại | P2 |

---

## 10. Acceptance criteria

### Bug intent (§2)
- [ ] Chưa login → vào `/checkout` → bị đẩy sang `/login` → đăng nhập → **hạ cánh ở `/checkout`**, không phải `/`
- [ ] Cùng luồng nhưng bấm "Đăng ký" ở trang login → đăng ký xong → vẫn về `/checkout`
- [ ] Sau khi login, back button **không** quay lại trang login
- [ ] `location.state.from` bị chèn giá trị ngoài (`https://evil.com`) → bị bỏ qua, redirect về `/`
- [ ] Vào `/orders` khi chưa login → login → về `/orders` với query string giữ nguyên nếu có

### autoComplete (§3)
- [ ] `grep -rn "autoComplete" src --include=*.tsx | wc -l` → **≥ 15**
- [ ] Chrome/Safari: lưu mật khẩu ở login → lần sau tự điền cả username + password
- [ ] Register: field mật khẩu mới → password manager **đề xuất tạo mật khẩu mạnh** (chứng minh `new-password` đúng)
- [ ] Checkout: đã từng nhập địa chỉ → browser tự gợi ý địa chỉ đã lưu
- [ ] iOS Safari: field SĐT mở **bàn phím số**, không phải bàn phím chữ
- [ ] axe DevTools trên trang Login, Register, Checkout → **0** violation "Identify Input Purpose"

### Forms
- [ ] Register: để trống mọi field → submit 1 lần hiện **tất cả** lỗi cạnh từng field
- [ ] Register: nhập 2 mật khẩu khác nhau, rời field xác nhận → lỗi hiện **ngay**, không cần submit
- [ ] Password strength: nhập `abc` → "Rất yếu"; nhập `Banh$Kem2026` → "Mạnh"; screen reader đọc được text độ mạnh
- [ ] Toggle hiện mật khẩu: bấm được bằng bàn phím, `aria-pressed` đổi đúng, screen reader đọc "Hiện mật khẩu"/"Ẩn mật khẩu"
- [ ] Đăng nhập sai mật khẩu → screen reader **đọc** thông báo lỗi (hiện tại không đọc)
- [ ] Thông báo lỗi login là chung, không tiết lộ username có tồn tại hay không

### Profile
- [ ] Trang `/profile` có **đúng 1** `<h1>`, nội dung "Tài khoản của tôi", **không đổi** khi switch tab
- [ ] Heading outline (headingsMap extension): h1 → h2, không nhảy level
- [ ] Tab: điều hướng bằng phím **mũi trái/phải** hoạt động
- [ ] Screen reader đọc tab: "Thông tin cá nhân, tab, 1 of 2, được chọn"
- [ ] `/profile?tab=password` mở trực tiếp đúng tab; đổi tab → URL đổi; back button hoạt động
- [ ] Lưu profile thành công → hiện **toast**, không phải banner inline nằm mãi
- [ ] Upload ảnh 8MB → bị chặn ở client với thông báo nêu rõ kích thước, **không** gửi request
- [ ] Upload ảnh sai định dạng (.pdf) → bị chặn ở client
- [ ] Đổi ảnh nhiều lần rồi rời trang → không memory leak (kiểm `URL.revokeObjectURL` trong cleanup)

### Orders
- [ ] `/orders` có filter trạng thái, state vào URL, share link được
- [ ] Chưa có đơn nào → empty state có nút "Xem sản phẩm"
- [ ] Card đơn hàng: **1** tab stop cho cả card + 1 cho nút "Đặt lại"
- [ ] Ctrl+click card đơn hàng → mở tab mới
- [ ] Status badge có tooltip/mô tả nghĩa
- [ ] `OrderDetail`: trạng thái đơn và trạng thái thanh toán là **2 badge riêng**
- [ ] `OrderDetail` trên 375px: bảng chi tiết là stacked card, **không** scroll ngang
- [ ] Số tiền trong bảng thẳng cột (`tabular-nums`)
- [ ] Huỷ đơn dùng `AlertDialog` có confirm; xoá item giỏ hàng dùng undo — hai hành động khác nhau, xử lý khác nhau
- [ ] Build pass sau khi ghi đè `theme.colors`: `STATUS_LABELS` không còn dùng màu Tailwind mặc định

---

## TL;DR

- **Bug conversion:** `ProtectedRoute` không lưu trang đích, `LoginPage` luôn `navigate('/')`. Khách bấm "Thanh toán" → bị đẩy login → đăng nhập xong hạ cánh ở **trang chủ**, phải tự tìm lại giỏ hàng. Rơi ở đúng chỗ đắt nhất của phễu.
- **`autoComplete` = 0 chỗ trong toàn bộ app.** Password manager không điền được gì, browser không gợi ý địa chỉ ở checkout, bàn phím mobile sai loại, và fail WCAG 1.3.5. Fix rẻ nhất so với giá trị trong cả bộ spec: 1 attribute mỗi field.
- Lỗi đăng nhập không có `role="alert"` → người dùng screen reader gõ sai mật khẩu và **không nhận được phản hồi nào**.
- `UserProfilePage`: `<h1>` **đổi theo tab** — sai cấu trúc tài liệu. Tab tự viết không có `role="tablist"`, không arrow-key nav, screen reader đọc như 2 nút rời.
- `LoginPage` dùng `min-h-screen` bên trong `MainLayout` đã có header+footer → **luôn có scrollbar** dù nội dung ngắn. `<h1>` là tên brand, trùng logo header, và không nói trang này làm gì.
- Thiếu hẳn **forgot password**. Không thêm link chết tới route chưa tồn tại — thay bằng hướng dẫn liên hệ, và ghi backlog P1.
- Xoá item giỏ hàng dùng **undo**; huỷ đơn dùng **confirm dialog**. Ma sát phải tỉ lệ với mức độ không đảo ngược được.
