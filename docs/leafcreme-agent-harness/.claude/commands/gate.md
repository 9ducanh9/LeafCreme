---
description: Chạy gate cho một phase
argument-hint: <số phase>
---

Chạy `npm run gate:phase$1` và báo cáo kết quả.

Nếu có check FAIL:
1. Đọc phần "Vì sao cần" của từng check FAIL
2. Sửa **CODE** cho đúng
3. Chạy lại

**Không sửa file trong `scripts/gate/`.** Nếu bạn tin một check là sai: DỪNG, giải thích tại sao, chờ người xác nhận. Xem `CLAUDE.md` §1.1.
