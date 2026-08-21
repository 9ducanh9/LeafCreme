from __future__ import annotations

import sys
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db import SessionLocal, engine
from app.models import (
    BienTheSanPham,
    ChiTietDonHang,
    CongThucHopQua,
    DonHang,
    HopQua,
    HopQuaBOM,
    LichSuKhoHopQua,
    LichSuKhoLinhKien,
    LichSuKhoSanPham,
    LinhKien,
    LoHangHopQua,
    LoHangLinhKien,
    LoHangSanPham,
    NguoiDung,
    PhanBoChiTietDonHang,
    SanPham,
    ThanhToan,
    TonKhoHopQua,
    TonKhoLinhKien,
    TonKhoSanPham,
    VaiTro,
)
from app.services.orders import OrderService

RUN_CODE = datetime.now().strftime("LC_VERIFY_%Y%m%d_%H%M%S_%f")
TEST_PASSWORD = "Verify@12345"


class Verifier:
    def __init__(self) -> None:
        self.failures: list[str] = []

    def check(self, condition: bool, message: str) -> None:
        status = "PASS" if condition else "FAIL"
        print(f"[{status}] {message}")
        if not condition:
            self.failures.append(message)


def require_schema() -> None:
    inspector = inspect(engine)
    required_tables = {
        "phanbolo_chitietdonhang",
        "hopquabom",
        "congthuchopqua",
        "lichsukhosanpham",
        "lichsukholinhkien",
        "lichsukhohopqua",
    }
    missing_tables = sorted(table for table in required_tables if not inspector.has_table(table))
    if missing_tables:
        raise RuntimeError(f"Missing required tables: {', '.join(missing_tables)}")

    if not inspector.has_table("phanbolo_chitietdonhang"):
        raise RuntimeError(
            "Missing table phanbolo_chitietdonhang. Run `alembic upgrade head` first."
        )

    component_ledger_columns = {column["name"] for column in inspector.get_columns("lichsukholinhkien")}
    if "donhang_id" not in component_ledger_columns:
        raise RuntimeError(
            "Missing lichsukholinhkien.donhang_id. Run `alembic upgrade head` first."
        )

    expected_enum_values = {
        "trang_thai_don_hang": {"cho", "dang_xu_ly", "dang_giao", "hoan_thanh", "da_huy", "cho_coc"},
        "loai_don_hang": {"pos", "online", "dat_truoc"},
        "loai_giao_dich_kho": {"nhap_hang", "xuat_ban", "xuat_bom", "tra_hang", "kiem_ke"},
    }
    with engine.connect() as conn:
        for enum_name, expected_values in expected_enum_values.items():
            actual_values = {
                row[0]
                for row in conn.execute(
                    text(
                        """
                        SELECT enumlabel
                        FROM pg_enum e
                        JOIN pg_type t ON t.oid = e.enumtypid
                        WHERE t.typname = :enum_name
                        """
                    ),
                    {"enum_name": enum_name},
                )
            }
            missing_values = sorted(expected_values - actual_values)
            if missing_values:
                raise RuntimeError(
                    f"Enum {enum_name} is missing values required by current services: "
                    f"{', '.join(missing_values)}. Actual DB values: {sorted(actual_values)}"
                )


def order_payload(items: list[dict], voucher_codes: list[str] | None = None) -> SimpleNamespace:
    return SimpleNamespace(
        items=[
            SimpleNamespace(
                bienthe_id=item.get("bienthe_id"),
                hop_qua_id=item.get("hop_qua_id"),
                so_luong=item["so_luong"],
            )
            for item in items
        ],
        phieu_giam_gia_codes=voucher_codes,
        tien_dat_coc=None,
        ten_khach_hang=f"{RUN_CODE} Customer",
        so_dien_thoai_khach=None,
        dia_chi_giao_hang="Inventory reliability verification",
        ngay_giao_du_kien=None,
        ghi_chu=RUN_CODE,
    )


def get_or_create_role(db: Session, name: str) -> VaiTro:
    role = db.query(VaiTro).filter(VaiTro.ten_vai_tro == name).first()
    if role:
        return role

    role = VaiTro(ten_vai_tro=name, mo_ta=f"{RUN_CODE} role")
    db.add(role)
    db.flush()
    return role


def create_user(db: Session, role: VaiTro, username: str, email: str, full_name: str) -> NguoiDung:
    user = NguoiDung(
        ten_dang_nhap=username,
        email=email,
        mat_khau_ma_hoa=get_password_hash(TEST_PASSWORD),
        vaitro_id=role.vaitro_id,
        ho_ten=full_name,
        so_dien_thoai=None,
        dia_chi="Inventory reliability verification",
        dang_hoat_dong=True,
    )
    db.add(user)
    db.flush()
    return user


def seed_data(db: Session) -> dict:
    admin_role = get_or_create_role(db, "admin")
    customer_role = get_or_create_role(db, "customer")
    admin = create_user(
        db,
        admin_role,
        f"{RUN_CODE}_admin",
        f"{RUN_CODE.lower()}_admin@example.test",
        f"{RUN_CODE} Admin",
    )
    customer = create_user(
        db,
        customer_role,
        f"{RUN_CODE}_customer",
        f"{RUN_CODE.lower()}_customer@example.test",
        f"{RUN_CODE} Customer",
    )

    product = SanPham(
        ten=f"{RUN_CODE} FEFO Cake",
        sku=f"{RUN_CODE}_CAKE",
        loai="bien_the",
        gia_co_ban=Decimal("120000"),
        danh_muc="Verification",
        don_vi_tinh="cai",
        dang_hoat_dong=True,
    )
    db.add(product)
    db.flush()

    variant = BienTheSanPham(
        sanpham_id=product.sanpham_id,
        huong_vi="Chocolate",
        kich_thuoc="M",
        gia_bienthe=Decimal("120000"),
        sku_bienthe=f"{RUN_CODE}_CAKE_M",
        muc_gioi_han_ton=1,
        dang_hoat_dong=True,
    )
    db.add(variant)
    db.flush()

    now = datetime.now()
    product_lot_early = LoHangSanPham(
        bienthe_sanpham_id=variant.bienthe_id,
        ma_lo=f"{RUN_CODE}_P_EARLY",
        ngay_het_han=now + timedelta(days=3),
        so_luong=2,
        gia_don_vi=Decimal("60000"),
        trang_thai="hoatdong",
    )
    product_lot_late = LoHangSanPham(
        bienthe_sanpham_id=variant.bienthe_id,
        ma_lo=f"{RUN_CODE}_P_LATE",
        ngay_het_han=now + timedelta(days=14),
        so_luong=6,
        gia_don_vi=Decimal("60000"),
        trang_thai="hoatdong",
    )
    db.add_all([product_lot_early, product_lot_late])
    db.flush()

    db.add_all([
        TonKhoSanPham(lohang_sanpham_id=product_lot_early.lohang_id, so_luong_hien_tai=2, so_luong_da_ban=0),
        TonKhoSanPham(lohang_sanpham_id=product_lot_late.lohang_id, so_luong_hien_tai=6, so_luong_da_ban=0),
    ])

    component = LinhKien(
        ten_linh_kien=f"{RUN_CODE} Ribbon",
        sku=f"{RUN_CODE}_RIBBON",
        don_vi_tinh="cai",
        gia_don_vi=Decimal("5000"),
        dang_hoat_dong=True,
    )
    db.add(component)
    db.flush()

    component_lot = LoHangLinhKien(
        linh_kien_id=component.linh_kien_id,
        ma_lo=f"{RUN_CODE}_C_RIBBON",
        ngay_het_han=now + timedelta(days=180),
        so_luong=10,
        gia_don_vi=Decimal("5000"),
        trang_thai="hoatdong",
    )
    db.add(component_lot)
    db.flush()
    db.add(TonKhoLinhKien(lohang_linhkien_id=component_lot.lohang_id, so_luong_hien_tai=10, so_luong_da_su_dung=0))

    gift_box = HopQua(
        ten_hop_qua=f"{RUN_CODE} Gift Box",
        sku=f"{RUN_CODE}_GIFT",
        gia_ban=Decimal("180000"),
        mo_ta="Inventory reliability verification gift box",
        kich_thuoc="M",
        dang_hoat_dong=True,
    )
    db.add(gift_box)
    db.flush()

    gift_lot = LoHangHopQua(
        hop_qua_id=gift_box.hop_qua_id,
        ma_lo=f"{RUN_CODE}_G_BOX",
        ngay_het_han=now + timedelta(days=60),
        so_luong=3,
        gia_don_vi=Decimal("30000"),
        trang_thai="hoatdong",
    )
    db.add(gift_lot)
    db.flush()
    db.add(TonKhoHopQua(lohang_hopqua_id=gift_lot.lohang_id, so_luong_hien_tai=3, so_luong_da_ban=0))

    db.add_all([
        HopQuaBOM(hop_qua_id=gift_box.hop_qua_id, bienthe_id=variant.bienthe_id, so_luong=1),
        CongThucHopQua(
            hop_qua_id=gift_box.hop_qua_id,
            lohang_linhkien_id=component_lot.lohang_id,
            so_luong_linh_kien=2,
            huong_dan="Use ribbon for gift packaging",
            thu_tu_lap_rap=1,
        ),
    ])

    db.commit()
    return {
        "admin": admin,
        "customer": customer,
        "variant": variant,
        "product_lot_early": product_lot_early,
        "product_lot_late": product_lot_late,
        "gift_box": gift_box,
        "gift_lot": gift_lot,
        "component_lot": component_lot,
    }


def product_stock(db: Session, lot_id: int) -> tuple[int, int]:
    stock = db.query(TonKhoSanPham).filter(TonKhoSanPham.lohang_sanpham_id == lot_id).one()
    return stock.so_luong_hien_tai, stock.so_luong_da_ban


def gift_stock(db: Session, lot_id: int) -> tuple[int, int]:
    stock = db.query(TonKhoHopQua).filter(TonKhoHopQua.lohang_hopqua_id == lot_id).one()
    return stock.so_luong_hien_tai, stock.so_luong_da_ban


def component_stock(db: Session, lot_id: int) -> tuple[int, int]:
    stock = db.query(TonKhoLinhKien).filter(TonKhoLinhKien.lohang_linhkien_id == lot_id).one()
    return stock.so_luong_hien_tai, stock.so_luong_da_su_dung


def snapshot(db: Session, data: dict) -> dict:
    return {
        "product_early": product_stock(db, data["product_lot_early"].lohang_id),
        "product_late": product_stock(db, data["product_lot_late"].lohang_id),
        "gift_box": gift_stock(db, data["gift_lot"].lohang_id),
        "component": component_stock(db, data["component_lot"].lohang_id),
    }


def print_snapshot(title: str, values: dict) -> None:
    print(f"\n--- {title} ---")
    for key, value in values.items():
        print(f"{key}: current={value[0]}, sold_or_used={value[1]}")


def allocations_for_order(db: Session, order_id: int) -> list[PhanBoChiTietDonHang]:
    detail_ids = [
        row[0]
        for row in db.query(ChiTietDonHang.chitiet_id)
        .filter(ChiTietDonHang.donhang_id == order_id)
        .all()
    ]
    if not detail_ids:
        return []
    return (
        db.query(PhanBoChiTietDonHang)
        .filter(PhanBoChiTietDonHang.chitiet_id.in_(detail_ids))
        .order_by(PhanBoChiTietDonHang.phanbo_id)
        .all()
    )


def ledger_for_order(db: Session, order_id: int) -> dict[str, list]:
    return {
        "sanpham": db.query(LichSuKhoSanPham).filter(LichSuKhoSanPham.donhang_id == order_id).all(),
        "hopqua": db.query(LichSuKhoHopQua).filter(LichSuKhoHopQua.donhang_id == order_id).all(),
        "linhkien": db.query(LichSuKhoLinhKien).filter(LichSuKhoLinhKien.donhang_id == order_id).all(),
    }


def print_allocations(db: Session, order_id: int) -> None:
    print(f"\nAllocations for order {order_id}:")
    for row in allocations_for_order(db, order_id):
        print(
            f"  allocation={row.phanbo_id}, type={row.loai_lohang}, "
            f"product_lot={row.lohang_sanpham_id}, gift_lot={row.lohang_hopqua_id}, "
            f"component_lot={row.lohang_linhkien_id}, qty={row.so_luong}"
        )


def print_ledgers(db: Session, order_id: int) -> None:
    print(f"\nLedger rows for order {order_id}:")
    for ledger_type, rows in ledger_for_order(db, order_id).items():
        for row in rows:
            batch_id = getattr(row, f"lohang_{ledger_type}_id")
            print(
                f"  {ledger_type}: ledger={row.lichsu_id}, batch={batch_id}, "
                f"type={row.loai_giao_dich}, qty={row.so_luong}, "
                f"before={row.so_luong_truoc}, after={row.so_luong_sau}, reason={row.ly_do}"
            )


def allocation_quantities(rows: list[PhanBoChiTietDonHang], allocation_type: str, batch_id: int) -> int:
    total = 0
    for row in rows:
        if row.loai_lohang != allocation_type:
            continue
        if allocation_type == "sanpham" and row.lohang_sanpham_id == batch_id:
            total += row.so_luong
        if allocation_type == "hopqua" and row.lohang_hopqua_id == batch_id:
            total += row.so_luong
        if allocation_type == "linhkien" and row.lohang_linhkien_id == batch_id:
            total += row.so_luong
    return total


def has_ledger_pair(rows: list, batch_field: str, batch_id: int) -> bool:
    deduct = any(getattr(row, batch_field) == batch_id and row.loai_giao_dich in {"xuat_ban", "xuat_bom"} for row in rows)
    restore = any(getattr(row, batch_field) == batch_id and row.loai_giao_dich == "tra_hang" for row in rows)
    return deduct and restore


def run_product_single_flow(db: Session, service: OrderService, data: dict, verifier: Verifier) -> None:
    before = snapshot(db, data)
    print_snapshot("Product single-order before", before)

    order = service.create_order(
        db,
        order_payload([{"bienthe_id": data["variant"].bienthe_id, "so_luong": 1}]),
        "pos",
        data["admin"],
    )
    order_id = order["donhang_id"]
    after_create = snapshot(db, data)
    print_snapshot("Product single-order after create", after_create)

    early_id = data["product_lot_early"].lohang_id
    allocations = allocations_for_order(db, order_id)
    verifier.check(after_create["product_early"] == (before["product_early"][0] - 1, before["product_early"][1] + 1), "Product order deducted earliest batch first")
    verifier.check(after_create["product_late"] == before["product_late"], "Product order did not deduct later batch when earliest had enough stock")
    verifier.check(allocation_quantities(allocations, "sanpham", early_id) == 1, "Product order created allocation rows")

    service.cancel_order(db, order_id, "verify product cancellation", data["admin"])
    after_cancel = snapshot(db, data)
    print_snapshot("Product single-order after cancel", after_cancel)
    verifier.check(after_cancel["product_early"] == before["product_early"], "Product cancellation restored exact batch")

    product_ledgers = ledger_for_order(db, order_id)["sanpham"]
    verifier.check(has_ledger_pair(product_ledgers, "lohang_sanpham_id", early_id), "Product ledger rows created for deduction and restoration")
    print_allocations(db, order_id)
    print_ledgers(db, order_id)


def run_product_multibatch_flow(db: Session, service: OrderService, data: dict, verifier: Verifier) -> None:
    before = snapshot(db, data)
    print_snapshot("Product multi-batch before", before)

    order = service.create_order(
        db,
        order_payload([{"bienthe_id": data["variant"].bienthe_id, "so_luong": 4}]),
        "pos",
        data["admin"],
    )
    order_id = order["donhang_id"]
    after_create = snapshot(db, data)
    print_snapshot("Product multi-batch after create", after_create)

    early_id = data["product_lot_early"].lohang_id
    late_id = data["product_lot_late"].lohang_id
    allocations = allocations_for_order(db, order_id)
    verifier.check(after_create["product_early"] == (0, before["product_early"][1] + 2), "Multi-batch FEFO exhausted earliest batch first")
    verifier.check(after_create["product_late"] == (before["product_late"][0] - 2, before["product_late"][1] + 2), "Multi-batch FEFO spilled into next batch")
    verifier.check(
        allocation_quantities(allocations, "sanpham", early_id) == 2
        and allocation_quantities(allocations, "sanpham", late_id) == 2,
        "Multi-batch FEFO allocation split correctly",
    )

    service.cancel_order(db, order_id, "verify multi-batch cancellation", data["admin"])
    after_cancel = snapshot(db, data)
    print_snapshot("Product multi-batch after cancel", after_cancel)
    verifier.check(after_cancel["product_early"] == before["product_early"] and after_cancel["product_late"] == before["product_late"], "Multi-batch cancellation restored exact batches")
    print_allocations(db, order_id)
    print_ledgers(db, order_id)


def run_gift_box_flow(db: Session, service: OrderService, data: dict, verifier: Verifier) -> None:
    before = snapshot(db, data)
    print_snapshot("Gift box before", before)

    order = service.create_order(
        db,
        order_payload([{"hop_qua_id": data["gift_box"].hop_qua_id, "so_luong": 1}]),
        "pos",
        data["admin"],
    )
    order_id = order["donhang_id"]
    after_create = snapshot(db, data)
    print_snapshot("Gift box after create", after_create)

    early_id = data["product_lot_early"].lohang_id
    gift_lot_id = data["gift_lot"].lohang_id
    component_lot_id = data["component_lot"].lohang_id
    allocations = allocations_for_order(db, order_id)

    verifier.check(after_create["product_early"] == (before["product_early"][0] - 1, before["product_early"][1] + 1), "Gift box deducted product BOM stock")
    verifier.check(after_create["gift_box"] == (before["gift_box"][0] - 1, before["gift_box"][1] + 1), "Gift box deducted physical gift box stock")
    verifier.check(after_create["component"] == (before["component"][0] - 2, before["component"][1] + 2), "Gift box deducted component stock")
    verifier.check(allocation_quantities(allocations, "sanpham", early_id) == 1, "Gift box product BOM allocation row exists")
    verifier.check(allocation_quantities(allocations, "hopqua", gift_lot_id) == 1, "Gift box physical allocation row exists")
    verifier.check(allocation_quantities(allocations, "linhkien", component_lot_id) == 2, "Gift box component allocation row exists")

    service.cancel_order(db, order_id, "verify gift box cancellation", data["admin"])
    after_cancel = snapshot(db, data)
    print_snapshot("Gift box after cancel", after_cancel)
    verifier.check(after_cancel == before, "Gift box cancellation restored all stock")

    ledgers = ledger_for_order(db, order_id)
    verifier.check(has_ledger_pair(ledgers["sanpham"], "lohang_sanpham_id", early_id), "Gift box product ledger rows created")
    verifier.check(has_ledger_pair(ledgers["hopqua"], "lohang_hopqua_id", gift_lot_id), "Gift box physical ledger rows created")
    verifier.check(has_ledger_pair(ledgers["linhkien"], "lohang_linhkien_id", component_lot_id), "Gift box component ledger rows created")
    print_allocations(db, order_id)
    print_ledgers(db, order_id)


def run_payment_failure_flow(db: Session, service: OrderService, data: dict, verifier: Verifier) -> None:
    before = snapshot(db, data)
    print_snapshot("Payment failure before", before)

    order = service.create_order(
        db,
        order_payload([{"bienthe_id": data["variant"].bienthe_id, "so_luong": 1}]),
        "online",
        data["customer"],
    )
    order_id = order["donhang_id"]
    db.add(ThanhToan(
        donhang_id=order_id,
        phuong_thuc="vi_dien_tu",
        so_tien=order["tien_thanh_toan"],
        trang_thai="that_bai",
        ma_giao_dich=f"{RUN_CODE}_PAY_FAIL_{order_id}",
    ))
    service.fail_unpaid_order(db, order_id, "verify payment failure")
    db.commit()

    after_failure = snapshot(db, data)
    print_snapshot("Payment failure after restore", after_failure)
    failed_order = db.query(DonHang).filter(DonHang.donhang_id == order_id).one()
    verifier.check(failed_order.trang_thai == "da_huy", "Payment failure marked unpaid order as cancelled")
    verifier.check(after_failure == before, "Payment failure restored inventory exactly")

    early_id = data["product_lot_early"].lohang_id
    ledgers = ledger_for_order(db, order_id)["sanpham"]
    verifier.check(has_ledger_pair(ledgers, "lohang_sanpham_id", early_id), "Payment failure created deduction/restoration ledger rows")
    print_allocations(db, order_id)
    print_ledgers(db, order_id)


def main() -> int:
    require_schema()
    verifier = Verifier()
    service = OrderService()

    db = SessionLocal()
    try:
        data = seed_data(db)
        print(f"Seed run code: {RUN_CODE}")
        print(f"Admin login: {data['admin'].email} / {TEST_PASSWORD}")
        print(f"Customer login: {data['customer'].email} / {TEST_PASSWORD}")
        print(f"Variant ID: {data['variant'].bienthe_id}")
        print(f"Product lots: early={data['product_lot_early'].lohang_id}, late={data['product_lot_late'].lohang_id}")
        print(f"Gift box ID: {data['gift_box'].hop_qua_id}, gift lot={data['gift_lot'].lohang_id}")
        print(f"Component lot: {data['component_lot'].lohang_id}")

        run_product_single_flow(db, service, data, verifier)
        run_product_multibatch_flow(db, service, data, verifier)
        run_gift_box_flow(db, service, data, verifier)
        run_payment_failure_flow(db, service, data, verifier)

        if verifier.failures:
            print("\nFAILED ASSERTIONS:")
            for failure in verifier.failures:
                print(f"- {failure}")
            return 1

        print("\nAll inventory reliability checks passed.")
        return 0
    except Exception as exc:
        db.rollback()
        print(f"[FAIL] Verification script crashed: {exc}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
