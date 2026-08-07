"""
Analytics router: Public analytics endpoints for Leafie chatbot
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from pydantic import BaseModel
from decimal import Decimal

from app.db import get_db
from app.models import DonHang, ChiTietDonHang, SanPham, BienTheSanPham, LoHangSanPham

router = APIRouter(prefix="/analytics", tags=["analytics"])


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
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách sản phẩm bán chạy nhất
    Tính dựa trên số lượng đã bán từ các đơn hàng đã thanh toán
    """
    try:
        # Query: Đếm số lượng bán của mỗi sản phẩm từ chi tiết đơn hàng
        # Path: ChiTietDonHang -> LoHangSanPham -> BienTheSanPham -> SanPham
        subquery = (
            db.query(
                BienTheSanPham.sanpham_id,
                func.sum(ChiTietDonHang.so_luong).label('sold_count')
            )
            .select_from(ChiTietDonHang)
            .join(DonHang, DonHang.donhang_id == ChiTietDonHang.donhang_id)
            .join(LoHangSanPham, LoHangSanPham.lohang_id == ChiTietDonHang.lohang_sanpham_id)
            .join(BienTheSanPham, BienTheSanPham.bienthe_id == LoHangSanPham.bienthe_sanpham_id)
            .filter(
                DonHang.trang_thai == "hoan_thanh",
                ChiTietDonHang.lohang_sanpham_id.isnot(None)  # Chỉ lấy sản phẩm, không lấy hộp quà
            )
            .group_by(BienTheSanPham.sanpham_id)
            .subquery()
        )
    except Exception as e:
        # Nếu có lỗi với query, fallback về active products
        import logging
        logging.error(f"Error in best-sellers query: {e}")
        products = (
            db.query(SanPham)
            .filter(SanPham.dang_hoat_dong == True)
            .order_by(SanPham.ngay_tao.desc())
            .limit(limit)
            .all()
        )
        
        return [
            BestSellerResponse(
                product_id=p.sanpham_id,
                name=p.ten,
                category=p.danh_muc,
                base_price=p.gia_co_ban,
                image_url=p.hinh_anh_url,
                sold_count=0  # No sales data yet
            )
            for p in products
        ]

    # Join với bảng sản phẩm để lấy thông tin
    results = (
        db.query(
            SanPham.sanpham_id,
            SanPham.ten,
            SanPham.danh_muc,
            SanPham.gia_co_ban,
            SanPham.hinh_anh_url,
            func.coalesce(subquery.c.sold_count, 0).label('sold_count')
        )
        .outerjoin(subquery, SanPham.sanpham_id == subquery.c.sanpham_id)
        .filter(SanPham.dang_hoat_dong == True)
        .order_by(func.coalesce(subquery.c.sold_count, 0).desc(), SanPham.ten)
        .limit(limit)
        .all()
    )

    # Format response
    best_sellers = []
    for row in results:
        best_sellers.append(BestSellerResponse(
            product_id=row.sanpham_id,
            name=row.ten,
            category=row.danh_muc,
            base_price=row.gia_co_ban,
            image_url=row.hinh_anh_url,
            sold_count=int(row.sold_count) if row.sold_count else 0
        ))

    # If no sales data, return active products as fallback
    if not best_sellers or all(bs.sold_count == 0 for bs in best_sellers):
        products = (
            db.query(SanPham)
            .filter(SanPham.dang_hoat_dong == True)
            .order_by(SanPham.ngay_tao.desc())
            .limit(limit)
            .all()
        )
        
        best_sellers = [
            BestSellerResponse(
                product_id=p.sanpham_id,
                name=p.ten,
                category=p.danh_muc,
                base_price=p.gia_co_ban,
                image_url=p.hinh_anh_url,
                sold_count=0  # No sales data yet
            )
            for p in products
        ]

    return best_sellers

