"""
Reports router: Báo cáo cơ bản (đơn giản hóa cho đồ án)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import date
from decimal import Decimal
from typing import List
from pydantic import BaseModel

from app.db import get_db
from app.models import DonHang, ChiTietDonHang
from app.core.dependencies import require_role

router = APIRouter(prefix="/reports", tags=["reports"])


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
    if to_date < from_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngày kết thúc phải sau ngày bắt đầu"
        )
    
    # Query đơn hàng đã thanh toán
    orders = db.query(DonHang).filter(
        and_(
            func.date(DonHang.ngay_tao) >= from_date,
            func.date(DonHang.ngay_tao) <= to_date,
            DonHang.trang_thai.in_(["thanh_toan", "da_nhan"])
        )
    ).all()
    
    # Group theo ngày
    daily_stats = {}
    for order in orders:
        order_date = order.ngay_tao.date()
        if order_date not in daily_stats:
            daily_stats[order_date] = {
                "so_don_hang": 0,
                "tong_doanh_thu": Decimal("0"),
                "so_luong_ban": 0
            }
        
        daily_stats[order_date]["so_don_hang"] += 1
        daily_stats[order_date]["tong_doanh_thu"] += order.tong_tien
        
        # Tính số lượng bán từ chi tiết đơn hàng
        items = db.query(ChiTietDonHang).filter(
            ChiTietDonHang.donhang_id == order.donhang_id
        ).all()
        for item in items:
            daily_stats[order_date]["so_luong_ban"] += item.so_luong
    
    # Format kết quả
    results = []
    for order_date in sorted(daily_stats.keys()):
        stats = daily_stats[order_date]
        results.append(SalesReportResponse(
            ngay=order_date,
            so_don_hang=stats["so_don_hang"],
            tong_doanh_thu=stats["tong_doanh_thu"],
            so_luong_ban=stats["so_luong_ban"]
        ))
    
    return results

