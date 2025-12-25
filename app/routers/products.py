"""
Products Router: CRUD operations cho sản phẩm và biến thể
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from decimal import Decimal
from datetime import datetime

from ..db import get_db
from ..models import SanPham, BienTheSanPham
from ..core.dependencies import get_current_active_user, require_role, get_optional_user
from ..models import NguoiDung
from pydantic import BaseModel, Field

router = APIRouter(prefix="/products", tags=["products"])


# =========================================================
# Pydantic Schemas - Products
# =========================================================
class ProductCreate(BaseModel):
    ten: str = Field(..., min_length=1, max_length=200)
    sku: str = Field(..., min_length=1, max_length=50)
    loai: str = Field(default="don", pattern="^(don|bien_the|hop_qua)$")
    gia_co_ban: Decimal = Field(..., gt=0)
    mo_ta: Optional[str] = None
    hinh_anh_url: Optional[str] = Field(None, max_length=500)
    danh_muc: Optional[str] = Field(None, max_length=100)
    don_vi_tinh: Optional[str] = Field(default="chiếc", max_length=20)
    phu_hop_dip: Optional[List[str]] = Field(
        None,
        description="Danh sách dịp phù hợp (đồng bộ với GiftBoxOccasion): birthday, thanks, love, holiday, self_care"
    )
    dang_hoat_dong: bool = Field(default=True)


class ProductUpdate(BaseModel):
    ten: Optional[str] = Field(None, min_length=1, max_length=200)
    sku: Optional[str] = Field(None, min_length=1, max_length=50)
    loai: Optional[str] = Field(None, pattern="^(don|bien_the|hop_qua)$")
    gia_co_ban: Optional[Decimal] = Field(None, gt=0)
    mo_ta: Optional[str] = None
    hinh_anh_url: Optional[str] = Field(None, max_length=500)
    danh_muc: Optional[str] = Field(None, max_length=100)
    don_vi_tinh: Optional[str] = Field(None, max_length=20)
    phu_hop_dip: Optional[List[str]] = Field(
        None,
        description="Danh sách dịp phù hợp (đồng bộ với GiftBoxOccasion): birthday, thanks, love, holiday, self_care"
    )
    dang_hoat_dong: Optional[bool] = None


class ProductResponse(BaseModel):
    sanpham_id: int
    ten: str
    sku: str
    loai: str
    gia_co_ban: float
    mo_ta: Optional[str]
    hinh_anh_url: Optional[str]
    danh_muc: Optional[str]
    don_vi_tinh: Optional[str]
    phu_hop_dip: Optional[List[str]]
    dang_hoat_dong: bool
    ngay_tao: datetime
    ngay_cap_nhat: datetime

    class Config:
        from_attributes = True


# =========================================================
# Pydantic Schemas - Variants
# =========================================================
class VariantCreate(BaseModel):
    sanpham_id: int = Field(..., gt=0)
    huong_vi: str = Field(..., min_length=1, max_length=100)
    kich_thuoc: Optional[str] = Field(None, max_length=50)
    gia_bienthe: Decimal = Field(..., gt=0)
    sku_bienthe: Optional[str] = Field(None, max_length=50)
    muc_gioi_han_ton: int = Field(default=10, ge=0)
    dang_hoat_dong: bool = Field(default=True)


class VariantUpdate(BaseModel):
    huong_vi: Optional[str] = Field(None, min_length=1, max_length=100)
    kich_thuoc: Optional[str] = Field(None, max_length=50)
    gia_bienthe: Optional[Decimal] = Field(None, gt=0)
    sku_bienthe: Optional[str] = Field(None, max_length=50)
    muc_gioi_han_ton: Optional[int] = Field(None, ge=0)
    dang_hoat_dong: Optional[bool] = None


class VariantResponse(BaseModel):
    bienthe_id: int
    sanpham_id: int
    huong_vi: str
    kich_thuoc: Optional[str]
    gia_bienthe: float
    sku_bienthe: Optional[str]
    muc_gioi_han_ton: int
    dang_hoat_dong: bool
    ngay_tao: datetime

    class Config:
        from_attributes = True


# =========================================================
# Product Endpoints
# =========================================================
@router.get("", response_model=List[ProductResponse])
def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None, description="Tìm kiếm theo tên hoặc SKU"),
    danh_muc: Optional[str] = Query(None, description="Lọc theo danh mục"),
    loai: Optional[str] = Query(None, pattern="^(don|bien_the|hop_qua)$"),
    dang_hoat_dong: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[NguoiDung] = Depends(get_optional_user)
):
    """Danh sách sản phẩm với filters (public access)"""
    query = db.query(SanPham)
    
    if search:
        query = query.filter(
            or_(
                SanPham.ten.ilike(f"%{search}%"),
                SanPham.sku.ilike(f"%{search}%")
            )
        )
    
    if danh_muc:
        query = query.filter(SanPham.danh_muc == danh_muc)
    
    if loai:
        query = query.filter(SanPham.loai == loai)
    
    if dang_hoat_dong is not None:
        query = query.filter(SanPham.dang_hoat_dong == dang_hoat_dong)
    
    # #region agent log
    import json
    from datetime import datetime
    try:
        log_data = {
            "function": "list_products",
            "query_filters": {"dang_hoat_dong": dang_hoat_dong, "search": search, "danh_muc": danh_muc, "loai": loai},
            "skip": skip,
            "limit": limit,
            "model_has_phu_hop_dip": hasattr(SanPham, 'phu_hop_dip')
        }
        with open(r"c:\Leaf Crème\.cursor\debug.log", "a", encoding="utf-8") as f:
            f.write(json.dumps({
                "id": f"log_{int(datetime.now().timestamp() * 1000)}",
                "timestamp": int(datetime.now().timestamp() * 1000),
                "location": "products.py:before_query",
                "message": "About to execute query with phu_hop_dip field",
                "data": log_data,
                "sessionId": "debug-session",
                "runId": "pre-fix",
                "hypothesisId": "A"
            }) + "\n")
    except Exception:
        pass
    # #endregion
    
    products = query.order_by(SanPham.sanpham_id.desc()).offset(skip).limit(limit).all()
    return products


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_role("admin", "manager"))
):
    """Tạo sản phẩm mới (yêu cầu admin/manager)"""
    # Kiểm tra SKU trùng
    existing = db.query(SanPham).filter(SanPham.sku == product_data.sku).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"SKU '{product_data.sku}' đã tồn tại"
        )
    
    product = SanPham(**product_data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[NguoiDung] = Depends(get_optional_user)
):
    """Chi tiết sản phẩm (public access)"""
    product = db.query(SanPham).filter(SanPham.sanpham_id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sản phẩm với ID {product_id} không tồn tại"
        )
    return product


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_role("admin", "manager"))
):
    """Cập nhật sản phẩm (yêu cầu admin/manager)"""
    product = db.query(SanPham).filter(SanPham.sanpham_id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sản phẩm với ID {product_id} không tồn tại"
        )
    
    update_data = product_data.model_dump(exclude_unset=True)
    
    # Kiểm tra SKU trùng nếu có thay đổi
    if "sku" in update_data and update_data["sku"] != product.sku:
        existing = db.query(SanPham).filter(
            SanPham.sku == update_data["sku"],
            SanPham.sanpham_id != product_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"SKU '{update_data['sku']}' đã tồn tại"
            )
    
    for field, value in update_data.items():
        setattr(product, field, value)
    
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_role("admin", "manager"))
):
    """Xóa sản phẩm (soft delete - set dang_hoat_dong=False)"""
    product = db.query(SanPham).filter(SanPham.sanpham_id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sản phẩm với ID {product_id} không tồn tại"
        )
    
    # Soft delete
    product.dang_hoat_dong = False
    db.commit()
    return None


# =========================================================
# Variant Endpoints (phải đặt trước /{product_id} để tránh conflict)
# =========================================================
@router.post("/variants", response_model=VariantResponse, status_code=status.HTTP_201_CREATED)
def create_variant(
    variant_data: VariantCreate,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_role("admin", "manager"))
):
    """Tạo biến thể mới (yêu cầu admin/manager)"""
    # Kiểm tra sản phẩm tồn tại
    product = db.query(SanPham).filter(SanPham.sanpham_id == variant_data.sanpham_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sản phẩm với ID {variant_data.sanpham_id} không tồn tại"
        )
    
    # Kiểm tra SKU biến thể trùng nếu có
    if variant_data.sku_bienthe:
        existing = db.query(BienTheSanPham).filter(
            BienTheSanPham.sku_bienthe == variant_data.sku_bienthe
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"SKU biến thể '{variant_data.sku_bienthe}' đã tồn tại"
            )
    
    variant = BienTheSanPham(**variant_data.model_dump())
    db.add(variant)
    db.commit()
    db.refresh(variant)
    return variant


@router.get("/variants/{variant_id}", response_model=VariantResponse)
def get_variant(
    variant_id: int,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_active_user)
):
    """Chi tiết biến thể"""
    variant = db.query(BienTheSanPham).filter(
        BienTheSanPham.bienthe_id == variant_id
    ).first()
    if not variant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Biến thể với ID {variant_id} không tồn tại"
        )
    return variant


@router.put("/variants/{variant_id}", response_model=VariantResponse)
def update_variant(
    variant_id: int,
    variant_data: VariantUpdate,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_role("admin", "manager"))
):
    """Cập nhật biến thể (yêu cầu admin/manager)"""
    variant = db.query(BienTheSanPham).filter(
        BienTheSanPham.bienthe_id == variant_id
    ).first()
    if not variant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Biến thể với ID {variant_id} không tồn tại"
        )
    
    update_data = variant_data.model_dump(exclude_unset=True)
    
    # Kiểm tra SKU biến thể trùng nếu có thay đổi
    if "sku_bienthe" in update_data and update_data["sku_bienthe"]:
        if update_data["sku_bienthe"] != variant.sku_bienthe:
            existing = db.query(BienTheSanPham).filter(
                BienTheSanPham.sku_bienthe == update_data["sku_bienthe"],
                BienTheSanPham.bienthe_id != variant_id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"SKU biến thể '{update_data['sku_bienthe']}' đã tồn tại"
                )
    
    for field, value in update_data.items():
        setattr(variant, field, value)
    
    db.commit()
    db.refresh(variant)
    return variant


@router.delete("/variants/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_variant(
    variant_id: int,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_role("admin", "manager"))
):
    """Xóa biến thể (soft delete - set dang_hoat_dong=False)"""
    variant = db.query(BienTheSanPham).filter(
        BienTheSanPham.bienthe_id == variant_id
    ).first()
    if not variant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Biến thể với ID {variant_id} không tồn tại"
        )
    
    # Soft delete
    variant.dang_hoat_dong = False
    db.commit()
    return None


@router.get("/{product_id}/variants", response_model=List[VariantResponse])
def get_product_variants(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[NguoiDung] = Depends(get_optional_user)
):
    """Danh sách biến thể của sản phẩm (public access)"""
    # Kiểm tra sản phẩm tồn tại
    product = db.query(SanPham).filter(SanPham.sanpham_id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sản phẩm với ID {product_id} không tồn tại"
        )
    
    variants = db.query(BienTheSanPham).filter(
        BienTheSanPham.sanpham_id == product_id
    ).order_by(BienTheSanPham.bienthe_id).all()
    
    return variants
