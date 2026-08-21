"""Conditionally remove rows emitted by the demo/test seed scripts.

Default mode is a read-only dry run. ``--apply`` performs one transaction:
rows with order/ledger references are disabled, while unreferenced demo rows
are hard-deleted. Foreign keys remain the final guard against orphan rows.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import or_, update

from app.db import SessionLocal
from app.models import (
    AgentAction,
    BienTheSanPham,
    CanhBaoTonKho,
    ChiTietDonHang,
    ChiTietGioHang,
    CongThucHopQua,
    DanhGiaSanPham,
    DonHang,
    DonHangPhieuGiamGia,
    DoiTra,
    GioHang,
    HopQua,
    HopQuaBOM,
    LichSuGia,
    LichSuKhoHopQua,
    LichSuKhoLinhKien,
    LichSuKhoSanPham,
    LinhKien,
    LoHangHopQua,
    LoHangLinhKien,
    LoHangSanPham,
    NguoiDung,
    PhieuGiamGia,
    PhanBoChiTietDonHang,
    SanPham,
    SystemLog,
    ThongKeSanPham,
    TonKhoHopQua,
    TonKhoLinhKien,
    TonKhoSanPham,
)
from scripts.demo_markers import (
    DEMO_COMPONENT_LOT_CODES,
    DEMO_COMPONENT_SKUS,
    DEMO_EMAILS,
    DEMO_GIFT_BOX_IDS,
    DEMO_GIFT_BOX_SKUS,
    DEMO_PRODUCT_LOT_CODES,
    DEMO_PRODUCT_SKUS,
    DEMO_USERNAMES,
    DEMO_VARIANT_SKUS,
    DEMO_VOUCHER_CODES,
)
from scripts.seed_guard import require_seed_environment


def _ids(db) -> dict[str, list[int]]:
    users = db.query(NguoiDung).filter(or_(NguoiDung.ten_dang_nhap.in_(DEMO_USERNAMES), NguoiDung.email.in_(DEMO_EMAILS))).all()
    products = db.query(SanPham).filter(SanPham.sku.in_(DEMO_PRODUCT_SKUS)).all()
    product_ids = [row.sanpham_id for row in products]
    variants = db.query(BienTheSanPham).filter(or_(BienTheSanPham.sanpham_id.in_(product_ids), BienTheSanPham.sku_bienthe.in_(DEMO_VARIANT_SKUS))).all() if product_ids else db.query(BienTheSanPham).filter(BienTheSanPham.sku_bienthe.in_(DEMO_VARIANT_SKUS)).all()
    variant_ids = [row.bienthe_id for row in variants]
    product_lots = db.query(LoHangSanPham).filter(or_(LoHangSanPham.bienthe_sanpham_id.in_(variant_ids), LoHangSanPham.ma_lo.in_(DEMO_PRODUCT_LOT_CODES))).all() if variant_ids else db.query(LoHangSanPham).filter(LoHangSanPham.ma_lo.in_(DEMO_PRODUCT_LOT_CODES)).all()
    component_lots = db.query(LoHangLinhKien).filter(LoHangLinhKien.ma_lo.in_(DEMO_COMPONENT_LOT_CODES)).all()
    components = db.query(LinhKien).filter(or_(LinhKien.sku.in_(DEMO_COMPONENT_SKUS), LinhKien.linh_kien_id.in_([row.linh_kien_id for row in component_lots]))).all()
    component_ids = [row.linh_kien_id for row in components]
    # Include every lot owned by a marker component. Deleting a component
    # must never cascade into an unmarked, possibly real, lot.
    component_lots = db.query(LoHangLinhKien).filter(
        or_(LoHangLinhKien.ma_lo.in_(DEMO_COMPONENT_LOT_CODES), LoHangLinhKien.linh_kien_id.in_(component_ids))
    ).all()
    gift_boxes = db.query(HopQua).filter(or_(HopQua.sku.in_(DEMO_GIFT_BOX_SKUS), HopQua.hop_qua_id.in_(DEMO_GIFT_BOX_IDS))).all()
    gift_box_ids = [row.hop_qua_id for row in gift_boxes]
    gift_box_lots = db.query(LoHangHopQua).filter(LoHangHopQua.hop_qua_id.in_(gift_box_ids)).all() if gift_box_ids else []
    vouchers = db.query(PhieuGiamGia).filter(PhieuGiamGia.ma_phieu.in_(DEMO_VOUCHER_CODES)).all()
    return {
        "user": [row.nguoidung_id for row in users],
        "product": product_ids,
        "variant": variant_ids,
        "product_lot": [row.lohang_id for row in product_lots],
        "component": [row.linh_kien_id for row in components],
        "component_lot": [row.lohang_id for row in component_lots],
        "gift_box": gift_box_ids,
        "gift_box_lot": [row.lohang_id for row in gift_box_lots],
        "voucher": [row.phieugiam_id for row in vouchers],
    }


def _count(query) -> int:
    return int(query.count())


def _product_connected(db, lot_ids: list[int]) -> bool:
    if not lot_ids:
        return False
    return any((
        _count(db.query(ChiTietDonHang).filter(ChiTietDonHang.lohang_sanpham_id.in_(lot_ids))),
        _count(db.query(PhanBoChiTietDonHang).filter(PhanBoChiTietDonHang.lohang_sanpham_id.in_(lot_ids))),
        _count(db.query(ChiTietGioHang).filter(ChiTietGioHang.lohang_sanpham_id.in_(lot_ids))),
        _count(db.query(LichSuKhoSanPham).filter(LichSuKhoSanPham.lohang_sanpham_id.in_(lot_ids))),
        _count(db.query(CanhBaoTonKho).filter(CanhBaoTonKho.lohang_sanpham_id.in_(lot_ids))),
    ))


def _component_connected(db, component_lot_ids: list[int], component_ids: list[int]) -> bool:
    if not component_lot_ids and not component_ids:
        return False
    counts = []
    if component_lot_ids:
        counts.extend(
            (
                _count(db.query(LichSuKhoLinhKien).filter(LichSuKhoLinhKien.lohang_linhkien_id.in_(component_lot_ids))),
                _count(db.query(CongThucHopQua).filter(CongThucHopQua.lohang_linhkien_id.in_(component_lot_ids))),
            )
        )
    if component_ids:
        counts.append(_count(db.query(LoHangLinhKien).filter(LoHangLinhKien.linh_kien_id.in_(component_ids))))
    return any(counts)


def _gift_box_connected(db, lot_ids: list[int], gift_box_ids: list[int]) -> bool:
    return any((
        _count(db.query(ChiTietDonHang).filter(or_(ChiTietDonHang.hop_qua_id.in_(gift_box_ids), ChiTietDonHang.lohang_hopqua_id.in_(lot_ids)))) if gift_box_ids else 0,
        _count(db.query(ChiTietGioHang).filter(ChiTietGioHang.lohang_hopqua_id.in_(lot_ids))) if lot_ids else 0,
        _count(db.query(LichSuKhoHopQua).filter(LichSuKhoHopQua.lohang_hopqua_id.in_(lot_ids))) if lot_ids else 0,
        _count(db.query(CanhBaoTonKho).filter(CanhBaoTonKho.lohang_hopqua_id.in_(lot_ids))) if lot_ids else 0,
    ))


def _user_connected(db, user_id: int) -> bool:
    return any((
        _count(db.query(DonHang).filter(or_(DonHang.nguoidung_id == user_id, DonHang.nhan_vien_tao == user_id))),
        _count(db.query(DoiTra).filter(DoiTra.nhan_vien_xu_ly == user_id)),
        _count(db.query(GioHang).filter(GioHang.nguoidung_id == user_id)),
        _count(db.query(LichSuKhoSanPham).filter(LichSuKhoSanPham.nguoidung_id == user_id)),
        _count(db.query(LichSuKhoLinhKien).filter(LichSuKhoLinhKien.nguoidung_id == user_id)),
        _count(db.query(LichSuKhoHopQua).filter(LichSuKhoHopQua.nguoidung_id == user_id)),
        _count(db.query(CanhBaoTonKho).filter(CanhBaoTonKho.nguoi_xu_ly == user_id)),
        _count(db.query(LichSuGia).filter(LichSuGia.nguoi_thay_doi == user_id)),
        _count(db.query(DanhGiaSanPham).filter(or_(DanhGiaSanPham.nguoidung_id == user_id, DanhGiaSanPham.nguoi_duyet == user_id))),
        _count(db.query(AgentAction).filter(or_(AgentAction.nguoidung_de_xuat_id == user_id, AgentAction.nguoidung_duyet_id == user_id, AgentAction.nguoidung_reset_id == user_id))),
        _count(db.query(SystemLog).filter(SystemLog.nguoi_dung_id == user_id)),
    ))


def _print_plan(db, ids: dict[str, list[int]]) -> dict[str, int]:
    product_lots = ids["product_lot"]
    component_lots = ids["component_lot"]
    gift_box_lots = ids["gift_box_lot"]
    product_connected = _product_connected(db, product_lots)
    component_connected = _component_connected(db, component_lots, ids["component"])
    gift_box_connected = _gift_box_connected(db, gift_box_lots, ids["gift_box"])
    user_connection = {user_id: _user_connected(db, user_id) for user_id in ids["user"]}
    plan = {
        "users_soft_delete": sum(user_connection.values()),
        "users_hard_delete": sum(not connected for connected in user_connection.values()),
        "products_soft_delete": len(ids["product"]) if product_connected else 0,
        "products_hard_delete": len(ids["product"]) if not product_connected else 0,
        "components_soft_delete": len(ids["component"]) if component_connected else 0,
        "components_hard_delete": len(ids["component"]) if not component_connected else 0,
        "gift_boxes_soft_delete": len(ids["gift_box"]) if gift_box_connected else 0,
        "gift_boxes_hard_delete": len(ids["gift_box"]) if not gift_box_connected else 0,
        "vouchers_referenced": _count(db.query(DonHangPhieuGiamGia).filter(DonHangPhieuGiamGia.phieugiam_id.in_(ids["voucher"]))) if ids["voucher"] else 0,
    }
    print("Cleanup plan (read-only):")
    for name, value in plan.items():
        print(f"  {name}: {value}")
    return plan


def _soft_delete_product_rows(db, ids: dict[str, list[int]]) -> None:
    db.execute(update(SanPham).where(SanPham.sanpham_id.in_(ids["product"])).values(dang_hoat_dong=False))
    db.execute(update(BienTheSanPham).where(BienTheSanPham.bienthe_id.in_(ids["variant"])).values(dang_hoat_dong=False))
    db.execute(update(LoHangSanPham).where(LoHangSanPham.lohang_id.in_(ids["product_lot"])).values(trang_thai="tamdung"))


def _hard_delete_product_rows(db, ids: dict[str, list[int]]) -> None:
    if ids["product"]:
        db.query(LichSuGia).filter(or_(LichSuGia.sanpham_id.in_(ids["product"]), LichSuGia.bienthe_id.in_(ids["variant"]))).delete(synchronize_session=False)
        db.query(ThongKeSanPham).filter(or_(ThongKeSanPham.sanpham_id.in_(ids["product"]), ThongKeSanPham.bienthe_id.in_(ids["variant"]))).delete(synchronize_session=False)
        db.query(SanPham).filter(SanPham.sanpham_id.in_(ids["product"])).delete(synchronize_session=False)


def _soft_delete_component_rows(db, ids: dict[str, list[int]]) -> None:
    db.execute(update(LinhKien).where(LinhKien.linh_kien_id.in_(ids["component"])).values(dang_hoat_dong=False))
    db.execute(update(LoHangLinhKien).where(LoHangLinhKien.lohang_id.in_(ids["component_lot"])).values(trang_thai="tamdung"))


def _hard_delete_component_rows(db, ids: dict[str, list[int]]) -> None:
    if ids["component"]:
        db.query(LinhKien).filter(LinhKien.linh_kien_id.in_(ids["component"])).delete(synchronize_session=False)


def _soft_delete_gift_box_rows(db, ids: dict[str, list[int]]) -> None:
    db.execute(update(HopQua).where(HopQua.hop_qua_id.in_(ids["gift_box"])).values(dang_hoat_dong=False))
    db.execute(update(LoHangHopQua).where(LoHangHopQua.lohang_id.in_(ids["gift_box_lot"])).values(trang_thai="tamdung"))


def _hard_delete_gift_box_rows(db, ids: dict[str, list[int]]) -> None:
    if ids["gift_box"]:
        db.query(HopQua).filter(HopQua.hop_qua_id.in_(ids["gift_box"])).delete(synchronize_session=False)


def cleanup_demo_data(db, apply: bool) -> dict[str, int]:
    ids = _ids(db)
    plan = _print_plan(db, ids)
    if not apply:
        print("Dry run only - no changes committed.")
        return plan

    product_connected = _product_connected(db, ids["product_lot"])
    component_connected = _component_connected(db, ids["component_lot"], ids["component"])
    gift_box_connected = _gift_box_connected(db, ids["gift_box_lot"], ids["gift_box"])
    # _ids/_print_plan performed reads and therefore opened a session
    # transaction. End it before starting the all-or-nothing mutation block.
    db.rollback()
    with db.begin():
        if product_connected:
            _soft_delete_product_rows(db, ids)
        else:
            _hard_delete_product_rows(db, ids)
        if component_connected:
            _soft_delete_component_rows(db, ids)
        else:
            _hard_delete_component_rows(db, ids)
        if gift_box_connected:
            _soft_delete_gift_box_rows(db, ids)
        else:
            _hard_delete_gift_box_rows(db, ids)

        voucher_ids = ids["voucher"]
        referenced_voucher_ids = {
            row[0] for row in db.query(DonHangPhieuGiamGia.phieugiam_id).filter(DonHangPhieuGiamGia.phieugiam_id.in_(voucher_ids)).all()
        } if voucher_ids else set()
        if referenced_voucher_ids:
            db.execute(update(PhieuGiamGia).where(PhieuGiamGia.phieugiam_id.in_(referenced_voucher_ids)).values(dang_hoat_dong=False))
        unreferenced_vouchers = [voucher_id for voucher_id in voucher_ids if voucher_id not in referenced_voucher_ids]
        if unreferenced_vouchers:
            db.query(PhieuGiamGia).filter(PhieuGiamGia.phieugiam_id.in_(unreferenced_vouchers)).delete(synchronize_session=False)

        for user_id in ids["user"]:
            if _user_connected(db, user_id):
                db.execute(update(NguoiDung).where(NguoiDung.nguoidung_id == user_id).values(dang_hoat_dong=False))
            else:
                db.query(NguoiDung).filter(NguoiDung.nguoidung_id == user_id).delete(synchronize_session=False)

    print("Cleanup applied in one transaction.")
    return plan


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Apply the conditional cleanup; default is dry-run")
    args = parser.parse_args()
    require_seed_environment(__file__)
    db = SessionLocal()
    try:
        cleanup_demo_data(db, apply=args.apply)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
