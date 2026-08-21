"""
Tests for app.services.orders.OrderService — Phase 1 service-layer
migration, plus the three orders-domain audit fixes from
docs/specs/02-orders.md:

  1. delete_order now trusts the DB's own RESTRICT rule on the inventory
     ledger instead of manually clearing it first (Finding #4).
  2. Multi-voucher stacking is clamped so tien_thanh_toan can't go
     negative (Finding #1).
  3. update_order_status rejects transitions out of a terminal status
     (Finding #3).
"""

from datetime import timedelta
from decimal import Decimal

import pytest

from app.core.time import utc_now
from app.models import (
    BienTheSanPham,
    ChiTietDonHang,
    DonHang,
    HopQua,
    LichSuKhoSanPham,
    LoHangSanPham,
    NguoiDung,
    PhieuGiamGia,
    SanPham,
    TonKhoSanPham,
    VaiTro,
)
from app.services.orders import DomainError, OrderService


@pytest.fixture()
def service() -> OrderService:
    return OrderService()


@pytest.fixture()
def role_customer(db_session):
    role = VaiTro(ten_vai_tro="customer_test")
    db_session.add(role)
    db_session.flush()
    return role


@pytest.fixture()
def role_admin(db_session):
    role = VaiTro(ten_vai_tro="admin")
    db_session.add(role)
    db_session.flush()
    return role


@pytest.fixture()
def role_staff(db_session):
    role = VaiTro(ten_vai_tro="staff")
    db_session.add(role)
    db_session.flush()
    return role


def _make_user(db_session, role, suffix: str) -> NguoiDung:
    user = NguoiDung(
        ten_dang_nhap=f"user_{suffix}",
        email=f"user_{suffix}@example.com",
        mat_khau_ma_hoa="hashed",
        vaitro_id=role.vaitro_id,
        ho_ten=f"Test User {suffix}",
    )
    db_session.add(user)
    db_session.flush()
    return user


def _make_order(db_session, owner, tien_thanh_toan: Decimal, suffix: str, trang_thai: str = "cho") -> DonHang:
    order = DonHang(
        ma_don_hang=f"ORD-TEST-{suffix}",
        nguoidung_id=owner.nguoidung_id if owner else None,
        loai_don="online",
        tong_tien=tien_thanh_toan,
        tien_thanh_toan=tien_thanh_toan,
        trang_thai=trang_thai,
    )
    db_session.add(order)
    db_session.flush()
    return order


def _make_variant_with_stock(db_session, suffix: str, so_luong: int = 100, gia: Decimal = Decimal("100000")):
    product = SanPham(ten=f"SP {suffix}", sku=f"SP-ORD-{suffix}", gia_co_ban=gia)
    db_session.add(product)
    db_session.flush()
    variant = BienTheSanPham(sanpham_id=product.sanpham_id, huong_vi="Socola", gia_bienthe=gia)
    db_session.add(variant)
    db_session.flush()
    batch = LoHangSanPham(
        bienthe_sanpham_id=variant.bienthe_id,
        ma_lo=f"LOT-ORD-{suffix}",
        ngay_het_han=utc_now() + timedelta(days=30),
        so_luong=so_luong,
        gia_don_vi=gia,
        trang_thai="hoatdong",
    )
    db_session.add(batch)
    db_session.flush()
    stock = TonKhoSanPham(lohang_sanpham_id=batch.lohang_id, so_luong_hien_tai=so_luong)
    db_session.add(stock)
    db_session.flush()
    return variant, batch


def _make_voucher(db_session, code: str, gia_tri_giam: Decimal) -> PhieuGiamGia:
    voucher = PhieuGiamGia(
        ma_phieu=code,
        ten_phieu=f"Voucher {code}",
        loai_giam="sotien",
        gia_tri_giam=gia_tri_giam,
        tong_tien_toi_thieu=Decimal("0"),
        ngay_bat_dau=utc_now() - timedelta(days=1),
        ngay_het_han=utc_now() + timedelta(days=30),
        gioi_han_su_dung=10,
        dang_hoat_dong=True,
    )
    db_session.add(voucher)
    db_session.flush()
    return voucher


class _OrderItem:
    def __init__(self, bienthe_id=None, hop_qua_id=None, so_luong=1):
        self.bienthe_id = bienthe_id
        self.hop_qua_id = hop_qua_id
        self.so_luong = so_luong


class _CreateOrderPayload:
    def __init__(self, items, phieu_giam_gia_codes=None):
        self.items = items
        self.phieu_giam_gia_codes = phieu_giam_gia_codes or []
        self.tien_dat_coc = None
        self.ten_khach_hang = None
        self.so_dien_thoai_khach = None
        self.dia_chi_giao_hang = None
        self.ngay_giao_du_kien = None
        self.ghi_chu = None


class TestVoucherStackingClamp:
    def test_stacked_vouchers_cannot_push_payment_negative(self, db_session, service, role_customer):
        customer = _make_user(db_session, role_customer, "voucher-stack")
        variant, _ = _make_variant_with_stock(db_session, "stack1", gia=Decimal("100000"))

        # Order total will be 100,000. Two fixed-amount vouchers of 80,000
        # each pass the per-voucher cap (each is individually < order
        # total) but together total 160,000 — more than the order is worth.
        _make_voucher(db_session, "STACK-A", Decimal("80000"))
        _make_voucher(db_session, "STACK-B", Decimal("80000"))

        payload = _CreateOrderPayload(
            items=[_OrderItem(bienthe_id=variant.bienthe_id, so_luong=1)],
            phieu_giam_gia_codes=["STACK-A", "STACK-B"],
        )
        result = service.create_order(db_session, payload, "online", customer)

        assert result["tong_tien"] == Decimal("100000")
        assert result["tien_giam_gia"] == Decimal("160000")
        # This is the fix: previously this could go negative.
        assert result["tien_thanh_toan"] == Decimal("0")
        assert result["tien_thanh_toan"] >= 0


class TestCreateOrderAuthorization:
    def test_customer_cannot_create_pos_or_change_inventory(self, db_session, service, role_customer):
        customer = _make_user(db_session, role_customer, "pos-customer")
        variant, batch = _make_variant_with_stock(db_session, "pos-customer", so_luong=10)
        payload = _CreateOrderPayload([_OrderItem(bienthe_id=variant.bienthe_id)])
        before_orders = db_session.query(DonHang).count()
        before_ledger = db_session.query(LichSuKhoSanPham).count()
        before_stock = db_session.query(TonKhoSanPham).filter(TonKhoSanPham.lohang_sanpham_id == batch.lohang_id).one().so_luong_hien_tai

        with pytest.raises(DomainError) as exc_info:
            service.create_order(db_session, payload, "pos", customer)

        assert exc_info.value.status_code == 403
        assert db_session.query(DonHang).count() == before_orders
        assert db_session.query(LichSuKhoSanPham).count() == before_ledger
        stock = db_session.query(TonKhoSanPham).filter(TonKhoSanPham.lohang_sanpham_id == batch.lohang_id).one()
        assert stock.so_luong_hien_tai == before_stock


class TestOrderReadScopingAndAmountFilters:
    def test_staff_sees_only_own_pos_and_own_online_orders(self, db_session, service, role_staff):
        staff_a = _make_user(db_session, role_staff, "scope-staff-a")
        staff_b = _make_user(db_session, role_staff, "scope-staff-b")
        pos_a = DonHang(
            ma_don_hang="ORD-SCOPE-POS-A",
            loai_don="pos",
            nhan_vien_tao=staff_a.nguoidung_id,
            tong_tien=Decimal("100000"),
            tien_thanh_toan=Decimal("100000"),
            trang_thai="cho",
        )
        online_a = DonHang(
            ma_don_hang="ORD-SCOPE-ONLINE-A",
            loai_don="online",
            nguoidung_id=staff_a.nguoidung_id,
            tong_tien=Decimal("200000"),
            tien_thanh_toan=Decimal("200000"),
            trang_thai="cho",
        )
        pos_b = DonHang(
            ma_don_hang="ORD-SCOPE-POS-B",
            loai_don="pos",
            nhan_vien_tao=staff_b.nguoidung_id,
            tong_tien=Decimal("300000"),
            tien_thanh_toan=Decimal("300000"),
            trang_thai="cho",
        )
        db_session.add_all([pos_a, online_a, pos_b])
        db_session.flush()

        page = service.list_orders(db_session, staff_a, paginated=True, limit=50)

        assert page["total"] == 2
        assert {order.donhang_id for order in page["items"]} == {pos_a.donhang_id, online_a.donhang_id}
        with pytest.raises(DomainError) as exc_info:
            service.get_order(db_session, pos_a.donhang_id, staff_b)
        assert exc_info.value.status_code == 403

    def test_management_amount_filters_are_applied_before_count(self, db_session, service, role_admin):
        admin = _make_user(db_session, role_admin, "amount-admin")
        for index, amount in enumerate((Decimal("100000"), Decimal("500000"), Decimal("900000")), start=1):
            db_session.add(
                DonHang(
                    ma_don_hang=f"ORD-AMOUNT-{index}",
                    loai_don="online",
                    tong_tien=amount,
                    tien_thanh_toan=amount,
                    trang_thai="cho",
                )
            )
        db_session.flush()

        page = service.list_orders(
            db_session,
            admin,
            paginated=True,
            tien_tu=Decimal("500000"),
            tien_den=Decimal("900000"),
        )

        assert page["total"] == 2
        assert {order.tien_thanh_toan for order in page["items"]} == {Decimal("500000"), Decimal("900000")}

    def test_rejects_reversed_amount_range(self, db_session, service, role_admin):
        admin = _make_user(db_session, role_admin, "amount-reversed")
        with pytest.raises(DomainError) as exc_info:
            service.list_orders(db_session, admin, paginated=True, tien_tu=Decimal("900000"), tien_den=Decimal("500000"))
        assert exc_info.value.status_code == 400

    def test_staff_can_create_pos_and_inventory_is_allocated(self, db_session, service, role_staff):
        staff = _make_user(db_session, role_staff, "pos-staff")
        variant, batch = _make_variant_with_stock(db_session, "pos-staff", so_luong=10)
        result = service.create_order(db_session, _CreateOrderPayload([_OrderItem(bienthe_id=variant.bienthe_id)]), "pos", staff)

        assert result["trang_thai"] == "dang_xu_ly"
        assert result["nhan_vien_tao"] == staff.nguoidung_id
        stock = db_session.query(TonKhoSanPham).filter(TonKhoSanPham.lohang_sanpham_id == batch.lohang_id).one()
        assert stock.so_luong_hien_tai == 9

    def test_online_order_belongs_to_customer_and_has_no_staff_creator(self, db_session, service, role_customer):
        customer = _make_user(db_session, role_customer, "online-customer")
        variant, _ = _make_variant_with_stock(db_session, "online-customer", so_luong=10)
        result = service.create_order(db_session, _CreateOrderPayload([_OrderItem(bienthe_id=variant.bienthe_id)]), "online", customer)

        assert result["nguoidung_id"] == customer.nguoidung_id
        assert result["nhan_vien_tao"] is None
        assert result["trang_thai"] == "dang_xu_ly"


class TestStatusTransitionGuard:
    def test_cannot_leave_terminal_status_via_generic_endpoint(self, db_session, service, role_admin):
        admin = _make_user(db_session, role_admin, "status-admin")
        order = _make_order(db_session, admin, Decimal("50000"), "terminal-guard", trang_thai="da_huy")

        class Payload:
            trang_thai = "hoan_thanh"
            ghi_chu = None

        with pytest.raises(DomainError) as exc_info:
            service.update_order_status(db_session, order.donhang_id, admin, payload=Payload())
        assert exc_info.value.status_code == 400

        db_session.refresh(order)
        assert order.trang_thai == "da_huy"

    def test_non_terminal_transition_still_works(self, db_session, service, role_admin):
        admin = _make_user(db_session, role_admin, "status-admin2")
        order = _make_order(db_session, admin, Decimal("50000"), "non-terminal", trang_thai="dang_xu_ly")

        class Payload:
            trang_thai = "dang_giao"
            ghi_chu = None

        service.update_order_status(db_session, order.donhang_id, admin, payload=Payload())
        db_session.refresh(order)
        assert order.trang_thai == "dang_giao"


class TestGetOrderItemProductNames:
    """OrderItemResponse used to have nothing but raw batch/gift-box IDs —
    the order confirmation and order detail storefront pages had no name
    to show a customer for what they'd just bought. See UI/UX audit
    follow-up, Finding #4."""

    def test_resolves_product_variant_name_from_batch(self, db_session, service, role_admin):
        admin = _make_user(db_session, role_admin, "names-variant")
        order = _make_order(db_session, admin, Decimal("100000"), "names-variant")
        variant, batch = _make_variant_with_stock(db_session, "namesvar", gia=Decimal("100000"))

        detail = ChiTietDonHang(
            donhang_id=order.donhang_id,
            lohang_sanpham_id=batch.lohang_id,
            so_luong=1,
            gia_don_vi=Decimal("100000"),
            tong_tien_phu=Decimal("100000"),
        )
        db_session.add(detail)
        db_session.commit()

        result = service.get_order(db_session, order.donhang_id, admin)

        assert len(result["items"]) == 1
        assert result["items"][0]["product_name"].startswith("SP namesvar")

    def test_resolves_gift_box_name_for_direct_line(self, db_session, service, role_admin):
        admin = _make_user(db_session, role_admin, "names-giftbox")
        order = _make_order(db_session, admin, Decimal("150000"), "names-giftbox")
        gift_box = HopQua(ten_hop_qua="Hộp Trung Thu", sku="GB-NAMES-1", gia_ban=Decimal("150000"))
        db_session.add(gift_box)
        db_session.flush()

        detail = ChiTietDonHang(
            donhang_id=order.donhang_id,
            hop_qua_id=gift_box.hop_qua_id,
            so_luong=1,
            gia_don_vi=Decimal("150000"),
            tong_tien_phu=Decimal("150000"),
        )
        db_session.add(detail)
        db_session.commit()

        result = service.get_order(db_session, order.donhang_id, admin)

        assert result["items"][0]["product_name"] == "Hộp Trung Thu"

    def test_falls_back_gracefully_when_nothing_resolves(self, db_session, service, role_admin):
        admin = _make_user(db_session, role_admin, "names-orphan")
        order = _make_order(db_session, admin, Decimal("10000"), "names-orphan")

        # A line item with no batch/gift-box reference at all (shouldn't
        # happen via create_order, but the resolver must not blow up on it).
        detail = ChiTietDonHang(
            donhang_id=order.donhang_id,
            so_luong=1,
            gia_don_vi=Decimal("10000"),
            tong_tien_phu=Decimal("10000"),
        )
        db_session.add(detail)
        db_session.commit()

        result = service.get_order(db_session, order.donhang_id, admin)

        assert result["items"][0]["product_name"] == "Sản phẩm không xác định"


class TestDeleteOrder:
    def test_deletes_order_with_no_ledger_history(self, db_session, service, role_customer):
        customer = _make_user(db_session, role_customer, "delete-clean")
        order = _make_order(db_session, customer, Decimal("50000"), "delete-clean")

        service.delete_order(db_session, order.donhang_id)

        gone = db_session.query(DonHang).filter(DonHang.donhang_id == order.donhang_id).first()
        assert gone is None

    def test_blocks_delete_when_inventory_ledger_references_order(self, db_session, service, role_customer):
        customer = _make_user(db_session, role_customer, "delete-blocked")
        order = _make_order(db_session, customer, Decimal("50000"), "delete-blocked")
        _, batch = _make_variant_with_stock(db_session, "delblock")

        ledger_entry = LichSuKhoSanPham(
            lohang_sanpham_id=batch.lohang_id,
            loai_giao_dich="xuat_ban",
            so_luong=1,
            so_luong_truoc=100,
            so_luong_sau=99,
            donhang_id=order.donhang_id,
        )
        db_session.add(ledger_entry)
        db_session.commit()

        with pytest.raises(DomainError) as exc_info:
            service.delete_order(db_session, order.donhang_id)
        assert exc_info.value.status_code == 400

        still_there = db_session.query(DonHang).filter(DonHang.donhang_id == order.donhang_id).first()
        assert still_there is not None

    def test_not_found_raises_404(self, db_session, service):
        with pytest.raises(DomainError) as exc_info:
            service.delete_order(db_session, 999999)
        assert exc_info.value.status_code == 404
