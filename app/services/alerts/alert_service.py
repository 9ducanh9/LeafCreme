"""
Inventory alert domain service.

Extracted from app/routers/alerts.py (Phase 1 service-layer migration — see
app/services/payments/payment_service.py and app/services/batches/
batch_service.py for the same pattern applied earlier).

Like batches.py, `generate_alerts` ran the exact same low-stock/expiring
check three times, once per batch kind — generalized here the same way as
BatchService's CRUD. The per-alert "which batch does this alert point at"
enrichment in `list_alerts`/`_enrich_with_batch_info` was kept as three
literal blocks (not generalized) because the join chains genuinely differ
per kind (product batches need a 2-hop join through BienTheSanPham to
SanPham for the display name; component/gift-box batches only need 1 hop)
— same call as batch_service's reporting endpoints.
"""
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import (
    BienTheSanPham,
    CanhBaoTonKho,
    HopQua,
    LinhKien,
    LoHangHopQua,
    LoHangLinhKien,
    LoHangSanPham,
    NguoiDung,
    SanPham,
    TonKhoHopQua,
    TonKhoLinhKien,
    TonKhoSanPham,
)
from app.services.errors import DomainError

_ACTIVE_ALERT_STATUSES = ("chua_xu_ly", "dang_xu_ly")


@dataclass(frozen=True)
class _AlertKind:
    alert_fk_field: str      # FK column name on CanhBaoTonKho
    batch_model: type
    inventory_model: type
    inventory_fk_field: str  # FK column name on inventory_model pointing at the batch


class AlertService:
    def __init__(self):
        self._kinds: dict[str, _AlertKind] = {
            "products": _AlertKind(
                alert_fk_field="lohang_sanpham_id",
                batch_model=LoHangSanPham,
                inventory_model=TonKhoSanPham,
                inventory_fk_field="lohang_sanpham_id",
            ),
            "components": _AlertKind(
                alert_fk_field="lohang_linhkien_id",
                batch_model=LoHangLinhKien,
                inventory_model=TonKhoLinhKien,
                inventory_fk_field="lohang_linhkien_id",
            ),
            "gift_boxes": _AlertKind(
                alert_fk_field="lohang_hopqua_id",
                batch_model=LoHangHopQua,
                inventory_model=TonKhoHopQua,
                inventory_fk_field="lohang_hopqua_id",
            ),
        }

    # ------------------------------------------------------------------
    def _enrich_with_batch_info(self, db: Session, alert: CanhBaoTonKho) -> dict:
        data = {
            "canhbao_id": alert.canhbao_id,
            "loai_canh_bao": alert.loai_canh_bao,
            "muc_do_nghiem_trong": alert.muc_do_nghiem_trong,
            "ngay_canh_bao": alert.ngay_canh_bao,
            "trang_thai": alert.trang_thai,
            "nguoi_xu_ly": alert.nguoi_xu_ly,
            "ngay_xu_ly": alert.ngay_xu_ly,
            "ghi_chu": alert.ghi_chu,
            "lohang_id": None,
            "loai_lohang": None,
            "ten_san_pham": None,
            "ma_lo": None,
            "ngay_het_han": None,
            "so_luong_hien_tai": None,
        }

        if alert.lohang_sanpham_id:
            row = db.query(LoHangSanPham, TonKhoSanPham, BienTheSanPham, SanPham).join(
                TonKhoSanPham, TonKhoSanPham.lohang_sanpham_id == LoHangSanPham.lohang_id
            ).join(
                BienTheSanPham, BienTheSanPham.bienthe_id == LoHangSanPham.bienthe_sanpham_id
            ).join(
                SanPham, SanPham.sanpham_id == BienTheSanPham.sanpham_id
            ).filter(LoHangSanPham.lohang_id == alert.lohang_sanpham_id).first()

            if row:
                lohang, tonkho, bienthe, sanpham = row
                data["lohang_id"] = lohang.lohang_id
                data["loai_lohang"] = "sanpham"
                data["ten_san_pham"] = f"{sanpham.ten} - {bienthe.huong_vi or ''} {bienthe.kich_thuoc or ''}".strip()
                data["ma_lo"] = lohang.ma_lo
                data["ngay_het_han"] = lohang.ngay_het_han
                data["so_luong_hien_tai"] = tonkho.so_luong_hien_tai

        elif alert.lohang_linhkien_id:
            row = db.query(LoHangLinhKien, TonKhoLinhKien, LinhKien).join(
                TonKhoLinhKien, TonKhoLinhKien.lohang_linhkien_id == LoHangLinhKien.lohang_id
            ).join(
                LinhKien, LinhKien.linh_kien_id == LoHangLinhKien.linh_kien_id
            ).filter(LoHangLinhKien.lohang_id == alert.lohang_linhkien_id).first()

            if row:
                lohang, tonkho, linhkien = row
                data["lohang_id"] = lohang.lohang_id
                data["loai_lohang"] = "linhkien"
                data["ten_san_pham"] = linhkien.ten_linh_kien
                data["ma_lo"] = lohang.ma_lo
                data["ngay_het_han"] = lohang.ngay_het_han
                data["so_luong_hien_tai"] = tonkho.so_luong_hien_tai

        elif alert.lohang_hopqua_id:
            row = db.query(LoHangHopQua, TonKhoHopQua, HopQua).join(
                TonKhoHopQua, TonKhoHopQua.lohang_hopqua_id == LoHangHopQua.lohang_id
            ).join(
                HopQua, HopQua.hop_qua_id == LoHangHopQua.hop_qua_id
            ).filter(LoHangHopQua.lohang_id == alert.lohang_hopqua_id).first()

            if row:
                lohang, tonkho, hopqua = row
                data["lohang_id"] = lohang.lohang_id
                data["loai_lohang"] = "hopqua"
                data["ten_san_pham"] = hopqua.ten_hop_qua
                data["ma_lo"] = lohang.ma_lo
                data["ngay_het_han"] = lohang.ngay_het_han
                data["so_luong_hien_tai"] = tonkho.so_luong_hien_tai

        return data

    # ------------------------------------------------------------------
    def list_alerts(
        self,
        db: Session,
        loai_canh_bao: Optional[str] = None,
        muc_do: Optional[str] = None,
        trang_thai: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        paginated: bool = False,
        sort_by: str = "ngay_tao",
        sort_dir: str = "desc",
    ) -> list[dict] | dict:
        query = db.query(CanhBaoTonKho)
        if loai_canh_bao:
            query = query.filter(CanhBaoTonKho.loai_canh_bao == loai_canh_bao)
        if muc_do:
            query = query.filter(CanhBaoTonKho.muc_do_nghiem_trong == muc_do)
        if trang_thai:
            query = query.filter(CanhBaoTonKho.trang_thai == trang_thai)

        if paginated:
            total = query.count()
            sort_map = {
                "muc_do": CanhBaoTonKho.muc_do_nghiem_trong,
                "ngay_tao": CanhBaoTonKho.ngay_canh_bao,
                "ngay_canh_bao": CanhBaoTonKho.ngay_canh_bao,
            }
            sort_column = sort_map.get(sort_by, CanhBaoTonKho.ngay_canh_bao)
            direction = sort_column.asc() if sort_dir == "asc" else sort_column.desc()
            alerts = query.order_by(direction, CanhBaoTonKho.canhbao_id.asc()).offset(skip).limit(limit).all()
            return {"items": [self._enrich_with_batch_info(db, alert) for alert in alerts], "total": total, "skip": skip, "limit": limit}

        alerts = query.order_by(
            CanhBaoTonKho.muc_do_nghiem_trong.desc(),
            CanhBaoTonKho.ngay_canh_bao.desc(),
            CanhBaoTonKho.canhbao_id.asc(),
        ).offset(skip).limit(limit).all()
        return [self._enrich_with_batch_info(db, alert) for alert in alerts]

    def get_summary(self, db: Session) -> dict:
        total = db.query(func.count(CanhBaoTonKho.canhbao_id)).scalar() or 0
        pending = db.query(func.count(CanhBaoTonKho.canhbao_id)).filter(
            CanhBaoTonKho.trang_thai == "chua_xu_ly"
        ).scalar() or 0
        processing = db.query(func.count(CanhBaoTonKho.canhbao_id)).filter(
            CanhBaoTonKho.trang_thai == "dang_xu_ly"
        ).scalar() or 0
        resolved = db.query(func.count(CanhBaoTonKho.canhbao_id)).filter(
            CanhBaoTonKho.trang_thai == "da_xu_ly"
        ).scalar() or 0

        type_counts = db.query(
            CanhBaoTonKho.loai_canh_bao, func.count(CanhBaoTonKho.canhbao_id)
        ).filter(CanhBaoTonKho.trang_thai == "chua_xu_ly").group_by(CanhBaoTonKho.loai_canh_bao).all()
        by_type = {t: c for t, c in type_counts}

        severity_counts = db.query(
            CanhBaoTonKho.muc_do_nghiem_trong, func.count(CanhBaoTonKho.canhbao_id)
        ).filter(CanhBaoTonKho.trang_thai == "chua_xu_ly").group_by(CanhBaoTonKho.muc_do_nghiem_trong).all()
        by_severity = {s: c for s, c in severity_counts}

        return {
            "total": total,
            "pending": pending,
            "processing": processing,
            "resolved": resolved,
            "by_type": by_type,
            "by_severity": by_severity,
        }

    def generate_alerts(self, db: Session, low_stock_threshold: int, expiring_days: int) -> dict:
        now = datetime.now()
        expiring_date = now + timedelta(days=expiring_days)

        low_stock_created = 0
        expiring_created = 0
        expired_created = 0

        for cfg in self._kinds.values():
            batches = db.query(cfg.batch_model, cfg.inventory_model).join(
                cfg.inventory_model,
                getattr(cfg.inventory_model, cfg.inventory_fk_field) == cfg.batch_model.lohang_id,
            ).filter(cfg.batch_model.trang_thai == "hoatdong").all()

            for lo, tonkho in batches:
                existing_low_stock = db.query(CanhBaoTonKho).filter(
                    getattr(CanhBaoTonKho, cfg.alert_fk_field) == lo.lohang_id,
                    CanhBaoTonKho.loai_canh_bao == "ton_kho_thap",
                    CanhBaoTonKho.trang_thai.in_(_ACTIVE_ALERT_STATUSES),
                ).first()

                existing_expiring = db.query(CanhBaoTonKho).filter(
                    getattr(CanhBaoTonKho, cfg.alert_fk_field) == lo.lohang_id,
                    CanhBaoTonKho.loai_canh_bao.in_(["sap_het_han", "het_han", "qua_han"]),
                    CanhBaoTonKho.trang_thai.in_(_ACTIVE_ALERT_STATUSES),
                ).first()

                if tonkho.so_luong_hien_tai > 0 and tonkho.so_luong_hien_tai <= low_stock_threshold and not existing_low_stock:
                    severity = "cao" if tonkho.so_luong_hien_tai <= 5 else "binh_thuong"
                    db.add(CanhBaoTonKho(
                        **{cfg.alert_fk_field: lo.lohang_id},
                        loai_canh_bao="ton_kho_thap",
                        muc_do_nghiem_trong=severity,
                        trang_thai="chua_xu_ly",
                    ))
                    low_stock_created += 1

                if tonkho.so_luong_hien_tai > 0 and not existing_expiring:
                    if lo.ngay_het_han <= now:
                        db.add(CanhBaoTonKho(
                            **{cfg.alert_fk_field: lo.lohang_id},
                            loai_canh_bao="qua_han",
                            muc_do_nghiem_trong="cao",
                            trang_thai="chua_xu_ly",
                        ))
                        expired_created += 1
                    elif lo.ngay_het_han <= expiring_date:
                        days_left = (lo.ngay_het_han - now).days
                        severity = "cao" if days_left <= 3 else "binh_thuong"
                        db.add(CanhBaoTonKho(
                            **{cfg.alert_fk_field: lo.lohang_id},
                            loai_canh_bao="sap_het_han",
                            muc_do_nghiem_trong=severity,
                            trang_thai="chua_xu_ly",
                        ))
                        expiring_created += 1

        db.commit()

        return {
            "low_stock_created": low_stock_created,
            "expiring_created": expiring_created,
            "expired_created": expired_created,
            "total_created": low_stock_created + expiring_created + expired_created,
        }

    def update_alert(self, db: Session, alert_id: int, payload: Any, current_user: NguoiDung) -> dict:
        alert = db.query(CanhBaoTonKho).filter(CanhBaoTonKho.canhbao_id == alert_id).first()
        if not alert:
            raise DomainError(status_code=404, detail="Không tìm thấy cảnh báo")

        if payload.trang_thai:
            alert.trang_thai = payload.trang_thai
            if payload.trang_thai in ("da_xu_ly", "bo_qua"):
                alert.nguoi_xu_ly = current_user.nguoidung_id
                alert.ngay_xu_ly = datetime.now()

        if payload.ghi_chu is not None:
            alert.ghi_chu = payload.ghi_chu

        db.commit()
        db.refresh(alert)
        return self._enrich_with_batch_info(db, alert)

    def delete_alert(self, db: Session, alert_id: int) -> dict:
        alert = db.query(CanhBaoTonKho).filter(CanhBaoTonKho.canhbao_id == alert_id).first()
        if not alert:
            raise DomainError(status_code=404, detail="Không tìm thấy cảnh báo")

        db.delete(alert)
        db.commit()
        return {"message": "Đã xóa cảnh báo", "alert_id": alert_id}

    def clear_resolved_alerts(self, db: Session) -> dict:
        count = db.query(CanhBaoTonKho).filter(
            CanhBaoTonKho.trang_thai.in_(["da_xu_ly", "bo_qua"])
        ).delete(synchronize_session=False)
        db.commit()
        return {"message": f"Đã xóa {count} cảnh báo đã xử lý", "deleted_count": count}
