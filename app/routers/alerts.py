"""
Alerts Router: CRUD operations cho cảnh báo tồn kho
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel, Field

from ..db import get_db
from ..models import (
    CanhBaoTonKho,
    LoHangSanPham, LoHangLinhKien, LoHangHopQua,
    TonKhoSanPham, TonKhoLinhKien, TonKhoHopQua,
    BienTheSanPham, SanPham, LinhKien, HopQua, NguoiDung
)
from ..core.dependencies import get_current_active_user, require_role

router = APIRouter(prefix="/alerts", tags=["alerts"])


# =========================================================
# Pydantic Schemas
# =========================================================
class AlertResponse(BaseModel):
    canhbao_id: int
    loai_canh_bao: str
    muc_do_nghiem_trong: str
    ngay_canh_bao: datetime
    trang_thai: str
    nguoi_xu_ly: Optional[int] = None
    ngay_xu_ly: Optional[datetime] = None
    ghi_chu: Optional[str] = None
    # Info about the batch
    lohang_id: Optional[int] = None
    loai_lohang: Optional[str] = None  # "sanpham", "linhkien", "hopqua"
    ten_san_pham: Optional[str] = None
    ma_lo: Optional[str] = None
    ngay_het_han: Optional[datetime] = None
    so_luong_hien_tai: Optional[int] = None

    class Config:
        from_attributes = True


class AlertUpdate(BaseModel):
    trang_thai: Optional[str] = Field(None, pattern="^(chua_xu_ly|dang_xu_ly|da_xu_ly|bo_qua)$")
    ghi_chu: Optional[str] = None


class AlertSummary(BaseModel):
    total: int
    pending: int  # chua_xu_ly
    processing: int  # dang_xu_ly
    resolved: int  # da_xu_ly
    by_type: dict  # {"ton_kho_thap": 5, "sap_het_han": 3, ...}
    by_severity: dict  # {"cao": 2, "binh_thuong": 5, "thap": 1}


class GenerateAlertsResult(BaseModel):
    low_stock_created: int
    expiring_created: int
    expired_created: int
    total_created: int


# =========================================================
# GET /alerts - List all alerts
# =========================================================
@router.get("", response_model=List[AlertResponse])
def get_alerts(
    loai_canh_bao: Optional[str] = Query(None, description="Filter by type: ton_kho_thap, sap_het_han, het_han, qua_han"),
    muc_do: Optional[str] = Query(None, description="Filter by severity: thap, binh_thuong, cao"),
    trang_thai: Optional[str] = Query(None, description="Filter by status: chua_xu_ly, dang_xu_ly, da_xu_ly, bo_qua"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_active_user)
):
    """Lấy danh sách cảnh báo tồn kho"""
    query = db.query(CanhBaoTonKho)
    
    if loai_canh_bao:
        query = query.filter(CanhBaoTonKho.loai_canh_bao == loai_canh_bao)
    if muc_do:
        query = query.filter(CanhBaoTonKho.muc_do_nghiem_trong == muc_do)
    if trang_thai:
        query = query.filter(CanhBaoTonKho.trang_thai == trang_thai)
    
    alerts = query.order_by(
        CanhBaoTonKho.muc_do_nghiem_trong.desc(),
        CanhBaoTonKho.ngay_canh_bao.desc()
    ).offset(skip).limit(limit).all()
    
    result = []
    for alert in alerts:
        alert_data = {
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
            "so_luong_hien_tai": None
        }
        
        # Get batch info based on which foreign key is set
        if alert.lohang_sanpham_id:
            lo = db.query(LoHangSanPham, TonKhoSanPham, BienTheSanPham, SanPham).join(
                TonKhoSanPham, TonKhoSanPham.lohang_sanpham_id == LoHangSanPham.lohang_id
            ).join(
                BienTheSanPham, BienTheSanPham.bienthe_id == LoHangSanPham.bienthe_sanpham_id
            ).join(
                SanPham, SanPham.sanpham_id == BienTheSanPham.sanpham_id
            ).filter(LoHangSanPham.lohang_id == alert.lohang_sanpham_id).first()
            
            if lo:
                lohang, tonkho, bienthe, sanpham = lo
                alert_data["lohang_id"] = lohang.lohang_id
                alert_data["loai_lohang"] = "sanpham"
                alert_data["ten_san_pham"] = f"{sanpham.ten} - {bienthe.huong_vi or ''} {bienthe.kich_thuoc or ''}".strip()
                alert_data["ma_lo"] = lohang.ma_lo
                alert_data["ngay_het_han"] = lohang.ngay_het_han
                alert_data["so_luong_hien_tai"] = tonkho.so_luong_hien_tai
                
        elif alert.lohang_linhkien_id:
            lo = db.query(LoHangLinhKien, TonKhoLinhKien, LinhKien).join(
                TonKhoLinhKien, TonKhoLinhKien.lohang_linhkien_id == LoHangLinhKien.lohang_id
            ).join(
                LinhKien, LinhKien.linh_kien_id == LoHangLinhKien.linh_kien_id
            ).filter(LoHangLinhKien.lohang_id == alert.lohang_linhkien_id).first()
            
            if lo:
                lohang, tonkho, linhkien = lo
                alert_data["lohang_id"] = lohang.lohang_id
                alert_data["loai_lohang"] = "linhkien"
                alert_data["ten_san_pham"] = linhkien.ten_linh_kien
                alert_data["ma_lo"] = lohang.ma_lo
                alert_data["ngay_het_han"] = lohang.ngay_het_han
                alert_data["so_luong_hien_tai"] = tonkho.so_luong_hien_tai
                
        elif alert.lohang_hopqua_id:
            lo = db.query(LoHangHopQua, TonKhoHopQua, HopQua).join(
                TonKhoHopQua, TonKhoHopQua.lohang_hopqua_id == LoHangHopQua.lohang_id
            ).join(
                HopQua, HopQua.hop_qua_id == LoHangHopQua.hop_qua_id
            ).filter(LoHangHopQua.lohang_id == alert.lohang_hopqua_id).first()
            
            if lo:
                lohang, tonkho, hopqua = lo
                alert_data["lohang_id"] = lohang.lohang_id
                alert_data["loai_lohang"] = "hopqua"
                alert_data["ten_san_pham"] = hopqua.ten_hop_qua
                alert_data["ma_lo"] = lohang.ma_lo
                alert_data["ngay_het_han"] = lohang.ngay_het_han
                alert_data["so_luong_hien_tai"] = tonkho.so_luong_hien_tai
        
        result.append(AlertResponse(**alert_data))
    
    return result


# =========================================================
# GET /alerts/summary - Get alerts summary for dashboard
# =========================================================
@router.get("/summary", response_model=AlertSummary)
def get_alerts_summary(
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_active_user)
):
    """Lấy thống kê tổng quan cảnh báo cho dashboard"""
    
    # Total counts
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
    
    # By type
    type_counts = db.query(
        CanhBaoTonKho.loai_canh_bao,
        func.count(CanhBaoTonKho.canhbao_id)
    ).filter(
        CanhBaoTonKho.trang_thai == "chua_xu_ly"
    ).group_by(CanhBaoTonKho.loai_canh_bao).all()
    
    by_type = {t: c for t, c in type_counts}
    
    # By severity
    severity_counts = db.query(
        CanhBaoTonKho.muc_do_nghiem_trong,
        func.count(CanhBaoTonKho.canhbao_id)
    ).filter(
        CanhBaoTonKho.trang_thai == "chua_xu_ly"
    ).group_by(CanhBaoTonKho.muc_do_nghiem_trong).all()
    
    by_severity = {s: c for s, c in severity_counts}
    
    return AlertSummary(
        total=total,
        pending=pending,
        processing=processing,
        resolved=resolved,
        by_type=by_type,
        by_severity=by_severity
    )


# =========================================================
# POST /alerts/generate - Auto-generate alerts
# =========================================================
@router.post("/generate", response_model=GenerateAlertsResult)
def generate_alerts(
    low_stock_threshold: int = Query(10, ge=1, description="Ngưỡng tồn kho thấp"),
    expiring_days: int = Query(7, ge=1, le=30, description="Số ngày trước khi hết hạn"),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_role("admin", "manager"))
):
    """Tự động tạo cảnh báo dựa trên tình trạng tồn kho hiện tại"""
    
    now = datetime.now()
    expiring_date = now + timedelta(days=expiring_days)
    
    low_stock_created = 0
    expiring_created = 0
    expired_created = 0
    
    # =========================================================
    # Check Product Batches
    # =========================================================
    product_batches = db.query(LoHangSanPham, TonKhoSanPham).join(
        TonKhoSanPham, TonKhoSanPham.lohang_sanpham_id == LoHangSanPham.lohang_id
    ).filter(
        LoHangSanPham.trang_thai == "hoatdong"
    ).all()
    
    for lo, tonkho in product_batches:
        # Check if alert already exists for this batch
        existing_low_stock = db.query(CanhBaoTonKho).filter(
            CanhBaoTonKho.lohang_sanpham_id == lo.lohang_id,
            CanhBaoTonKho.loai_canh_bao == "ton_kho_thap",
            CanhBaoTonKho.trang_thai.in_(["chua_xu_ly", "dang_xu_ly"])
        ).first()
        
        existing_expiring = db.query(CanhBaoTonKho).filter(
            CanhBaoTonKho.lohang_sanpham_id == lo.lohang_id,
            CanhBaoTonKho.loai_canh_bao.in_(["sap_het_han", "het_han", "qua_han"]),
            CanhBaoTonKho.trang_thai.in_(["chua_xu_ly", "dang_xu_ly"])
        ).first()
        
        # Low stock alert
        if tonkho.so_luong_hien_tai > 0 and tonkho.so_luong_hien_tai <= low_stock_threshold and not existing_low_stock:
            severity = "cao" if tonkho.so_luong_hien_tai <= 5 else "binh_thuong"
            alert = CanhBaoTonKho(
                lohang_sanpham_id=lo.lohang_id,
                loai_canh_bao="ton_kho_thap",
                muc_do_nghiem_trong=severity,
                trang_thai="chua_xu_ly"
            )
            db.add(alert)
            low_stock_created += 1
        
        # Expiring alert
        if tonkho.so_luong_hien_tai > 0 and not existing_expiring:
            if lo.ngay_het_han <= now:
                # Already expired
                alert = CanhBaoTonKho(
                    lohang_sanpham_id=lo.lohang_id,
                    loai_canh_bao="qua_han",
                    muc_do_nghiem_trong="cao",
                    trang_thai="chua_xu_ly"
                )
                db.add(alert)
                expired_created += 1
            elif lo.ngay_het_han <= expiring_date:
                # Expiring soon
                days_left = (lo.ngay_het_han - now).days
                severity = "cao" if days_left <= 3 else "binh_thuong"
                alert = CanhBaoTonKho(
                    lohang_sanpham_id=lo.lohang_id,
                    loai_canh_bao="sap_het_han",
                    muc_do_nghiem_trong=severity,
                    trang_thai="chua_xu_ly"
                )
                db.add(alert)
                expiring_created += 1
    
    # =========================================================
    # Check Component Batches
    # =========================================================
    component_batches = db.query(LoHangLinhKien, TonKhoLinhKien).join(
        TonKhoLinhKien, TonKhoLinhKien.lohang_linhkien_id == LoHangLinhKien.lohang_id
    ).filter(
        LoHangLinhKien.trang_thai == "hoatdong"
    ).all()
    
    for lo, tonkho in component_batches:
        existing_low_stock = db.query(CanhBaoTonKho).filter(
            CanhBaoTonKho.lohang_linhkien_id == lo.lohang_id,
            CanhBaoTonKho.loai_canh_bao == "ton_kho_thap",
            CanhBaoTonKho.trang_thai.in_(["chua_xu_ly", "dang_xu_ly"])
        ).first()
        
        existing_expiring = db.query(CanhBaoTonKho).filter(
            CanhBaoTonKho.lohang_linhkien_id == lo.lohang_id,
            CanhBaoTonKho.loai_canh_bao.in_(["sap_het_han", "het_han", "qua_han"]),
            CanhBaoTonKho.trang_thai.in_(["chua_xu_ly", "dang_xu_ly"])
        ).first()
        
        if tonkho.so_luong_hien_tai > 0 and tonkho.so_luong_hien_tai <= low_stock_threshold and not existing_low_stock:
            severity = "cao" if tonkho.so_luong_hien_tai <= 5 else "binh_thuong"
            alert = CanhBaoTonKho(
                lohang_linhkien_id=lo.lohang_id,
                loai_canh_bao="ton_kho_thap",
                muc_do_nghiem_trong=severity,
                trang_thai="chua_xu_ly"
            )
            db.add(alert)
            low_stock_created += 1
        
        if tonkho.so_luong_hien_tai > 0 and not existing_expiring:
            if lo.ngay_het_han <= now:
                alert = CanhBaoTonKho(
                    lohang_linhkien_id=lo.lohang_id,
                    loai_canh_bao="qua_han",
                    muc_do_nghiem_trong="cao",
                    trang_thai="chua_xu_ly"
                )
                db.add(alert)
                expired_created += 1
            elif lo.ngay_het_han <= expiring_date:
                days_left = (lo.ngay_het_han - now).days
                severity = "cao" if days_left <= 3 else "binh_thuong"
                alert = CanhBaoTonKho(
                    lohang_linhkien_id=lo.lohang_id,
                    loai_canh_bao="sap_het_han",
                    muc_do_nghiem_trong=severity,
                    trang_thai="chua_xu_ly"
                )
                db.add(alert)
                expiring_created += 1
    
    # =========================================================
    # Check Gift Box Batches
    # =========================================================
    giftbox_batches = db.query(LoHangHopQua, TonKhoHopQua).join(
        TonKhoHopQua, TonKhoHopQua.lohang_hopqua_id == LoHangHopQua.lohang_id
    ).filter(
        LoHangHopQua.trang_thai == "hoatdong"
    ).all()
    
    for lo, tonkho in giftbox_batches:
        existing_low_stock = db.query(CanhBaoTonKho).filter(
            CanhBaoTonKho.lohang_hopqua_id == lo.lohang_id,
            CanhBaoTonKho.loai_canh_bao == "ton_kho_thap",
            CanhBaoTonKho.trang_thai.in_(["chua_xu_ly", "dang_xu_ly"])
        ).first()
        
        existing_expiring = db.query(CanhBaoTonKho).filter(
            CanhBaoTonKho.lohang_hopqua_id == lo.lohang_id,
            CanhBaoTonKho.loai_canh_bao.in_(["sap_het_han", "het_han", "qua_han"]),
            CanhBaoTonKho.trang_thai.in_(["chua_xu_ly", "dang_xu_ly"])
        ).first()
        
        if tonkho.so_luong_hien_tai > 0 and tonkho.so_luong_hien_tai <= low_stock_threshold and not existing_low_stock:
            severity = "cao" if tonkho.so_luong_hien_tai <= 5 else "binh_thuong"
            alert = CanhBaoTonKho(
                lohang_hopqua_id=lo.lohang_id,
                loai_canh_bao="ton_kho_thap",
                muc_do_nghiem_trong=severity,
                trang_thai="chua_xu_ly"
            )
            db.add(alert)
            low_stock_created += 1
        
        if tonkho.so_luong_hien_tai > 0 and not existing_expiring:
            if lo.ngay_het_han <= now:
                alert = CanhBaoTonKho(
                    lohang_hopqua_id=lo.lohang_id,
                    loai_canh_bao="qua_han",
                    muc_do_nghiem_trong="cao",
                    trang_thai="chua_xu_ly"
                )
                db.add(alert)
                expired_created += 1
            elif lo.ngay_het_han <= expiring_date:
                days_left = (lo.ngay_het_han - now).days
                severity = "cao" if days_left <= 3 else "binh_thuong"
                alert = CanhBaoTonKho(
                    lohang_hopqua_id=lo.lohang_id,
                    loai_canh_bao="sap_het_han",
                    muc_do_nghiem_trong=severity,
                    trang_thai="chua_xu_ly"
                )
                db.add(alert)
                expiring_created += 1
    
    db.commit()
    
    return GenerateAlertsResult(
        low_stock_created=low_stock_created,
        expiring_created=expiring_created,
        expired_created=expired_created,
        total_created=low_stock_created + expiring_created + expired_created
    )


# =========================================================
# PATCH /alerts/{id} - Update alert status
# =========================================================
@router.patch("/{alert_id}", response_model=AlertResponse)
def update_alert(
    alert_id: int,
    update_data: AlertUpdate,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_active_user)
):
    """Cập nhật trạng thái cảnh báo"""
    alert = db.query(CanhBaoTonKho).filter(CanhBaoTonKho.canhbao_id == alert_id).first()
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy cảnh báo"
        )
    
    if update_data.trang_thai:
        alert.trang_thai = update_data.trang_thai
        if update_data.trang_thai in ["da_xu_ly", "bo_qua"]:
            alert.nguoi_xu_ly = current_user.nguoidung_id
            alert.ngay_xu_ly = datetime.now()
    
    if update_data.ghi_chu is not None:
        alert.ghi_chu = update_data.ghi_chu
    
    db.commit()
    db.refresh(alert)
    
    # Return with batch info
    alert_data = {
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
        "so_luong_hien_tai": None
    }
    
    return AlertResponse(**alert_data)


# =========================================================
# DELETE /alerts/{id} - Delete alert
# =========================================================
@router.delete("/{alert_id}")
def delete_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_role("admin", "manager"))
):
    """Xóa cảnh báo"""
    alert = db.query(CanhBaoTonKho).filter(CanhBaoTonKho.canhbao_id == alert_id).first()
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy cảnh báo"
        )
    
    db.delete(alert)
    db.commit()
    
    return {"message": "Đã xóa cảnh báo", "alert_id": alert_id}


# =========================================================
# DELETE /alerts/resolved - Delete all resolved alerts
# =========================================================
@router.delete("/resolved/clear")
def clear_resolved_alerts(
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_role("admin"))
):
    """Xóa tất cả cảnh báo đã xử lý"""
    count = db.query(CanhBaoTonKho).filter(
        CanhBaoTonKho.trang_thai.in_(["da_xu_ly", "bo_qua"])
    ).delete(synchronize_session=False)
    
    db.commit()
    
    return {"message": f"Đã xóa {count} cảnh báo đã xử lý", "deleted_count": count}

