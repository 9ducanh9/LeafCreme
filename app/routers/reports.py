"""
Reports router: Báo cáo cơ bản (đơn giản hóa cho đồ án)

Thin by design — see app.services.reports.ReportService for the business
logic (moved out as part of the Phase 1 service-layer migration).
"""
from datetime import date
from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.capabilities import require_capability
from app.db import get_db
from app.services.reports import DomainError, ReportService

router = APIRouter(prefix="/reports", tags=["reports"])
report_service = ReportService()


def _raise_http(exc: DomainError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail)


# =========================================================
# Response Schemas
# =========================================================
class SalesReportResponse(BaseModel):
    """Báo cáo bán hàng theo ngày"""
    ngay: date
    so_don_hang: int
    tong_doanh_thu: Decimal
    so_luong_ban: int


class ProductRevenueResponse(BaseModel):
    sanpham_id: int
    ten: str
    doanh_thu: Decimal
    so_luong: int


class CategoryRevenueResponse(BaseModel):
    danh_muc: str
    doanh_thu: Decimal
    so_luong: int


# =========================================================
# Endpoints
# =========================================================
@router.get("/sales", response_model=List[SalesReportResponse])
def get_sales_report(
    from_date: date = Query(..., description="Từ ngày (YYYY-MM-DD)"),
    to_date: date = Query(..., description="Đến ngày (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user = Depends(require_capability("reports.read"))
):
    """
    Báo cáo bán hàng theo ngày (endpoint đơn giản cho đồ án)
    """
    try:
        return report_service.get_sales_report(db, from_date, to_date)
    except DomainError as exc:
        _raise_http(exc)


@router.get("/revenue-by-product", response_model=List[ProductRevenueResponse])
def get_revenue_by_product(
    from_date: date = Query(...),
    to_date: date = Query(...),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(require_capability("reports.read")),
):
    try:
        return report_service.get_revenue_by_product(db, from_date, to_date, limit)
    except DomainError as exc:
        _raise_http(exc)


@router.get("/revenue-by-category", response_model=List[CategoryRevenueResponse])
def get_revenue_by_category(
    from_date: date = Query(...),
    to_date: date = Query(...),
    db: Session = Depends(get_db),
    current_user = Depends(require_capability("reports.read")),
):
    try:
        return report_service.get_revenue_by_category(db, from_date, to_date)
    except DomainError as exc:
        _raise_http(exc)
