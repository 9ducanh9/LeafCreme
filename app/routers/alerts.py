"""
Alerts Router: CRUD operations cho cảnh báo tồn kho

Thin by design — see app.services.alerts.AlertService for the business
logic (moved out as part of the Phase 1 service-layer migration).
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from enum import Enum
from typing import Literal, Optional, List, Union
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

from ..db import get_db
from ..models import NguoiDung
from ..core.capabilities import require_capability
from ..services.alerts import AlertService, DomainError
from ..schemas import Page

router = APIRouter(prefix="/alerts", tags=["alerts"])
alert_service = AlertService()


def _raise_http(exc: DomainError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail)


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
    chi_tiet_ton_kho_san_pham: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)


class AlertSortField(str, Enum):
    muc_do = "muc_do"
    ngay_tao = "ngay_tao"
    # The admin table uses the domain field name for its sortable column.
    ngay_canh_bao = "ngay_canh_bao"


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
    product_stock_created: int = 0
    product_stock_resolved: int = 0
    product_stock_condition_count: int = 0
    legacy_product_low_stock_resolved: int = 0
    total_created: int


# =========================================================
# GET /alerts - List all alerts
# =========================================================
@router.get("", response_model=Union[List[AlertResponse], Page[AlertResponse]])
def get_alerts(
    loai_canh_bao: Optional[str] = Query(None, description="Filter by alert type"),
    muc_do: Optional[str] = Query(None, description="Filter by severity: thap, binh_thuong, cao"),
    trang_thai: Optional[str] = Query(None, description="Filter by status: chua_xu_ly, dang_xu_ly, da_xu_ly, bo_qua"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    paginated: bool = Query(False),
    sort_by: AlertSortField = Query(AlertSortField.ngay_tao),
    sort_dir: Literal["asc", "desc"] = Query("desc"),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("alerts.read"))
):
    """Lấy danh sách cảnh báo tồn kho"""
    return alert_service.list_alerts(
        db, loai_canh_bao=loai_canh_bao, muc_do=muc_do, trang_thai=trang_thai, skip=skip, limit=limit,
        paginated=paginated, sort_by=sort_by.value, sort_dir=sort_dir,
    )


# =========================================================
# GET /alerts/summary - Get alerts summary for dashboard
# =========================================================
@router.get("/summary", response_model=AlertSummary)
def get_alerts_summary(
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("alerts.read"))
):
    """Lấy thống kê tổng quan cảnh báo cho dashboard"""
    return alert_service.get_summary(db)


# =========================================================
# POST /alerts/generate - Auto-generate alerts
# =========================================================
@router.post("/generate", response_model=GenerateAlertsResult)
def generate_alerts(
    low_stock_threshold: int = Query(10, ge=1, description="Ngưỡng tồn kho thấp"),
    expiring_days: int = Query(7, ge=1, le=30, description="Số ngày trước khi hết hạn"),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("alerts.generate"))
):
    """Tự động tạo cảnh báo dựa trên tình trạng tồn kho hiện tại"""
    result = alert_service.generate_alerts(db, low_stock_threshold, expiring_days)
    # Best effort: observability/LLM failures cannot invalidate an inventory scan.
    from app.services.agent.proactive_service import safe_refresh_proactive_insights

    safe_refresh_proactive_insights(db)
    return result


# =========================================================
# PATCH /alerts/{id} - Update alert status
# =========================================================
@router.patch("/{alert_id}", response_model=AlertResponse)
def update_alert(
    alert_id: int,
    update_data: AlertUpdate,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("alerts.update"))
):
    """Cập nhật trạng thái cảnh báo"""
    try:
        return alert_service.update_alert(db, alert_id, update_data, current_user)
    except DomainError as exc:
        _raise_http(exc)


# =========================================================
# DELETE /alerts/{id} - Delete alert
# =========================================================
@router.delete("/{alert_id}")
def delete_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("alerts.delete"))
):
    """Xóa cảnh báo"""
    try:
        return alert_service.delete_alert(db, alert_id)
    except DomainError as exc:
        _raise_http(exc)


# =========================================================
# DELETE /alerts/resolved - Delete all resolved alerts
# =========================================================
@router.delete("/resolved/clear")
def clear_resolved_alerts(
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("alerts.delete"))
):
    """Xóa tất cả cảnh báo đã xử lý"""
    return alert_service.clear_resolved_alerts(db)
