"""
Analytics router: Public analytics endpoints for Leafie chatbot

Thin by design — see app.services.analytics.AnalyticsService for the
business logic (moved out as part of the Phase 1 service-layer migration).
"""
from decimal import Decimal
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.analytics import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])
analytics_service = AnalyticsService()


# =========================================================
# Response Schemas
# =========================================================
class BestSellerResponse(BaseModel):
    """Best seller product response"""
    product_id: int
    name: str
    category: Optional[str]
    base_price: Decimal
    image_url: Optional[str]
    sold_count: int


# =========================================================
# Endpoints
# =========================================================
@router.get("/best-sellers", response_model=List[BestSellerResponse])
def get_best_sellers(
    limit: int = Query(5, ge=1, le=20, description="Số lượng sản phẩm trả về"),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách sản phẩm bán chạy nhất
    Tính dựa trên số lượng đã bán từ các đơn hàng đã thanh toán
    """
    return analytics_service.get_best_sellers(db, limit, from_date, to_date)
