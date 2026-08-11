# LeafCreme — Agent operating rules

Bạn đang thực thi một bộ spec redesign UI/UX đã được viết và verify trước. Spec nằm ở `docs/ui-redesign/00-…` đến `08-…`, kèm `VERIFICATION.md`.

**Bạn KHÔNG được quyết định lại những gì spec đã chốt.** Nếu thấy spec sai, DỪNG và báo — đừng tự sửa hướng.

---

## 1. Luật cứng — vi phạm là dừng ngay

### 1.1 Không được làm yếu gate

Đây là luật quan trọng nhất. Gate là thứ duy nhất chứng minh bạn làm đúng.

**TUYỆT ĐỐI KHÔNG:**

- Sửa, xoá, hoặc "cải thiện" bất kỳ file nào trong `scripts/gate/`, `scripts/guard-protected.mjs`, `docs/contrast-check.py`
- Sửa `package.json` ở phần `scripts` có tiền tố `gate:` hoặc `check:`
- Nới lỏng ngưỡng trong gate (ví dụ đổi `>= 15` thành `>= 5`)
- Thêm `--no-verify`, `--force`, `--skip-checks` vào bất kỳ lệnh git nào
- Thêm `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `// prettier-ignore` để làm check xanh
- Xoá test case để test pass
- Đổi `no-restricted-imports` từ `error` sang `warn` hoặc `off`

Nếu một gate check fail và bạn tin rằng chính check đó sai: **DỪNG, báo cáo, chờ người xác nhận.** Không tự sửa check.

### 1.2 Không chạm admin trong phase 0-6

`src/pages/admin/**`, `src/components/admin/**`, `src/layout/admin/**` chỉ được sửa đúng một việc: đổi màu Tailwind mặc định sang `legacy-*` ở phase 1. Không refactor, không đổi component, không bỏ MUI. Admin có spec riêng ở phase 7.

### 1.3 Không thêm hex hardcode

`#RRGGBB` trong file `.tsx` bên ngoài `src/pages/admin`, `src/components/admin` là **cấm**. Dùng token semantic từ `tokens.css`. Nếu thiếu token cho một vai trò nào đó — DỪNG và báo, đừng bịa hex.

### 1.4 Không thêm màu Tailwind mặc định

`bg-blue-500`, `text-gray-400`, `border-red-200`… là cấm. `tailwind.config.js` **ghi đè** `theme.colors` (không phải `extend`) nên chúng sẽ fail build. Đây là **cố ý**. Xem §2.

### 1.5 Không tắt focus indicator

`focus:outline-none` không được thêm mới. Nếu cần custom focus, dùng `focus-visible:ring-2 focus-visible:ring-focus`.

### 1.6 Không dùng `<a href="/...">` cho link nội bộ

Dùng `<Link to="...">` của react-router. `<a>` chỉ cho `http(s)://`, `tel:`, `mailto:`.

---

## 2. Phase 1 làm vỡ build — ĐÓ LÀ ĐÚNG

Khi bạn thay `tailwind.config.js` ở phase 1, `theme.colors` được **ghi đè hoàn toàn** để palette mặc định của Tailwind không còn truy cập được. Hệ quả: mọi file đang dùng `bg-gray-100`, `text-blue-600`… sẽ **fail build**.

**Đây là mục đích, không phải bug.**

Cách xử lý ĐÚNG:

1. Chạy `node scripts/gate/list-legacy-colors.mjs` để lấy danh sách chỗ vi phạm
2. Với file trong `admin/`: đổi sang `legacy-*` alias (spec 01 §7)
3. Với file trong storefront: đổi sang **token semantic** đúng vai trò

Cách xử lý SAI — nếu bạn làm bất kỳ điều nào dưới đây, coi như phase 1 thất bại:

- Đổi `colors:` thành `extend: { colors: }` trong `tailwind.config.js`
- Thêm palette Tailwind mặc định vào config
- Thêm hex vào component để né
- Thêm `legacy-*` alias cho file storefront (alias đó CHỈ dành cho admin)

---

## 3. Quy trình mỗi phase

Bạn chạy **đúng một phase mỗi lần**. Hết phase thì DỪNG.

```
1. Đọc spec của phase (file nào ghi trong /phase-N command)
2. Đọc docs/ui-redesign/VERIFICATION.md §4 — kiểm các giả định liên quan phase này
   → Nếu giả định nào SAI so với code thật: DỪNG, báo, không code tiếp
3. Tạo branch: git checkout -b redesign/phase-N
4. Implement, commit nhỏ và thường xuyên (mỗi commit 1 việc logic)
5. Chạy: npm run gate:phaseN
6. Gate đỏ → sửa CODE (không sửa gate) → chạy lại
7. Gate xanh → viết báo cáo theo mẫu §5 → DỪNG
```

**Không tự chuyển sang phase N+1.** Người sẽ chạy manual check rồi mới cho phép.

### 3.1 Commit discipline

- Commit message tiếng Anh, dạng `phase-N: <what>`
- Một commit = một việc logic. Không commit 40 file một lần
- **Không** squash, **không** amend commit đã push
- Không commit khi build đỏ, trừ phase 1 (build đỏ là trạng thái trung gian hợp lệ) — trong trường hợp đó ghi rõ `[wip build broken by design]` vào message

### 3.2 Rename file — bắt buộc 2 bước

Windows/macOS coi `Button.tsx` và `button.tsx` là cùng file. Đổi trực tiếp thì git bỏ qua và CI Linux vỡ.

```bash
git mv src/components/ui/Button.tsx src/components/ui/button-tmp.tsx
git commit -m "phase-2: rename Button.tsx step 1"
git mv src/components/ui/button-tmp.tsx src/components/ui/button.tsx
git commit -m "phase-2: rename Button.tsx step 2"
```

---

## 4. Khi nào DỪNG và hỏi

Dừng ngay, đừng đoán, trong các trường hợp:

| Tình huống | Vì sao phải hỏi |
|---|---|
| Một giả định trong `VERIFICATION.md` §4 không đúng với code thật | Spec đang dựa trên nó; code theo sẽ sai |
| Spec yêu cầu field/endpoint backend không tồn tại và không có trong `docs/backend-tasks.md` | Không được tự thiết kế API |
| Cần sửa file trong `src/pages/admin/**` ngoài việc đổi màu | Ngoài scope |
| Gate check có vẻ sai | Xem §1.1 |
| Hai spec nói ngược nhau | Phải sửa spec trước |
| Cần thêm dependency không có trong spec 00 §2.3 | Quyết định kiến trúc |
| Migration dữ liệu (cart v1→v2) có thể làm mất giỏ hàng người dùng thật | Rủi ro dữ liệu |
| Cần sửa logic tính tiền, voucher, hoặc allocation tồn kho | Ảnh hưởng tiền |

Báo dạng: **vấn đề gì → spec nói gì → code thật thế nào → 2-3 lựa chọn kèm trade-off → khuyến nghị của bạn**. Rồi dừng.

---

## 5. Mẫu báo cáo cuối phase

```markdown
## Phase N — hoàn tất

### Gate
`npm run gate:phaseN` → PASS (dán output)

### Đã làm
- <việc>: <file:dòng>
- …

### File tạo mới / xoá / rename
| Hành động | File |

### Lệch so với spec
- <chỗ nào làm khác spec và VÌ SAO>   ← nếu không có thì ghi "không có"

### Giả định đã verify (VERIFICATION.md §4)
| Giả định | Kết quả kiểm | Ảnh hưởng spec |

### Manual check người phải tự làm
Xem docs/MANUAL-CHECKS.md §N — <liệt kê mục cụ thể>

### Việc phát sinh cần quyết định
- …
```

---

## 6. Backend — luật riêng

Bạn được sửa backend, nhưng với ràng buộc cứng:

### 6.1 Test trước, sửa sau

Với **mọi** thay đổi trong `app/services/fefo.py` hoặc logic allocation/tính tiền:

1. Viết pytest **trước** — test phải **FAIL** trên code hiện tại (chứng minh test thật sự bắt được bug)
2. Commit test riêng, message ghi rõ `(failing)`
3. Rồi mới sửa code
4. Test chuyển xanh

Nếu test pass ngay từ đầu trên code cũ → test viết sai, làm lại.

### 6.2 B1 (FEFO bán lô hết hạn) — test bắt buộc

Trước khi sửa `alloc_fefo_by_variant`, phải có test cover:

- Lô `ngay_het_han` = hôm qua, `so_luong_hien_tai` = 5 → **không** được phân bổ
- Lô `ngay_het_han` = hôm nay → **được** phân bổ (hôm nay vẫn dùng được)
- Lô `ngay_het_han` = hôm qua (5 cái) + lô mai (3 cái), cần 4 → chỉ lấy được 3, `ok = False`
- Thứ tự FEFO vẫn đúng: 2 lô còn hạn → lấy lô hết hạn sớm hơn trước
- Không có lô nào còn hạn → trả `([], False)`, không throw

Xem `docs/backend-tasks.md` để biết chi tiết.

### 6.3 Không đổi shape response đang có mà không nói

Thêm field vào `ProductResponse` thì được. **Đổi tên** hoặc **xoá** field đang có thì phải dừng và hỏi — admin đang dùng.

---

## 7. Lệnh hay dùng

```bash
npm run gate:phase0 … gate:phase6   # gate từng phase
npm run gate:all                    # toàn bộ check global
npm run check:contrast              # 21 cặp màu WCAG
npm run check:tokens                # 0 hex hardcode ở storefront
npm run check:focus                 # 0 focus:outline-none
npm run check:links                 # 0 <a href="/"> nội bộ
node scripts/gate/list-legacy-colors.mjs   # liệt kê chỗ dùng màu Tailwind mặc định
pytest tests/ -v                    # backend
```

---

## 8. Những gì KHÔNG làm trong phase 0-6

Đừng tự ý thêm, dù thấy có ích:

- Dark mode
- i18n / đa ngôn ngữ
- react-query / SWR / Zustand / Redux
- Storybook
- Framer Motion
- Đổi sang Next.js / SSR
- Đổi thư viện chart
- Refactor admin
- Thêm CI workflow mới (đã có)
- "Dọn dẹp" code ngoài phạm vi phase hiện tại

Thấy cái gì đáng làm thì ghi vào phần "Việc phát sinh" của báo cáo, đừng làm.
