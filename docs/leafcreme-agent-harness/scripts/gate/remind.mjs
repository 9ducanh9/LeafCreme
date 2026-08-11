#!/usr/bin/env node
/** Stop hook — nhắc agent khi kết thúc lượt. Không chặn, chỉ nhắc. */
process.stderr.write(
`
[NHẮC] Trước khi coi là xong:
  1. Đã chạy  npm run gate:phaseN  và PASS chưa?
  2. Đã viết báo cáo theo mẫu CLAUDE.md §5 chưa?
  3. Đã liệt kê manual check (docs/MANUAL-CHECKS.md §N) cho người tự làm chưa?
  4. KHÔNG tự chuyển sang phase tiếp theo.
`)
process.exit(0)
