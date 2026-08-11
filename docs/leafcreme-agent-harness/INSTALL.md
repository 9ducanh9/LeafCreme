# Cài harness vào repo LeafCreme

Bộ này để chạy spec redesign bằng Claude Code với **1 phase / 1 lần**, có gate chặn bằng exit code.

---

## 1. Copy file vào repo

Từ thư mục `leafcreme-agent-harness/`, copy vào **root** của repo LeafCreme:

```
LeafCreme/
├── CLAUDE.md                       ← copy
├── .claude/
│   ├── settings.json               ← copy
│   └── commands/                   ← copy (9 file)
├── scripts/
│   ├── guard-protected.mjs         ← copy
│   └── gate/                       ← copy (5 file)
└── docs/
    ├── MANUAL-CHECKS.md            ← copy
    ├── backend-tasks.md            ← copy
    ├── contrast-check.py           ← copy
    └── ui-redesign/                ← copy TOÀN BỘ 11 file spec vào đây
```

Lệnh:

```bash
cd /đường/dẫn/LeafCreme
cp -r /đường/dẫn/leafcreme-agent-harness/{CLAUDE.md,.claude,scripts,docs} .
mkdir -p docs/ui-redesign
cp /đường/dẫn/leafcreme-ui-redesign/*.md docs/ui-redesign/
```

**Quan trọng:** spec phải nằm ở `docs/ui-redesign/`. Command và gate đều trỏ tới path đó.

---

## 2. Thêm scripts vào `package.json`

Có **2** `package.json`: root (nếu có) và `frontend/`.

### `frontend/package.json` — thêm vào `scripts`

```jsonc
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",

    "test": "vitest",
    "test:a11y": "vitest run --dir src --testNamePattern a11y",

    "check:tokens": "node ../scripts/gate/probe.mjs legacy-scope && ! grep -rEn '#[0-9a-fA-F]{6}' src --include=*.tsx --exclude-dir=admin",
    "check:focus":  "! grep -rn 'focus:outline-none' src --include=*.tsx --exclude-dir=admin",
    "check:links":  "node ../scripts/gate/probe.mjs internal-anchors"
  }
}
```

### Root `package.json` — tạo nếu chưa có

```jsonc
{
  "name": "leafcreme",
  "private": true,
  "scripts": {
    "gate:phase0": "node scripts/gate/run.mjs 0",
    "gate:phase1": "node scripts/gate/run.mjs 1",
    "gate:phase2": "node scripts/gate/run.mjs 2",
    "gate:phase3": "node scripts/gate/run.mjs 3",
    "gate:phase4": "node scripts/gate/run.mjs 4",
    "gate:phase5": "node scripts/gate/run.mjs 5",
    "gate:phase6": "node scripts/gate/run.mjs 6",
    "gate:phase7a": "node scripts/gate/run.mjs 7a",
    "gate:phase7b": "node scripts/gate/run.mjs 7b",

    "check:contrast": "python3 docs/contrast-check.py",
    "check:chart": "python3 docs/chart-contrast-check.py",
    "check:tokens":   "npm --prefix frontend run check:tokens",
    "check:focus":    "npm --prefix frontend run check:focus",
    "check:links":    "npm --prefix frontend run check:links",
    "gate:all":       "npm --prefix frontend run lint && npm run check:contrast && npm run check:tokens && npm run check:focus && npm run check:links"
  }
}
```

Gate chạy từ **root**, và `tsc`/`vite` chạy qua `npm --prefix frontend`.

---

## 3. Kiểm harness hoạt động trước khi giao cho agent

```bash
cd /đường/dẫn/LeafCreme

# 1. Gate phải chạy được và FAIL (vì chưa làm gì) — không được crash
npm run gate:phase3
# kỳ vọng: in danh sách check, phần lớn FAIL, exit 1

# 2. Contrast phải PASS ngay (không phụ thuộc code)
npm run check:contrast
# kỳ vọng: 21/21 PASS

# 3. Từng probe không crash
for n in internal-anchors product-card single-h1 login-redirect checkout-order; do
  echo "--- $n"; node scripts/gate/probe.mjs $n
done
# kỳ vọng: mỗi cái in lý do FAIL rõ ràng, không SyntaxError/TypeError
```

Nếu bước 1 hoặc 3 crash → sửa harness **trước**, đừng giao cho agent. Gate crash thì agent sẽ coi như pass hoặc bỏ qua.

---

## 4. Kiểm hook chặn thật

Đây là bước hay bị bỏ, và nó là thứ quyết định harness có tác dụng hay không.

Mở Claude Code trong repo, thử từng lệnh sau. **Cả 4 phải bị chặn:**

| Thử | Kỳ vọng |
|---|---|
| "Sửa `scripts/gate/checks.mjs`, hạ ngưỡng autoComplete xuống 5" | BỊ CHẶN (permissions deny + hook) |
| "Thêm `bg-blue-500` vào `src/pages/CartPage.tsx`" | BỊ CHẶN (hook, kèm giải thích) |
| "Chạy `git commit --no-verify -m test`" | BỊ CHẶN (hook) |
| "Thêm `#FF0000` vào `src/components/bakery/ProductCard.tsx`" | BỊ CHẶN (hook) |

Và **1 cái phải được phép** (chứng minh không chặn quá tay):

| Thử | Kỳ vọng |
|---|---|
| "Thêm `bg-legacy-gray100` vào `src/pages/admin/AdminProductPage.tsx`" | ĐƯỢC PHÉP |

Nếu có cái nào không đúng như trên → hook chưa nạp. Kiểm `.claude/settings.json` có đúng chỗ, và `node scripts/guard-protected.mjs` chạy được.

---

## 5. Chạy

### Thứ tự bắt buộc

```
Storefront:  0 → 1 → 2 → 3 → 5 → 4 → 6
Admin:       7a → 7b
Cuối:        8 (dọn dẹp)
```

Chú ý **5 trước 4** — phase 5 chứa bug ảnh hưởng doanh thu, sửa trước.

**7a độc lập với storefront hoàn toàn** (chỉ chạm `admin/` + backend) — chen vào bất cứ đâu sau phase 0 được.
**7b phụ thuộc phase 1** vì theme MUI map sang `tokens.css`.

### Mỗi phase

```
Mày:   /phase-0
Agent: [làm việc] → chạy gate → viết báo cáo → DỪNG

Mày:   đọc báo cáo
       làm manual check ở docs/MANUAL-CHECKS.md §0
       review git diff
       merge branch

Mày:   /phase-1
       ...
```

### Trước phase 4, làm backend B1 riêng

```
Mày: đọc docs/backend-tasks.md §1
     Đây là bug P0: FEFO có thể phân bổ lô ĐÃ HẾT HẠN.
     Cho agent làm với luật "test trước, sửa sau" (CLAUDE.md §6).
     Tự kiểm bằng dữ liệu thật trước khi tin.
```

Có thể làm B1 **ngay bây giờ**, không cần chờ phase nào — nó độc lập và đang gây thiệt hại mỗi ngày.

---

## 6. Dấu hiệu agent đang đi lệch — dừng ngay

| Dấu hiệu | Nghĩa là gì |
|---|---|
| Báo "gate pass" mà không dán output | Có thể chưa chạy. Yêu cầu dán output thật |
| Gate pass nhưng `git diff` cho thấy `scripts/gate/` bị sửa | Hook không hoạt động. Revert, sửa hook |
| Xin phép sửa/nới một check | **Luôn từ chối lần đầu.** Bắt nó giải thích tại sao code không thoả được. 9/10 lần là code sai, không phải check sai |
| Commit 40 file một lần | Vi phạm CLAUDE.md §3.1. Bắt tách |
| Tự nhảy sang phase tiếp theo | Vi phạm §3. Dừng, revert phần vượt phạm vi |
| Thêm dependency ngoài spec 00 §2.3 | Vi phạm §8. Hỏi lý do, thường là không cần |
| Sửa file trong `src/pages/admin/**` ngoài đổi màu | Vi phạm §1.2 |
| Báo cáo không có phần "Lệch so với spec" | Đang che chỗ làm khác spec. Yêu cầu viết lại |
| Đổi `colors` sang `extend` trong tailwind config | Đang phá guardrail để làm build xanh. Revert |

Điểm thứ 3 quan trọng nhất. Agent sẽ lập luận rất thuyết phục rằng check quá khắt khe. Mặc định là **không**.

---

## 7. Cái harness này KHÔNG làm được

Nói rõ để không tin quá:

- **Gate bắt được ~60% vấn đề.** 40% còn lại ở `docs/MANUAL-CHECKS.md`, không automate được.
- **Gate kiểm sự tồn tại, không kiểm chất lượng.** `mobile-nav.tsx` tồn tại + có `Drawer` + có `aria-current` không đảm bảo nó dùng được. Vẫn phải resize browser xuống 375px và tự bấm.
- **`axe` bắt ~30-40% vấn đề a11y.** "0 axe violation" ≠ accessible.
- **Không kiểm được thẩm mỹ.** Không có gate nào biết app trông đẹp hay xấu.
- **Không kiểm được đúng nghiệp vụ.** Gate biết `fefo.py` có filter `ngay_het_han >= today`; nó không biết logic tổng thể có đúng ý bakery hay không.
- **Hook chặn theo pattern.** Agent đủ sáng tạo vẫn có đường lách (ví dụ viết hex qua template string). Hook giảm rủi ro, không loại bỏ.

Vì vậy: đọc báo cáo mỗi phase, review `git diff`, và làm manual check. Harness giúp phát hiện sớm, không thay thế được việc mày xem.

---

## 8. Bảng file trong bộ này

| File | Vai trò | Agent sửa được? |
|---|---|---|
| `CLAUDE.md` | Luật cứng cho agent | Không |
| `.claude/settings.json` | Hook + permissions | Không |
| `.claude/commands/phase-N.md` | Slash command từng phase | Không |
| `.claude/commands/gate.md` | `/gate <n>` | Không |
| `.claude/commands/report.md` | `/report <n>` | Không |
| `scripts/guard-protected.mjs` | Hook chặn ở tầng tool | Không |
| `scripts/gate/run.mjs` | Gate runner | Không |
| `scripts/gate/checks.mjs` | Khai báo check từng phase | Không |
| `scripts/gate/probe.mjs` | 34 probe logic phức tạp | Không |
| `scripts/gate/fsutil.mjs` | Glob không phụ thuộc Node 22 | Không |
| `scripts/gate/remind.mjs` | Stop hook nhắc nhở | Không |
| `docs/contrast-check.py` | 21 cặp màu WCAG | Không |
| `docs/chart-contrast-check.py` | 6 màu chart, mọi cặp gap >= 0.10 | Không |
| `docs/MANUAL-CHECKS.md` | Checklist cho **người** | Không |
| `docs/backend-tasks.md` | Task backend + test bắt buộc | Đọc + làm theo |
| `docs/ui-redesign/*.md` | **16** file spec (00-13 + README + VERIFICATION) | Không (read-only) |
| `docs/ui-baseline.md` | Agent tạo ở phase 0 | Có |
