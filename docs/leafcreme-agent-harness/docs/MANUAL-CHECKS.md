# Manual checks — người phải tự làm

> Gate tự động (`npm run gate:phaseN`) chỉ bắt được khoảng **60%** vấn đề. Phần dưới đây là 40% còn lại: cần mắt người, tay người, hoặc thiết bị thật.
>
> **Agent không được sửa file này.** Agent không được tick các ô này.
>
> Chỉ chạy sau khi gate của phase đó đã PASS. Gate đỏ thì chưa đáng để bỏ thời gian test tay.

---

## Cách test nhanh nhất — làm 5 test này, theo thứ tự

Sắp theo giá trị-trên-thời-gian. Nếu chỉ có 15 phút, làm test 1.

| # | Test | Thời gian | Bắt được gì |
|---|---|---|---|
| 1 | **Rút chuột ra** — làm luồng mua hàng chỉ bằng bàn phím | 10 phút | Gần hết vấn đề focus, tab order, keyboard trap. Không cần biết a11y vẫn làm được |
| 2 | **Điện thoại thật** — mở app trên máy mình | 10 phút | `100vh` vs `dvh`, safe-area, target size thật với ngón tay, độ trễ touch. Simulator **không** bắt được |
| 3 | **Slow 3G + CPU 4×** (DevTools) — bấm qua các trang | 10 phút | 5 state (loading/empty/error/partial/success), màn hình trắng, nhấp nháy khi refetch |
| 4 | **Zoom 200%** (Ctrl + `+` ×4) | 5 phút | Mất nội dung, overflow ngang, chữ tràn nút |
| 5 | **Screen reader** — NVDA (Win, free) hoặc VoiceOver (Cmd+F5) | 20 phút | Lỗi form có được đọc, biết mình ở đâu, biết đã đặt hàng thành công chưa |

Test 5 tốn thời gian nhất nhưng là loại duy nhất phát hiện được "nút icon đọc ra thành 'button' trơ" hay "lỗi đăng nhập không ai đọc".

---

## §0 — Chuẩn bị

- [ ] Đã ghi `docs/ui-baseline.md` với số **thật**, không phải chỗ trống
- [ ] Bundle size: chạy `npx vite-bundle-visualizer` trong `frontend/`, ghi số gzip
- [ ] Lighthouse (Chrome DevTools → Lighthouse → Mobile) trên 4 trang: `/`, `/search`, `/cart`, `/login` — ghi cả 4 điểm (Perf / A11y / Best Practices / SEO)
- [ ] Ghi lại: `git rev-parse HEAD` để biết baseline ở commit nào

**Vì sao quan trọng:** không có baseline thì không chứng minh được redesign cải thiện gì. Đây cũng là bảng số dùng được khi phỏng vấn.

---

## §1 — Design tokens

- [ ] **Focus ring:** Tab qua trang chủ từ đầu đến cuối. **Mọi** element focus được đều có viền terracotta 2px nhìn thấy rõ. Không có element nào "im lặng"
- [ ] **Dấu tiếng Việt:** mở trang có nhiều chữ (Policy / Contact). Kiểm `ằ ẳ ẵ ặ ộ ợ ự ỹ ễ` — không bị cắt trên/dưới, không fallback sang font khác (DevTools → Computed → font-family thực tế)
- [ ] **Font load:** DevTools → Network → filter Font. Đúng 2 file `.woff2`. **Không** có request tới `fonts.googleapis.com`
- [ ] **Reduced motion:** bật ở OS (Win: Settings → Accessibility → Visual effects → tắt Animation; macOS: Accessibility → Display → Reduce motion). Reload → **0** animation chạy
- [ ] **iOS Safari scroll:** mở trang chủ trên iPhone, scroll nhanh lên xuống. Không jank, không nhòe (đã bỏ `background-attachment: fixed`)
- [ ] **Nhìn bằng mắt:** app lúc này sẽ **trông xấu** — token mới, component chưa cập nhật. Xác nhận là "xấu vì chưa xong" chứ không phải "xấu vì token sai". Nếu màu trông sai hẳn (ví dụ nền xanh) thì token map sai

---

## §2 — Primitives

- [ ] **Dialog focus trap:** mở 1 dialog → Tab liên tục → focus đi hết vòng rồi **quay lại element đầu**, không thoát ra sau modal
- [ ] **Shift+Tab từ element đầu** của dialog → về element **cuối**, không ra ngoài
- [ ] **Escape** đóng dialog → focus **quay về đúng nút đã mở nó** (không nhảy về đầu trang)
- [ ] **Select text trong dialog:** mousedown bên trong, kéo chuột ra ngoài rồi nhả → dialog **không** đóng (bug cũ của `Modal.tsx`)
- [ ] **Click label** → input tương ứng được focus
- [ ] **Screen reader + input lỗi:** Tab vào field có lỗi → đọc label, rồi đọc nội dung lỗi
- [ ] **Toast không đánh cắp focus:** đang gõ vào 1 field, trigger 1 toast → con trỏ **vẫn ở field đó**
- [ ] **Drawer trên iPhone thật:** mở CartDrawer, scroll xuống cuối → nút "Thanh toán" **bấm được**, không bị thanh địa chỉ / home indicator che
- [ ] **Overscroll:** scroll hết nội dung trong drawer → trang phía sau **không** bị kéo theo
- [ ] **Error boundary:** tạm thêm `throw new Error('test')` vào 1 component → chỉ khu vực đó hiện fallback, **không trắng cả app**. Xoá sau khi test
- [ ] **Screenshot diff:** so trang chủ / search / cart trước-sau phase 2. Chỉ Button/Input/Card/Badge đổi. **Không page nào vỡ layout**
- [ ] **Reduced motion + dialog:** bật reduced motion → dialog xuất hiện không animation, và **không kẹt** ở trạng thái nửa vời

---

## §3 — Layout + Nav (quan trọng nhất)

Đây là phase fix bug P0. Test kỹ.

### Mobile nav
- [ ] Resize xuống **375px** → hamburger hiện
- [ ] Bấm hamburger → drawer trượt từ **bên trái**
- [ ] Trong drawer, tới được **cả 5** trang: Trang chủ, Sản phẩm, Hộp quà, Liên hệ, Chính sách
- [ ] Accordion "Sản phẩm" mở ra danh mục con → bấm vào tới đúng `/categories/:slug`
- [ ] Bấm bất kỳ link trong drawer → **drawer tự đóng**
- [ ] Escape đóng drawer → focus quay về nút hamburger
- [ ] Chạm ra ngoài drawer → đóng
- [ ] **Đo target size:** DevTools → hover từng nav item → box model. Mọi item **≥ 44px** chiều cao

### Breakpoint
- [ ] Ở **đúng 1024px**, zoom 100%: nav desktop hiện, hamburger ẩn. **Không** cả hai cùng lúc, **không** cả hai cùng ẩn
- [ ] Ở 1024px: logo + 4 nav item + 4 icon **không wrap**, **không overflow ngang**
- [ ] Nếu chật → đổi ngưỡng nav sang `xl` và giữ drawer tới 1280px (spec 03 §8)
- [ ] Ở **320px** (thiết bị nhỏ nhất còn phổ biến): không scroll ngang

### Skip link
- [ ] Bấm Tab **lần đầu** trên bất kỳ trang → element focus đầu tiên là **skip link**, và nó **nhìn thấy được**
- [ ] Enter trên skip link → focus nhảy tới nội dung
- [ ] Tab tiếp theo → vào nội dung, **không** quay lại header

### Navigation
- [ ] Ctrl+click (Cmd+click) mọi nav item và footer link → **mở tab mới thật**
- [ ] Middle-click → mở tab mới
- [ ] Chuột phải → có "Open in new tab" (chứng minh là `<a>` thật)
- [ ] Đi từ giữa trang search sang trang chi tiết → **scroll về top**, không hạ cánh giữa trang
- [ ] Bấm "Menu" ở footer → không còn (link chết đã bỏ)
- [ ] Footer hiện **năm hiện tại**

### Popover "Sản phẩm"
- [ ] Mở được bằng **Enter**
- [ ] Mở được bằng **Space**
- [ ] Escape đóng
- [ ] DevTools → Network: hover vào "Sản phẩm" **không** còn request `limit=1000`

### Ngữ nghĩa
- [ ] DevTools → disable CSS toàn bộ → thứ tự đọc vẫn logic: skip link → header → main → footer
- [ ] Extension `headingsMap` (hoặc `Accessibility Insights`): heading outline không nhảy level
- [ ] Screen reader → lệnh liệt kê landmark: có `banner`, `navigation` (có tên riêng), `main`, `contentinfo`, `search`

---

## §5 — Cart + Checkout (luồng tiền, test kỹ nhất)

### Bug 1 — thứ tự clearCart / toast / payment
- [ ] DevTools → Network → Block request URL của `createMomoQRPayment` (hoặc tạm sửa URL cho fail)
- [ ] Đặt hàng với MoMo QR → **KHÔNG** thấy toast xanh "thành công" rồi lỗi đỏ
- [ ] Được điều hướng tới trang đơn hàng với thông báo rõ "đơn đã tạo, chưa thanh toán được"
- [ ] Kiểm DB: **1** đơn, không phải 2
- [ ] Back button sau khi đặt xong → **không** quay lại form checkout với giỏ trống

### Bug 2 — idempotency
- [ ] DevTools → Network → throttle **Slow 3G**
- [ ] Bấm "Đặt hàng" rồi double-tap nhanh → kiểm DB: **1** đơn
- [ ] Bấm "Đặt hàng", chờ 2 giây, reload trang, đặt lại → kiểm DB: **1** đơn (cùng idempotency key)

### Bug 3 — validation
- [ ] Để trống **cả 4** field bắt buộc → bấm submit **1 lần** → hiện **cả 4** lỗi, mỗi lỗi **cạnh field** của nó
- [ ] Submit khi có lỗi → trang **tự scroll tới** field lỗi đầu tiên và focus vào đó
- [ ] Trên điện thoại thật: submit ở cuối trang → thấy rõ phản hồi, không "im lặng"
- [ ] Nhập SĐT `abc` → bị chặn, thông báo **có ví dụ** `0901234567`
- [ ] Nhập `0901234567` → qua
- [ ] Nhập `090 123 4567` (có dấu cách) → qua
- [ ] Screen reader vào field lỗi → đọc label rồi đọc lỗi

### Timezone
- [ ] Đổi timezone máy sang `America/New_York` (Win: Settings → Time & language; macOS: Date & Time)
- [ ] Reload, chọn khung giờ **14:00–16:00**
- [ ] DevTools → Network → xem payload `POST /orders`: `ngay_giao_du_kien` phải là **14:00 giờ VN** (`+07:00`), không lệch
- [ ] UI hiện chữ "(giờ Việt Nam)" cạnh khung giờ
- [ ] Đổi timezone về lại

### Khung giờ giao
- [ ] Đặt lúc **19:30** (đổi giờ máy nếu cần) → khung giờ hôm nay **không còn cái nào** khả dụng, có gợi ý chọn ngày khác
- [ ] Đặt lúc **07:00** → khung 08:00–10:00 disabled (chưa đủ 2h), khung 10:00–12:00 khả dụng
- [ ] Khung giờ đã qua → gạch ngang + không bấm được + screen reader đọc "(không còn khả dụng)"

### Cart
- [ ] Thêm sản phẩm vào giỏ → xoá hết tồn kho trong DB → refresh trang giỏ → hiện cảnh báo "đã hết hàng"
- [ ] Giảm tồn kho xuống nhỏ hơn số trong giỏ → hiện "Chỉ còn N" + nút cập nhật; bấm thì số lượng đổi đúng
- [ ] Có item không khả dụng → nút "Thanh toán" disabled + **ghi rõ lý do** trên nút
- [ ] Xoá 1 item → hiện toast có nút "Hoàn tác"; bấm hoàn tác → item quay lại đúng số lượng
- [ ] DevTools → Network: kiểm tra tồn kho cả giỏ = **1** request, không phải N

### Cart migration
- [ ] Trước khi deploy: lưu giỏ hàng ở version cũ (localStorage), rồi cập nhật code → mở app → giỏ **không mất item**, **không crash**
- [ ] Tự tay làm hỏng localStorage (`localStorage.setItem('cart','{{{')`) → app không crash, giỏ trống

### Payment QR
- [ ] Chuyển sang tab khác → DevTools Network: polling **dừng**
- [ ] Quay lại tab → poll **ngay lập tức** 1 lần
- [ ] Sau 1 phút → khoảng poll giãn từ 3s sang 10s
- [ ] Đợi QR hết hạn → QR bị che, nút "Tạo mã mới" hiện
- [ ] Screen reader: countdown **không** đọc từng giây (chỉ ở mốc 5 phút / 1 phút / hết hạn)
- [ ] Phương án nhập tay: SĐT + số tiền + nội dung CK, mỗi cái có nút copy **hoạt động thật** (paste ra notepad kiểm)
- [ ] Rời trang giữa lúc đang poll → React DevTools: không warning "setState on unmounted", không timer sót

### Mobile
- [ ] Summary là accordion **đóng sẵn**, chỉ hiện tổng tiền
- [ ] Sticky submit bar đáy hiện tổng tiền + nút
- [ ] iPhone có home indicator: bar **không bị che**
- [ ] Mọi radio khung giờ / payment ≥ 44px

---

## §4 — Catalog

### Bug B1 — FEFO bán lô hết hạn (nghiêm trọng nhất)
- [ ] Tạo lô test: `ngay_het_han` = **hôm qua**, `so_luong_hien_tai` = 5
- [ ] Đặt hàng biến thể đó → kiểm allocation: **KHÔNG** lấy lô hết hạn
- [ ] Tạo lô `ngay_het_han` = **hôm nay** → **CÓ** được phân bổ (hôm nay vẫn dùng được)
- [ ] Chỉ có lô hết hạn → đặt hàng bị từ chối với thông báo rõ, không âm thầm bán

### Inventory lên UI
- [ ] Sản phẩm hết hàng → card mờ + badge "Tạm hết hàng" + nút "Thêm" **disabled**
- [ ] Sản phẩm còn ≤ 3 → badge "Còn N", N **khớp DB**
- [ ] Lô hết hạn hôm nay → badge "Dùng trong hôm nay"
- [ ] `QuantityStepper`: nhập tay số lớn hơn tồn kho → tự kẹp về max
- [ ] Biến thể hết hàng: disabled + gạch ngang + screen reader đọc "(hết hàng)"
- [ ] Kiểm số "Còn N" trên UI so với `SELECT SUM(so_luong_hien_tai)` trong DB — phải khớp

### Filter
- [ ] Chọn filter → URL đổi
- [ ] Copy URL → mở tab mới → filter giữ nguyên
- [ ] Gõ 10 ký tự vào search → bấm Back **1 lần** → ra khỏi trang (không phải bấm 10 lần)
- [ ] Reload → filter giữ
- [ ] Đổi filter → về trang 1
- [ ] Chip filter hiện đúng số filter đang bật; "Xoá tất cả" hoạt động
- [ ] Mobile: nút "Lọc" có badge số; drawer footer ghi "Xem N kết quả" với **N đúng**

### Performance (đây là phần gate không kiểm được)
- [ ] Lighthouse Mobile trên `/`: **LCP < 2.5s**, **CLS < 0.1**
- [ ] **Quay video** scroll trang có grid 12 sản phẩm khi ảnh đang load → grid **không nhảy**
- [ ] Network: 4 ảnh đầu tải ngay, 8 ảnh còn lại lazy (scroll xuống mới tải)
- [ ] Trang danh sách: **1** request availability, không N
- [ ] Ảnh hero có `<link rel="preload">` và là LCP element

### Nội dung
- [ ] Section "Bán chạy nhất" — dữ liệu có thật là bán chạy? So với `SELECT SUM(so_luong) GROUP BY sanpham_id`. Nếu không thì phải đã đổi tên section
- [ ] Trang category: `h1` là tên danh mục, không phải logo
- [ ] Tab qua grid 12 sản phẩm: đếm đúng **24** stop (12 link + 12 nút), không 36+
- [ ] Ctrl+click card sản phẩm → mở tab mới
- [ ] Screen reader: grid đọc "danh sách, 12 mục"
- [ ] Đổi filter → nghe "Tìm thấy N sản phẩm"
- [ ] iPhone: sticky add-to-cart bar không bị home indicator che

---

## §6 — Account + Orders

### Bug 5 — mất intent
- [ ] Chưa login → thêm hàng vào giỏ → bấm "Thanh toán" → bị đẩy sang `/login`
- [ ] Đăng nhập → **hạ cánh ở `/checkout`**, không phải trang chủ
- [ ] Giỏ hàng **vẫn còn nguyên**
- [ ] Cùng luồng nhưng bấm "Đăng ký" ở trang login → đăng ký xong → vẫn về `/checkout`
- [ ] Sau login, Back button **không** quay lại trang login
- [ ] Vào `/orders?status=dang_giao` khi chưa login → login → về đúng URL **có query string**

### autoComplete
- [ ] Chrome: đăng nhập → lưu mật khẩu khi được hỏi → logout → vào lại → **tự điền cả username + password**
- [ ] Register: focus field mật khẩu → password manager **đề xuất tạo mật khẩu mạnh** (chứng minh `new-password` đúng)
- [ ] Checkout: đã từng nhập địa chỉ → focus field địa chỉ → browser gợi ý địa chỉ đã lưu
- [ ] **iPhone thật:** focus field SĐT → mở **bàn phím số**, không phải bàn phím chữ
- [ ] Field mã giảm giá → browser **không** gợi ý mã cũ

### Form
- [ ] Register: để trống mọi field → submit 1 lần → **tất cả** lỗi hiện cạnh từng field
- [ ] Register: nhập 2 mật khẩu khác nhau, rời field xác nhận → lỗi hiện **ngay**, không cần submit
- [ ] Strength meter: `abc` → "Rất yếu"; `Banh$Kem2026` → "Mạnh"
- [ ] Screen reader đọc được **text** độ mạnh (không chỉ thấy thanh màu)
- [ ] Toggle hiện mật khẩu: bấm được bằng bàn phím; screen reader đọc "Hiện mật khẩu" / "Ẩn mật khẩu"
- [ ] **Đăng nhập sai mật khẩu → screen reader ĐỌC thông báo lỗi** (bug cũ: không đọc gì)
- [ ] Thông báo lỗi login là chung, không tiết lộ username có tồn tại hay không
- [ ] Trang login: nội dung ngắn nhưng **không có scrollbar** dư

### Profile
- [ ] `/profile` có **đúng 1** `<h1>`, nội dung "Tài khoản của tôi", **không đổi** khi switch tab
- [ ] Tab: **mũi trái / mũi phải** điều hướng được
- [ ] Screen reader đọc: "Thông tin cá nhân, tab, 1 of 2, được chọn"
- [ ] `/profile?tab=password` mở trực tiếp đúng tab
- [ ] Đổi tab → URL đổi → Back button hoạt động
- [ ] Lưu profile → hiện **toast**, không phải banner nằm mãi
- [ ] Upload ảnh **8MB** → chặn ở client, thông báo **nêu rõ kích thước**, DevTools Network xác nhận **không gửi request**
- [ ] Upload file `.pdf` → chặn ở client
- [ ] Đổi ảnh 5 lần rồi rời trang → DevTools Memory: không leak (kiểm `URL.revokeObjectURL`)

### Orders
- [ ] `/orders` có filter trạng thái, state vào URL, share link được
- [ ] Chưa có đơn → empty state có nút "Xem sản phẩm"
- [ ] Card đơn hàng: Tab đếm **1** stop cho card + 1 cho nút "Đặt lại"
- [ ] Ctrl+click card → mở tab mới
- [ ] Status badge có tooltip/mô tả nghĩa
- [ ] `OrderDetail`: trạng thái đơn và trạng thái thanh toán là **2 badge riêng**
- [ ] `OrderDetail` ở **375px**: bảng chi tiết là stacked card, **không scroll ngang**
- [ ] Số tiền trong bảng **thẳng cột** (tabular-nums)
- [ ] Huỷ đơn → có confirm dialog (khác với xoá item giỏ hàng dùng undo)

### Chốt cuối storefront
- [ ] Làm **toàn bộ** luồng mua hàng chỉ bằng bàn phím, từ trang chủ tới đặt hàng thành công, không kẹt ở đâu
- [ ] Làm **toàn bộ** luồng đó với màn hình tắt + screen reader
- [ ] Zoom 200% trên **mọi** trang: không mất nội dung, không scroll ngang
- [ ] Lighthouse A11y **≥ 95** trên `/`, `/search`, `/cart`, `/checkout`, `/login`
- [ ] Điền bảng so sánh trước/sau vào `docs/ui-baseline.md`

---

## §7a — Admin: chức năng

Người dùng thật ở đây là chủ bakery + nhân viên, dùng 8 tiếng/ngày. Test theo cách họ dùng, không theo cách demo.

### Bảng với dữ liệu thật — test quan trọng nhất
- [ ] **Seed 1.000 lô hàng** vào DB (script hoặc SQL). `AdminInventoryPage` mở trong **< 2s**, scroll mượt
- [ ] Network: **không** còn request nào có `limit=1000` hay `limit=100`
- [ ] Trang danh sách gọi đúng **1** request, không N
- [ ] Sort cột "Hết hạn" → Network cho thấy `sort_by=ngay_het_han` gửi lên **server**
- [ ] Pagination hiện "1–50 của 1.000" với dấu phân cách `1.000`
- [ ] Nhảy tới trang 12 → đúng dòng 551-600
- [ ] Đổi pageSize 50 → 200 → về trang 1, tải đúng, vẫn mượt

### Bug tie-breaker — mắt không thấy, phải test bằng số
- [ ] Seed **100 lô cùng một `ngay_het_han`**
- [ ] Đi qua 4 trang × 25, ghi lại toàn bộ `lohang_id`
- [ ] Đếm: phải đúng **100 id duy nhất**. Nếu có id trùng hoặc thiếu → thiếu tie-breaker trong `ORDER BY`
- [ ] Lặp lại 3 lần → kết quả **giống nhau** cả 3 lần

Đây là bug âm thầm nhất trong cả phase: nhân viên chỉ thấy "sao dòng này biến mất".

### Sort đúng nghiệp vụ
- [ ] `AdminInventoryPage` mở lên → sort mặc định là **ngày hết hạn tăng dần** (lô sắp hết hạn ở trên)
- [ ] `AdminStockLedgerPage` → mới nhất trước
- [ ] `AdminPreOrderPage` → ngày giao sớm nhất trước
- [ ] Sort ở trang 1 rồi sang trang 3 → thứ tự **liên tục**, không reset

### Bulk & selection
- [ ] Chọn 5 dòng → thanh bulk hiện "Đã chọn 5 dòng"
- [ ] Chọn 5 dòng → **đổi filter** → selection **về 0** (không giữ dòng đã ẩn)
- [ ] "Chọn tất cả" chỉ chọn dòng **trong trang hiện tại**
- [ ] Bảng lô hàng: **không có** nút xoá hàng loạt
- [ ] `AdminStockLedgerPage`: **không có** nút sửa/xoá ở đâu cả

### URL state
- [ ] Đổi page/sort/filter → URL đổi
- [ ] Copy URL → gửi cho đồng nghiệp → họ mở ra thấy **đúng** page + sort + filter
- [ ] Trạng thái mặc định → URL **sạch** (`/admin/inventory`, không đuôi param)
- [ ] Gõ 10 ký tự vào ô search → bấm Back **1 lần** ra khỏi trang
- [ ] Reload → giữ nguyên trạng thái
- [ ] Trang có 2 bảng → sort bảng A **không** ảnh hưởng bảng B

### Form nhập lô — quan trọng nhất về nghiệp vụ
- [ ] `ngay_het_han` **trước** `ngay_san_xuat` → bị chặn
- [ ] `ngay_het_han` = **hôm qua** → bị chặn, nói rõ "lô đã hết hạn, không thể bán"
- [ ] `ngay_het_han` = **hôm nay** → **được phép** (hết hạn cuối ngày)
- [ ] `ngay_san_xuat` = ngày mai → bị chặn
- [ ] `so_luong` = 0 / âm / 1.5 → bị chặn
- [ ] Nhập `so_luong` gấp > 10 lần mức thường → **cảnh báo mềm**, tick xác nhận thì submit được
- [ ] Hạn dùng dài bất thường → cảnh báo mềm, **không chặn cứng**
- [ ] Chưa tick xác nhận → nút "Tạo lô hàng" **disabled**
- [ ] **Backend cũng chặn:** gọi `POST /batches/products` bằng curl với `ngay_het_han < ngay_san_xuat` → **422**

### Unsaved guard
- [ ] Nhập nửa form nhập lô → **bấm link ở sidebar** → hiện dialog cảnh báo
- [ ] Dialog có nút "Ở lại" và "Rời đi, không lưu" — nhãn nói rõ hậu quả
- [ ] "Ở lại" → dữ liệu đã nhập **còn nguyên**
- [ ] Nhập nửa form → **reload** → browser cảnh báo
- [ ] Gõ vào field rồi **xoá về nguyên trạng** → rời trang **không** cảnh báo
- [ ] Lưu thành công → rời trang **không** cảnh báo
- [ ] Form trong Dialog khi đang dirty: Escape **không** đóng ngay; click backdrop **không** đóng ngay

### alert() & lỗi
- [ ] Chọn file `.pdf` cho ảnh sản phẩm → lỗi hiện **dưới ô file**, không phải popup OS
- [ ] Chọn ảnh 8MB → thông báo ghi **"Ảnh 8,2 MB — tối đa 5 MB"** (có số cụ thể)
- [ ] Không có `alert()` nào chặn luồng ở bất kỳ đâu trong admin

### Dashboard
- [ ] Block **1** trong 6 request (DevTools) → chỉ widget đó lỗi, **5 widget còn lại vẫn hiện**
- [ ] Bấm vào stat card "lô sắp hết hạn" → dẫn tới `/admin/inventory` **có filter sẵn**
- [ ] `delta` có mũi tên **và** dấu +/−, không chỉ màu
- [ ] Số tiền hiện `1.250.000 ₫`
- [ ] Widget "Cần xử lý hôm nay" nằm **trên** các chart

### Layout & shortcut
- [ ] **Ctrl+click** một nav item → mở tab mới thật
- [ ] Chuột **đi ngang** sidebar → sidebar **không** tự bung ra
- [ ] Bấm nút collapse → sidebar thu lại; **reload** → vẫn thu lại
- [ ] Nav nhóm 4 cụm; không còn nhãn "Batch trace"
- [ ] Nhãn "Đơn đặt trước" / "Bán tại quầy" (không phải "Đơn hàng"/"Bán hàng")
- [ ] Badge số trên "Cảnh báo" khớp số cảnh báo chưa xử lý
- [ ] Mở 3 tab admin → đọc được tab nào là gì qua `document.title`
- [ ] `g` `i` → tới Tồn kho; `/` → focus ô tìm kiếm; `?` → dialog shortcut
- [ ] **Gõ "n" vào ô tìm kiếm → KHÔNG mở form tạo mới** (test này quan trọng)
- [ ] `Ctrl+T` / `Ctrl+W` / `Cmd+R` vẫn hoạt động như bình thường

### Alerts
- [ ] Tabs theo mức độ có badge số, tab "Sắp hết hạn" mặc định
- [ ] Bấm "Đã xử lý" → cảnh báo biến khỏi danh sách
- [ ] "Tồn thấp" → "Nhập lô mới" → form có sản phẩm **pre-fill**

### Mobile (kịch bản thật: nhân viên đứng ở kho)
- [ ] iPhone thật, `AdminInventoryPage`: thấy rõ **tên + ngày hết hạn + số lượng**
- [ ] **Không** scroll ngang
- [ ] Pagination bấm được bằng ngón tay
- [ ] Bấm nav item → drawer đóng

---

## §7b — Admin: visual

- [ ] Mở `/admin`: font là Inter/Bricolage, **không** Roboto
- [ ] Nút primary màu **terracotta**, không xanh `#1976d2`
- [ ] Nhãn nút là "Đặt hàng", **không** "ĐẶT HÀNG"
- [ ] Radius 10px, shadow tông nâu ấm
- [ ] Header bảng **sticky** khi scroll trong bảng
- [ ] Screenshot so sánh trước/sau: Dashboard, Inventory, Product, Sales

### Contrast — hai nhóm màu phải rà tay
- [ ] Tìm hết chỗ từng dùng `#C59B72` (97 chỗ): chỗ nào là **màu chữ** → đã đổi sang `primary.dark`; chỗ nào là **nền** → `primary.main`
- [ ] Tương tự `#9B948B` (40 chỗ): text thật → `text.secondary`; control **đã disabled** → `text.disabled`
- [ ] axe trên 5 trang admin → 0 violation
- [ ] Tab qua toàn bộ `AdminInventoryPage` → **mọi** element focus được có ring terracotta, không element nào "im lặng"

### Chart — test grayscale
- [ ] Chụp screenshot pie chart → chuyển **grayscale** (Preview/Paint) → **vẫn phân biệt được** từng lát
- [ ] Pie có **nhãn trực tiếp** trên lát, không chỉ legend bên cạnh
- [ ] Line/Area nhiều series có nét gạch khác nhau
- [ ] Mỗi chart có Accordion "Xem dữ liệu dạng bảng"; bảng đó copy được vào Excel
- [ ] Không có dữ liệu → empty state, không chart rỗng

### iOS
- [ ] **iPhone thật:** focus vào input trong admin → **không tự zoom** (input 16px)

### Không hồi quy
- [ ] Mở `/` (storefront) → DevTools Network: **không** có chunk MUI
- [ ] Storefront screenshot diff trước/sau 7b = **0 thay đổi**
- [ ] `npm run gate:phase6` vẫn PASS
- [ ] `npm run check:contrast` vẫn PASS 21/21

---

## Sau khi xong tất cả

Điền bảng này và đưa vào `README.md` của repo:

| Chỉ số | Trước | Sau |
|---|---|---|
| Hex hardcode `.tsx` (storefront) | 150 | |
| `focus:outline-none` | 52 | |
| `autoComplete` | 0 | |
| `<a href="/">` nội bộ | 2 | |
| `max-w-[1440px]` | 34 | |
| Lighthouse A11y (`/`) | | |
| Lighthouse Perf (`/`) | | |
| LCP (`/`, mobile) | | |
| CLS (`/`) | | |
| Bundle storefront (gzip) | | |
| Trang tới được trên mobile | **2/5** | |
| Hoàn thành luồng mua bằng bàn phím | Không | |
| File `.tsx` > 400 LOC | 9 | |
| **Admin:** pagination trên bảng | **0/11** | |
| **Admin:** sorting | **0/11** | |
| **Admin:** `sx={{` inline | **593** | |
| **Admin:** hex hardcode | **471** | |
| **Admin:** form có validation | **1/6** | |
| **Admin:** unsaved-changes guard | **0** | |

Dòng "trang tới được trên mobile 2/5 → 5/5" là chỉ số duy nhất người dùng thật cảm nhận được ngay.
