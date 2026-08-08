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

from app.core.dependencies import require_role
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


# =========================================================
# Endpoints
# =========================================================
@router.get("/sales", response_model=List[SalesReportResponse])
def get_sales_report(
    from_date: date = Query(..., description="Từ ngày (YYYY-MM-DD)"),
    to_date: date = Query(..., description="Đến ngày (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin", "manager"))
):
    """
    Báo cáo bán hàng theo ngày (endpoint đơn giản cho đồ án)
    """
    try:
        return report_service.get_sales_report(db, from_date, to_date)
    except DomainError as exc:
        _raise_http(exc)
