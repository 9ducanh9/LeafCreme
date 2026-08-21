"""Read-only inventory of rows created by the repository demo/test seeds.

This command never commits, updates, deletes, or creates schema objects. It
prints JSON so the output can be archived before an explicit cleanup run.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import or_

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


def _count(query) -> int:
    return int(query.count())


def _product_report(db, product: SanPham) -> dict:
    variants = db.query(BienTheSanPham).filter(BienTheSanPham.sanpham_id == product.sanpham_id).all()
    variant_ids = [variant.bienthe_id for variant in variants]
    lots = db.query(LoHangSanPham).filter(LoHangSanPham.bienthe_sanpham_id.in_(variant_ids)).all() if variant_ids else []
    lot_ids = [lot.lohang_id for lot in lots]
    return {
        "id": product.sanpham_id,
        "sku": product.sku,
        "name": product.ten,
        "category": product.danh_muc,
        "active": product.dang_hoat_dong,
        "variant_ids": variant_ids,
        "lot_ids": lot_ids,
        "references": {
            "order_items": _count(db.query(ChiTietDonHang).filter(ChiTietDonHang.lohang_sanpham_id.in_(lot_ids))) if lot_ids else 0,
            "order_allocations": _count(db.query(PhanBoChiTietDonHang).filter(PhanBoChiTietDonHang.lohang_sanpham_id.in_(lot_ids))) if lot_ids else 0,
            "cart_items": _count(db.query(ChiTietGioHang).filter(ChiTietGioHang.lohang_sanpham_id.in_(lot_ids))) if lot_ids else 0,
            "inventory_ledger": _count(db.query(LichSuKhoSanPham).filter(LichSuKhoSanPham.lohang_sanpham_id.in_(lot_ids))) if lot_ids else 0,
            "inventory_alerts": _count(db.query(CanhBaoTonKho).filter(CanhBaoTonKho.lohang_sanpham_id.in_(lot_ids))) if lot_ids else 0,
            "price_history": _count(db.query(LichSuGia).filter(or_(LichSuGia.sanpham_id == product.sanpham_id, LichSuGia.bienthe_id.in_(variant_ids)))) if variant_ids else _count(db.query(LichSuGia).filter(LichSuGia.sanpham_id == product.sanpham_id)),
            "sales_statistics": _count(db.query(ThongKeSanPham).filter(or_(ThongKeSanPham.sanpham_id == product.sanpham_id, ThongKeSanPham.bienthe_id.in_(variant_ids)))) if variant_ids else _count(db.query(ThongKeSanPham).filter(ThongKeSanPham.sanpham_id == product.sanpham_id)),
            "reviews": _count(db.query(DanhGiaSanPham).filter(DanhGiaSanPham.sanpham_id == product.sanpham_id)),
            "gift_box_bom": _count(db.query(HopQuaBOM).filter(HopQuaBOM.bienthe_id.in_(variant_ids))) if variant_ids else 0,
        },
    }


def _lot_report(db, lot: LoHangSanPham) -> dict:
    return {
        "id": lot.lohang_id,
        "code": lot.ma_lo,
        "variant_id": lot.bienthe_sanpham_id,
        "status": lot.trang_thai,
        "references": {
            "inventory": _count(db.query(TonKhoSanPham).filter(TonKhoSanPham.lohang_sanpham_id == lot.lohang_id)),
            "order_items": _count(db.query(ChiTietDonHang).filter(ChiTietDonHang.lohang_sanpham_id == lot.lohang_id)),
            "order_allocations": _count(db.query(PhanBoChiTietDonHang).filter(PhanBoChiTietDonHang.lohang_sanpham_id == lot.lohang_id)),
            "cart_items": _count(db.query(ChiTietGioHang).filter(ChiTietGioHang.lohang_sanpham_id == lot.lohang_id)),
            "inventory_ledger": _count(db.query(LichSuKhoSanPham).filter(LichSuKhoSanPham.lohang_sanpham_id == lot.lohang_id)),
            "alerts": _count(db.query(CanhBaoTonKho).filter(CanhBaoTonKho.lohang_sanpham_id == lot.lohang_id)),
        },
    }


def _variant_report(db, variant: BienTheSanPham) -> dict:
    return {
        "id": variant.bienthe_id,
        "sku": variant.sku_bienthe,
        "product_id": variant.sanpham_id,
        "references": {
            "lots": _count(db.query(LoHangSanPham).filter(LoHangSanPham.bienthe_sanpham_id == variant.bienthe_id)),
            "gift_box_bom": _count(db.query(HopQuaBOM).filter(HopQuaBOM.bienthe_id == variant.bienthe_id)),
            "price_history": _count(db.query(LichSuGia).filter(LichSuGia.bienthe_id == variant.bienthe_id)),
            "sales_statistics": _count(db.query(ThongKeSanPham).filter(ThongKeSanPham.bienthe_id == variant.bienthe_id)),
        },
    }


def _user_references(db, user_id: int) -> dict[str, int]:
    return {
        "orders_as_customer": _count(db.query(DonHang).filter(DonHang.nguoidung_id == user_id)),
        "orders_as_staff": _count(db.query(DonHang).filter(DonHang.nhan_vien_tao == user_id)),
        "returns_as_handler": _count(db.query(DoiTra).filter(DoiTra.nhan_vien_xu_ly == user_id)),
        "carts": _count(db.query(GioHang).filter(GioHang.nguoidung_id == user_id)),
        "inventory_ledger": (
            _count(db.query(LichSuKhoSanPham).filter(LichSuKhoSanPham.nguoidung_id == user_id))
            + _count(db.query(LichSuKhoLinhKien).filter(LichSuKhoLinhKien.nguoidung_id == user_id))
            + _count(db.query(LichSuKhoHopQua).filter(LichSuKhoHopQua.nguoidung_id == user_id))
        ),
        "inventory_alerts": _count(db.query(CanhBaoTonKho).filter(CanhBaoTonKho.nguoi_xu_ly == user_id)),
        "price_history": _count(db.query(LichSuGia).filter(LichSuGia.nguoi_thay_doi == user_id)),
        "reviews_as_author_or_approver": _count(
            db.query(DanhGiaSanPham).filter(
                or_(DanhGiaSanPham.nguoidung_id == user_id, DanhGiaSanPham.nguoi_duyet == user_id)
            )
        ),
        "agent_actions": _count(
            db.query(AgentAction).filter(
                or_(
                    AgentAction.nguoidung_de_xuat_id == user_id,
                    AgentAction.nguoidung_duyet_id == user_id,
                    AgentAction.nguoidung_reset_id == user_id,
                )
            )
        ),
        "system_logs": _count(db.query(SystemLog).filter(SystemLog.nguoi_dung_id == user_id)),
    }


def _component_report(db, component: LinhKien) -> dict:
    lots = db.query(LoHangLinhKien).filter(LoHangLinhKien.linh_kien_id == component.linh_kien_id).all()
    lot_ids = [lot.lohang_id for lot in lots]
    return {
        "id": component.linh_kien_id,
        "sku": component.sku,
        "name": component.ten_linh_kien,
        "active": component.dang_hoat_dong,
        "lot_ids": lot_ids,
        "references": {
            "inventory": _count(db.query(TonKhoLinhKien).filter(TonKhoLinhKien.lohang_linhkien_id.in_(lot_ids))) if lot_ids else 0,
            "bom": _count(db.query(CongThucHopQua).filter(CongThucHopQua.lohang_linhkien_id.in_(lot_ids))) if lot_ids else 0,
            "inventory_ledger": _count(db.query(LichSuKhoLinhKien).filter(LichSuKhoLinhKien.lohang_linhkien_id.in_(lot_ids))) if lot_ids else 0,
        },
    }


def _gift_box_report(db, gift_box: HopQua) -> dict:
    lots = db.query(LoHangHopQua).filter(LoHangHopQua.hop_qua_id == gift_box.hop_qua_id).all()
    lot_ids = [lot.lohang_id for lot in lots]
    return {
        "id": gift_box.hop_qua_id,
        "sku": gift_box.sku,
        "name": gift_box.ten_hop_qua,
        "active": gift_box.dang_hoat_dong,
        "lot_ids": lot_ids,
        "references": {
            "bom": _count(db.query(HopQuaBOM).filter(HopQuaBOM.hop_qua_id == gift_box.hop_qua_id)),
            "component_bom": _count(db.query(CongThucHopQua).filter(CongThucHopQua.hop_qua_id == gift_box.hop_qua_id)),
            "inventory": _count(db.query(TonKhoHopQua).filter(TonKhoHopQua.lohang_hopqua_id.in_(lot_ids))) if lot_ids else 0,
            "order_items": _count(db.query(ChiTietDonHang).filter(or_(ChiTietDonHang.hop_qua_id == gift_box.hop_qua_id, ChiTietDonHang.lohang_hopqua_id.in_(lot_ids)))) if lot_ids else _count(db.query(ChiTietDonHang).filter(ChiTietDonHang.hop_qua_id == gift_box.hop_qua_id)),
            "cart_items": _count(db.query(ChiTietGioHang).filter(ChiTietGioHang.lohang_hopqua_id.in_(lot_ids))) if lot_ids else 0,
            "inventory_ledger": _count(db.query(LichSuKhoHopQua).filter(LichSuKhoHopQua.lohang_hopqua_id.in_(lot_ids))) if lot_ids else 0,
            "alerts": _count(db.query(CanhBaoTonKho).filter(CanhBaoTonKho.lohang_hopqua_id.in_(lot_ids))) if lot_ids else 0,
        },
    }


def audit_demo_data(db) -> dict:
    users = db.query(NguoiDung).filter(or_(NguoiDung.ten_dang_nhap.in_(DEMO_USERNAMES), NguoiDung.email.in_(DEMO_EMAILS))).all()
    products = db.query(SanPham).filter(SanPham.sku.in_(DEMO_PRODUCT_SKUS)).all()
    variants = db.query(BienTheSanPham).filter(BienTheSanPham.sku_bienthe.in_(DEMO_VARIANT_SKUS)).all()
    product_lots = db.query(LoHangSanPham).filter(LoHangSanPham.ma_lo.in_(DEMO_PRODUCT_LOT_CODES)).all()
    components = db.query(LinhKien).filter(LinhKien.sku.in_(DEMO_COMPONENT_SKUS)).all()
    component_lots = db.query(LoHangLinhKien).filter(LoHangLinhKien.ma_lo.in_(DEMO_COMPONENT_LOT_CODES)).all()
    gift_boxes = db.query(HopQua).filter(or_(HopQua.sku.in_(DEMO_GIFT_BOX_SKUS), HopQua.hop_qua_id.in_(DEMO_GIFT_BOX_IDS))).all()
    vouchers = db.query(PhieuGiamGia).filter(PhieuGiamGia.ma_phieu.in_(DEMO_VOUCHER_CODES)).all()
    user_ids = [user.nguoidung_id for user in users]

    return {
        "read_only": True,
        "markers": {
            "users": list(DEMO_USERNAMES),
            "products": list(DEMO_PRODUCT_SKUS),
            "product_lots": list(DEMO_PRODUCT_LOT_CODES),
            "components": list(DEMO_COMPONENT_SKUS),
            "component_lots": list(DEMO_COMPONENT_LOT_CODES),
            "gift_boxes": list(DEMO_GIFT_BOX_SKUS),
            "vouchers": list(DEMO_VOUCHER_CODES),
        },
        "users": [
            {
                "id": user.nguoidung_id,
                "username": user.ten_dang_nhap,
                "email": user.email,
                "active": user.dang_hoat_dong,
                "references": _user_references(db, user.nguoidung_id),
            }
            for user in users
        ],
        "products": [_product_report(db, product) for product in products],
        "variants": [_variant_report(db, variant) for variant in variants],
        "product_lots": [_lot_report(db, lot) for lot in product_lots],
        "components": [_component_report(db, component) for component in components],
        "component_lots": [{"id": lot.lohang_id, "code": lot.ma_lo, "component_id": lot.linh_kien_id} for lot in component_lots],
        "gift_boxes": [_gift_box_report(db, gift_box) for gift_box in gift_boxes],
        "vouchers": [
            {
                "id": voucher.phieugiam_id,
                "code": voucher.ma_phieu,
                "active": voucher.dang_hoat_dong,
                "references": {"orders": _count(db.query(DonHangPhieuGiamGia).filter(DonHangPhieuGiamGia.phieugiam_id == voucher.phieugiam_id))},
            }
            for voucher in vouchers
        ],
        "summary": {
            "users": len(users),
            "products": len(products),
            "variants": len(variants),
            "product_lots": len(product_lots),
            "components": len(components),
            "component_lots": len(component_lots),
            "gift_boxes": len(gift_boxes),
            "vouchers": len(vouchers),
            "matched_user_ids": user_ids,
        },
    }


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    db = SessionLocal()
    try:
        report = audit_demo_data(db)
        print(json.dumps(report, ensure_ascii=False, indent=2, default=str))
    finally:
        db.close()


if __name__ == "__main__":
    main()
