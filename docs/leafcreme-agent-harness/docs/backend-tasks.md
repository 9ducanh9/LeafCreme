# Backend tasks

> Agent được làm những việc này, nhưng theo luật ở `CLAUDE.md` §6: **test trước, sửa sau**.
>
> Test phải **FAIL** trên code hiện tại. Test pass ngay từ đầu = test viết sai.

---

## 1. B1 — FEFO có thể phân bổ lô đã hết hạn (P0)

### Hiện trạng

`app/services/fefo.py:8`

```python
def alloc_fefo_by_variant(db: Session, bienthe_id: int, need_qty: int):
    q = (
        select(LoHangSanPham, TonKhoSanPham)
        .join(TonKhoSanPham, TonKhoSanPham.lohang_sanpham_id == LoHangSanPham.lohang_id)
        .where(
            LoHangSanPham.bienthe_sanpham_id == bienthe_id,
            TonKhoSanPham.so_luong_hien_tai > 0,      # ← điều kiện DUY NHẤT
        )
        .order_by(LoHangSanPham.ngay_het_han.asc())
        .with_for_update()
    )
```

`where` **không** có điều kiện nào về `ngay_het_han`. Nó chỉ dùng `ngay_het_han` để **sắp xếp**.

Nghĩa là: lô đã hết hạn mà còn `so_luong_hien_tai > 0` thì **được ưu tiên phân bổ trước tiên** (vì `ORDER BY ngay_het_han ASC` đặt nó đầu tiên).

Với bakery bán bánh short-shelf-life, đây là lỗi nghiêm trọng nhất trong toàn bộ codebase — nghiêm trọng hơn mọi vấn đề UI trong bộ spec redesign.

### Bước 1 — Viết test (phải FAIL)

`tests/test_fefo.py`

```python
import pytest
from datetime import date, timedelta
from app.services.fefo import alloc_fefo_by_variant

TODAY = date.today()
YESTERDAY = TODAY - timedelta(days=1)
TOMORROW = TODAY + timedelta(days=1)


def test_khong_phan_bo_lo_da_het_han(db, make_batch):
    """Lô hết hạn hôm qua còn 5 cái → KHÔNG được phân bổ.

    Đây là test quan trọng nhất của cả file. Trên code hiện tại nó FAIL.
    """
    make_batch(bienthe_id=1, ngay_het_han=YESTERDAY, so_luong=5)
    alloc, ok = alloc_fefo_by_variant(db, bienthe_id=1, need_qty=1)
    assert alloc == [], "Lô đã hết hạn không được phân bổ cho khách"
    assert ok is False


def test_lo_het_han_hom_nay_van_dung_duoc(db, make_batch):
    """ngay_het_han = hôm nay → VẪN dùng được (hết hạn vào cuối ngày).

    Test này chống over-fix: đừng filter > today thay vì >= today.
    """
    make_batch(bienthe_id=1, ngay_het_han=TODAY, so_luong=5)
    alloc, ok = alloc_fefo_by_variant(db, bienthe_id=1, need_qty=2)
    assert ok is True
    assert sum(q for _, q in alloc) == 2


def test_bo_qua_lo_het_han_va_khong_du_hang(db, make_batch):
    """Lô hết hạn (5) + lô còn hạn (3), cần 4 → chỉ lấy được 3, ok=False."""
    make_batch(bienthe_id=1, ngay_het_han=YESTERDAY, so_luong=5)
    make_batch(bienthe_id=1, ngay_het_han=TOMORROW,  so_luong=3)
    alloc, ok = alloc_fefo_by_variant(db, bienthe_id=1, need_qty=4)
    assert sum(q for _, q in alloc) == 3
    assert ok is False


def test_thu_tu_fefo_van_dung_sau_khi_fix(db, make_batch):
    """2 lô đều còn hạn → lấy lô hết hạn SỚM hơn trước.

    Test này chống regression: đừng làm mất tính chất FEFO khi thêm filter.
    """
    d2 = TODAY + timedelta(days=2)
    d5 = TODAY + timedelta(days=5)
    lo_som = make_batch(bienthe_id=1, ngay_het_han=d2, so_luong=2)
    lo_muon = make_batch(bienthe_id=1, ngay_het_han=d5, so_luong=10)
    alloc, ok = alloc_fefo_by_variant(db, bienthe_id=1, need_qty=3)
    assert ok is True
    assert alloc[0][0] == lo_som.lohang_id, "Phải lấy lô hết hạn sớm trước"
    assert alloc[0][1] == 2
    assert alloc[1][0] == lo_muon.lohang_id
    assert alloc[1][1] == 1


def test_khong_co_lo_nao_con_han(db, make_batch):
    """Chỉ có lô hết hạn → trả ([], False), KHÔNG throw."""
    make_batch(bienthe_id=1, ngay_het_han=YESTERDAY, so_luong=10)
    make_batch(bienthe_id=1, ngay_het_han=TODAY - timedelta(days=7), so_luong=3)
    alloc, ok = alloc_fefo_by_variant(db, bienthe_id=1, need_qty=1)
    assert alloc == []
    assert ok is False
```

Chạy:

```bash
python3 -m pytest tests/test_fefo.py -v
# KỲ VỌNG: test 1, 3, 5 FAIL. Test 2, 4 PASS.
```

Nếu test 1 pass ngay → test viết sai (có thể fixture không tạo được lô hết hạn). Sửa test, đừng sửa code.

**Commit riêng:**
```bash
git add tests/test_fefo.py
git commit -m "test(fefo): add expired-lot allocation tests (failing)"
```

Chữ `(failing)` trong message là bắt buộc — `probe.mjs fefo-test-history` kiểm nó.

### Bước 2 — Sửa

```python
from datetime import date

def alloc_fefo_by_variant(db: Session, bienthe_id: int, need_qty: int):
    """
    Trả về: ([(lohang_id, take_qty), ...], ok)

    Rule: lọc các lô CÒN HẠN và còn hàng, order by ngay_het_han ASC, FOR UPDATE.

    Lưu ý `>= today` chứ không phải `> today`: lô hết hạn vào ngày hôm nay
    vẫn dùng được trong ngày đó.
    """
    today = date.today()
    q = (
        select(LoHangSanPham, TonKhoSanPham)
        .join(TonKhoSanPham, TonKhoSanPham.lohang_sanpham_id == LoHangSanPham.lohang_id)
        .where(
            LoHangSanPham.bienthe_sanpham_id == bienthe_id,
            TonKhoSanPham.so_luong_hien_tai > 0,
            LoHangSanPham.ngay_het_han >= today,        # ← FIX B1
        )
        .order_by(LoHangSanPham.ngay_het_han.asc())
        .with_for_update()
    )
    ...
```

### Bước 3 — Kiểm tra lan toả

Sau khi sửa, kiểm những chỗ khác cũng đọc tồn kho mà có thể có cùng lỗi:

```bash
grep -rn "so_luong_hien_tai" app/ | grep -v test
```

Với **mỗi** chỗ tìm được, tự hỏi: chỗ này có nên loại lô hết hạn không? Ghi kết quả vào báo cáo.

Đặc biệt kiểm: `app/routers/inventory_trace.py`, `app/services/inventory_ledger_service.py`, `app/routers/alerts.py`.

### Câu hỏi cần người quyết định — DỪNG và hỏi

Lô đã hết hạn vẫn còn `so_luong_hien_tai > 0` trong DB. Sau khi fix, chúng bị loại khỏi allocation nhưng **vẫn nằm đó**. Cần quyết định:

1. Có job tự động chuyển chúng sang trạng thái "huỷ / thất thoát" không?
2. Có ghi vào `inventory_ledger` để audit không?
3. Admin có được cảnh báo không (`alerts.py` đã có gì)?

Đây là quyết định nghiệp vụ, **không được tự quyết**. Nếu không xử lý, số liệu tồn kho trong admin sẽ sai lệch dần theo thời gian.

---

## 2. Endpoint availability (P1)

### Yêu cầu

```
GET /products/{product_id}/availability
```

```jsonc
{
  "sanpham_id": 12,
  "tong_kha_dung": 14,
  "trang_thai": "con_hang",
  "ngay_het_han_gan_nhat": "2026-08-13",
  "bien_the": [
    {
      "bienthe_id": 34,
      "huong_vi": "Vani",
      "kich_thuoc": "18cm",
      "so_luong_kha_dung": 3,
      "muc_gioi_han_ton": 10,
      "ngay_het_han_gan_nhat": "2026-08-13",
      "so_lo_kha_dung": 2
    }
  ]
}
```

Chi tiết SQL ở `docs/ui-redesign/04-catalog-discovery.md` §2.3.

### Ràng buộc quan trọng nhất

**Availability phải dùng CÙNG điều kiện filter với `alloc_fefo_by_variant`.**

Nếu lệch, UI sẽ hứa số lượng mà allocation không giao được → khách đặt xong bị từ chối. Đây là loại bug rất khó debug vì mỗi bên đọc riêng đều "đúng".

Test bắt buộc:

```python
def test_availability_matches_fefo(db, make_batch):
    """Số availability trả về PHẢI khớp với số FEFO thực sự phân bổ được.

    Bao gồm cả case có lô hết hạn — availability phải loại nó giống FEFO.
    """
    make_batch(bienthe_id=1, ngay_het_han=YESTERDAY, so_luong=100)   # bẫy
    make_batch(bienthe_id=1, ngay_het_han=TOMORROW,  so_luong=7)

    avail = get_availability_for_variant(db, bienthe_id=1)
    alloc, ok = alloc_fefo_by_variant(db, bienthe_id=1, need_qty=avail)

    assert ok is True, "Availability hứa số mà FEFO không giao được"
    assert sum(q for _, q in alloc) == avail == 7
```

**Cách tốt hơn để không bao giờ lệch:** tách điều kiện filter thành một hàm dùng chung.

```python
# app/services/fefo.py
def _available_lots_filter(bienthe_id: int, today: date):
    """Điều kiện xác định lô KHẢ DỤNG. Dùng bởi CẢ allocation VÀ availability.
    Sửa ở đây thì cả hai đổi theo — không thể lệch."""
    return (
        LoHangSanPham.bienthe_sanpham_id == bienthe_id,
        TonKhoSanPham.so_luong_hien_tai > 0,
        LoHangSanPham.ngay_het_han >= today,
    )
```

Khuyến nghị làm theo cách này.

### Thêm field vào response list

`GET /products` cần thêm 3 field để grid không phải gọi N request:

```python
class ProductResponse(BaseModel):
    # ... 13 field hiện có, KHÔNG đổi tên, KHÔNG xoá ...
    tong_kha_dung: Optional[int] = None
    trang_thai_ton: Optional[str] = None
    ngay_het_han_gan_nhat: Optional[date] = None
```

`Optional` với default `None` để admin không vỡ.

Test: `GET /products` với 20 sản phẩm → đếm số query SQL, phải là **O(1)** không phải O(n). Dùng `sqlalchemy` event listener để đếm trong test.

---

## 3. Idempotency key cho POST /orders (P1)

### Yêu cầu

- Nhận header `Idempotency-Key: <uuid>`
- Lưu `(key, user_id) → donhang_id` với TTL 24h
- Cùng key gửi lại → trả **đơn cũ** với `200`, không tạo đơn mới
- Key khác → tạo đơn mới
- Không có header → hành vi như hiện tại (backward compatible)

### Test bắt buộc

```python
def test_idempotency_tra_don_cu(client, auth_headers):
    key = str(uuid4())
    h = {**auth_headers, "Idempotency-Key": key}
    r1 = client.post("/orders", json=ORDER_PAYLOAD, headers=h)
    r2 = client.post("/orders", json=ORDER_PAYLOAD, headers=h)
    assert r1.status_code == 201
    assert r2.status_code in (200, 201)
    assert r1.json()["donhang_id"] == r2.json()["donhang_id"]
    assert count_orders(db) == 1


def test_idempotency_key_khac_tao_don_moi(client, auth_headers):
    for _ in range(2):
        client.post("/orders", json=ORDER_PAYLOAD,
                    headers={**auth_headers, "Idempotency-Key": str(uuid4())})
    assert count_orders(db) == 2


def test_khong_co_key_van_hoat_dong(client, auth_headers):
    r = client.post("/orders", json=ORDER_PAYLOAD, headers=auth_headers)
    assert r.status_code == 201


def test_idempotency_khong_lo_don_cua_nguoi_khac(client, auth_a, auth_b):
    """Cùng key nhưng user khác → KHÔNG trả đơn của user kia.

    Đây là lỗ hổng bảo mật nếu bỏ user_id khỏi khoá.
    """
    key = str(uuid4())
    r1 = client.post("/orders", json=ORDER_PAYLOAD, headers={**auth_a, "Idempotency-Key": key})
    r2 = client.post("/orders", json=ORDER_PAYLOAD, headers={**auth_b, "Idempotency-Key": key})
    assert r1.json()["donhang_id"] != r2.json()["donhang_id"]
```

Test cuối quan trọng: khoá phải là `(key, user_id)`, không phải `key` một mình. Nếu chỉ dùng `key`, attacker đoán key sẽ đọc được đơn của người khác.

### Câu hỏi cần người quyết định

Lưu ở đâu — bảng riêng, hay Redis? Redis chưa có trong stack (theo `custom_instructions` mục 3: không thêm Redis không có lý do nghiệp vụ). Đề xuất: **bảng `idempotency_key`** với index unique `(key, nguoidung_id)` + cleanup job. Nhưng cần xác nhận trước khi tạo migration.

---

## 4. GET /store/config (P2)

Đưa giờ mở cửa ra khỏi code frontend (`CheckoutPage.tsx:238-239` hardcode `8` và `20`).

```jsonc
{
  "gio_mo_cua": 8,
  "gio_dong_cua": 20,
  "lead_time_hours": 2,
  "timezone": "Asia/Ho_Chi_Minh",
  "khung_gio_giao": [
    { "id": "08-10", "bat_dau": "08:00", "ket_thuc": "10:00" },
    { "id": "10-12", "bat_dau": "10:00", "ket_thuc": "12:00" }
  ]
}
```

Cache được, không cần auth.

---

## 5. GET /products/best-sellers (P1)

`services/productService.ts:20` hiện lấy 3 sản phẩm **đầu tiên trong DB** rồi hiển thị là "Bán chạy nhất". Có comment `// For now`.

Đây là thông tin **sai** hiển thị cho khách.

```
GET /products/best-sellers?limit=8&period_days=30
```

Tính từ dữ liệu đơn hàng thật: `SUM(so_luong) GROUP BY sanpham_id ORDER BY DESC`, chỉ tính đơn đã hoàn tất.

Test: seed 3 sản phẩm với số lượng bán khác nhau → kiểm thứ tự trả về đúng.

**Nếu quyết định không làm endpoint này:** phải đổi tên section ở frontend thành "Sản phẩm mới" hoặc "Gợi ý cho bạn" cho khớp dữ liệu thật. Không được giữ nguyên.

---

## 6. huong_dan_bao_quan (P2)

Thêm field vào `ProductResponse`. Bánh short-shelf-life thì cách bảo quản là thông tin thiết yếu, không phải nice-to-have.

Nếu không muốn nhập từng sản phẩm: dùng chung theo `danh_muc` (bảng riêng hoặc config).

---

## Thứ tự làm

| # | Việc | Ưu tiên | Chặn phase nào |
|---|---|---|---|
| 1 | B1 — FEFO filter lô hết hạn | **P0** | Phase 4 |
| 2 | Idempotency key | P1 | Phase 5 |
| 3 | Endpoint availability + 3 field | P1 | Phase 4 |
| 4 | best-sellers (hoặc đổi tên FE) | P1 | Phase 4 |
| 5 | GET /store/config | P2 | Phase 5 (có workaround: config FE) |
| 6 | huong_dan_bao_quan | P2 | Không chặn |

Làm B1 **trước tiên**, kể cả trước khi bắt đầu phase 0 của frontend. Nó không phụ thuộc gì và đang gây thiệt hại thật mỗi ngày.
