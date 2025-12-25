"""
Gift Boxes Router: CRUD operations cho hộp quà và BOM
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import Optional, List
from decimal import Decimal
from datetime import datetime

from ..db import get_db
from ..models import HopQua, HopQuaBOM, BienTheSanPham, SanPham
from ..core.dependencies import get_current_active_user, require_role, get_optional_user
from ..models import NguoiDung
from pydantic import BaseModel, Field

router = APIRouter(prefix="/admin/gift-boxes", tags=["gift-boxes"])

# Public router for customer-facing pages (read-only, no auth required)
public_router = APIRouter(prefix="/gift-boxes", tags=["gift-boxes-public"])


# =========================================================
# Pydantic Schemas - Gift Boxes
# =========================================================
class GiftBoxCreate(BaseModel):
    ten_hop_qua: str = Field(..., min_length=1, max_length=200)
    sku: Optional[str] = Field(None, max_length=50)
    gia_ban: Decimal = Field(..., gt=0)
    mo_ta: Optional[str] = None
    hinh_anh_url: Optional[str] = Field(None, max_length=500)
    kich_thuoc: Optional[str] = Field(None, max_length=100)
    trong_luong: Optional[Decimal] = None
    dang_hoat_dong: bool = Field(default=True)


class GiftBoxUpdate(BaseModel):
    ten_hop_qua: Optional[str] = Field(None, min_length=1, max_length=200)
    sku: Optional[str] = Field(None, max_length=50)
    gia_ban: Optional[Decimal] = Field(None, gt=0)
    mo_ta: Optional[str] = None
    hinh_anh_url: Optional[str] = Field(None, max_length=500)
    kich_thuoc: Optional[str] = Field(None, max_length=100)
    trong_luong: Optional[Decimal] = None
    dang_hoat_dong: Optional[bool] = None


class GiftBoxResponse(BaseModel):
    hop_qua_id: int
    ten_hop_qua: str
    sku: Optional[str]
    gia_ban: Decimal
    mo_ta: Optional[str]
    hinh_anh_url: Optional[str]
    kich_thuoc: Optional[str]
    trong_luong: Optional[Decimal]
    dang_hoat_dong: bool
    ngay_tao: str

    class Config:
        from_attributes = True


# =========================================================
# Pydantic Schemas - BOM
# =========================================================
class BomItemCreate(BaseModel):
    bienthe_id: int = Field(..., gt=0)
    so_luong: int = Field(..., gt=0)


class BomItemUpdate(BaseModel):
    so_luong: int = Field(..., gt=0)


class BomItemResponse(BaseModel):
    bom_id: int
    hop_qua_id: int
    bienthe_id: int
    so_luong: int
    ngay_tao: str
    # Variant details
    variant_name: Optional[str] = None
    variant_price: Optional[Decimal] = None
    product_name: Optional[str] = None
    product_category: Optional[str] = None
    variant_active: Optional[bool] = None

    class Config:
        from_attributes = True


# =========================================================
# Gift Box Endpoints
# =========================================================
@router.get("", response_model=List[GiftBoxResponse])
def list_gift_boxes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None, description="Tìm kiếm theo tên hoặc SKU"),
    dang_hoat_dong: Optional[bool] = Query(None),
    min_price: Optional[Decimal] = Query(None, gt=0),
    max_price: Optional[Decimal] = Query(None, gt=0),
    current_user: NguoiDung = Depends(require_role("admin", "manager", "staff")),
    db: Session = Depends(get_db)
):
    """Danh sách hộp quà"""
    query = db.query(HopQua)
    
    if search:
        query = query.filter(
            or_(
                HopQua.ten_hop_qua.ilike(f"%{search}%"),
                HopQua.sku.ilike(f"%{search}%")
            )
        )
    
    if dang_hoat_dong is not None:
        query = query.filter(HopQua.dang_hoat_dong == dang_hoat_dong)
    
    if min_price:
        query = query.filter(HopQua.gia_ban >= min_price)
    
    if max_price:
        query = query.filter(HopQua.gia_ban <= max_price)
    
    gift_boxes = query.order_by(HopQua.ngay_tao.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "hop_qua_id": gb.hop_qua_id,
            "ten_hop_qua": gb.ten_hop_qua,
            "sku": gb.sku,
            "gia_ban": gb.gia_ban,
            "mo_ta": gb.mo_ta,
            "hinh_anh_url": gb.hinh_anh_url,
            "kich_thuoc": gb.kich_thuoc,
            "trong_luong": gb.trong_luong,
            "dang_hoat_dong": gb.dang_hoat_dong,
            "ngay_tao": gb.ngay_tao.isoformat(),
        }
        for gb in gift_boxes
    ]


@router.get("/{gift_box_id}", response_model=GiftBoxResponse)
def get_gift_box(
    gift_box_id: int,
    current_user: NguoiDung = Depends(require_role("admin", "manager", "staff")),
    db: Session = Depends(get_db)
):
    """Lấy thông tin một hộp quà"""
    gift_box = db.query(HopQua).filter(HopQua.hop_qua_id == gift_box_id).first()
    if not gift_box:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hộp quà không tồn tại"
        )
    
    return {
        "hop_qua_id": gift_box.hop_qua_id,
        "ten_hop_qua": gift_box.ten_hop_qua,
        "sku": gift_box.sku,
        "gia_ban": gift_box.gia_ban,
        "mo_ta": gift_box.mo_ta,
        "hinh_anh_url": gift_box.hinh_anh_url,
        "kich_thuoc": gift_box.kich_thuoc,
        "trong_luong": gift_box.trong_luong,
        "dang_hoat_dong": gift_box.dang_hoat_dong,
        "ngay_tao": gift_box.ngay_tao.isoformat(),
    }


@router.post("", response_model=GiftBoxResponse, status_code=status.HTTP_201_CREATED)
def create_gift_box(
    gift_box_data: GiftBoxCreate,
    current_user: NguoiDung = Depends(require_role("admin", "manager")),
    db: Session = Depends(get_db)
):
    """Tạo hộp quà mới"""
    # Check SKU uniqueness if provided
    if gift_box_data.sku:
        existing = db.query(HopQua).filter(HopQua.sku == gift_box_data.sku).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SKU đã tồn tại"
            )
    
    # Generate SKU if not provided
    if not gift_box_data.sku:
        # Find max ID to generate unique SKU
        max_id = db.query(func.max(HopQua.hop_qua_id)).scalar() or 0
        gift_box_data.sku = f"GIFTBOX-{max_id + 1}"
    
    new_gift_box = HopQua(**gift_box_data.model_dump())
    db.add(new_gift_box)
    db.commit()
    db.refresh(new_gift_box)
    
    return {
        "hop_qua_id": new_gift_box.hop_qua_id,
        "ten_hop_qua": new_gift_box.ten_hop_qua,
        "sku": new_gift_box.sku,
        "gia_ban": new_gift_box.gia_ban,
        "mo_ta": new_gift_box.mo_ta,
        "hinh_anh_url": new_gift_box.hinh_anh_url,
        "kich_thuoc": new_gift_box.kich_thuoc,
        "trong_luong": new_gift_box.trong_luong,
        "dang_hoat_dong": new_gift_box.dang_hoat_dong,
        "ngay_tao": new_gift_box.ngay_tao.isoformat(),
    }


@router.put("/{gift_box_id}", response_model=GiftBoxResponse)
def update_gift_box(
    gift_box_id: int,
    gift_box_data: GiftBoxUpdate,
    current_user: NguoiDung = Depends(require_role("admin", "manager")),
    db: Session = Depends(get_db)
):
    """Cập nhật hộp quà"""
    gift_box = db.query(HopQua).filter(HopQua.hop_qua_id == gift_box_id).first()
    if not gift_box:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hộp quà không tồn tại"
        )
    
    # Check SKU uniqueness if updating
    if gift_box_data.sku and gift_box_data.sku != gift_box.sku:
        existing = db.query(HopQua).filter(
            HopQua.sku == gift_box_data.sku,
            HopQua.hop_qua_id != gift_box_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SKU đã tồn tại"
            )
    
    # Update fields
    update_data = gift_box_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(gift_box, field, value)
    
    db.commit()
    db.refresh(gift_box)
    
    return {
        "hop_qua_id": gift_box.hop_qua_id,
        "ten_hop_qua": gift_box.ten_hop_qua,
        "sku": gift_box.sku,
        "gia_ban": gift_box.gia_ban,
        "mo_ta": gift_box.mo_ta,
        "hinh_anh_url": gift_box.hinh_anh_url,
        "kich_thuoc": gift_box.kich_thuoc,
        "trong_luong": gift_box.trong_luong,
        "dang_hoat_dong": gift_box.dang_hoat_dong,
        "ngay_tao": gift_box.ngay_tao.isoformat(),
    }


@router.delete("/{gift_box_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_gift_box(
    gift_box_id: int,
    current_user: NguoiDung = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Xóa hộp quà (cascade sẽ xóa BOM)"""
    gift_box = db.query(HopQua).filter(HopQua.hop_qua_id == gift_box_id).first()
    if not gift_box:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hộp quà không tồn tại"
        )
    
    db.delete(gift_box)
    db.commit()
    
    return None


# =========================================================
# BOM Endpoints
# =========================================================
@router.get("/{gift_box_id}/bom", response_model=List[BomItemResponse])
def get_gift_box_bom(
    gift_box_id: int,
    current_user: NguoiDung = Depends(require_role("admin", "manager", "staff")),
    db: Session = Depends(get_db)
):
    """Lấy danh sách BOM của hộp quà"""
    # Check gift box exists
    gift_box = db.query(HopQua).filter(HopQua.hop_qua_id == gift_box_id).first()
    if not gift_box:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hộp quà không tồn tại"
        )
    
    # Get BOM items with variant and product details
    bom_items = (
        db.query(
            HopQuaBOM,
            BienTheSanPham,
            SanPham
        )
        .join(BienTheSanPham, HopQuaBOM.bienthe_id == BienTheSanPham.bienthe_id)
        .join(SanPham, BienTheSanPham.sanpham_id == SanPham.sanpham_id)
        .filter(HopQuaBOM.hop_qua_id == gift_box_id)
        .all()
    )
    
    return [
        {
            "bom_id": bom.bom_id,
            "hop_qua_id": bom.hop_qua_id,
            "bienthe_id": bom.bienthe_id,
            "so_luong": bom.so_luong,
            "ngay_tao": bom.ngay_tao.isoformat(),
            "variant_name": f"{variant.huong_vi} {variant.kich_thuoc or ''}".strip(),
            "variant_price": variant.gia_bienthe,
            "product_name": product.ten,
            "product_category": product.danh_muc,
            "variant_active": variant.dang_hoat_dong,
        }
        for bom, variant, product in bom_items
    ]


@router.post("/{gift_box_id}/bom", response_model=BomItemResponse, status_code=status.HTTP_201_CREATED)
def add_bom_item(
    gift_box_id: int,
    bom_item: BomItemCreate,
    current_user: NguoiDung = Depends(require_role("admin", "manager")),
    db: Session = Depends(get_db)
):
    """Thêm item vào BOM"""
    # Check gift box exists
    gift_box = db.query(HopQua).filter(HopQua.hop_qua_id == gift_box_id).first()
    if not gift_box:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hộp quà không tồn tại"
        )
    
    # Check variant exists
    variant = db.query(BienTheSanPham).filter(
        BienTheSanPham.bienthe_id == bom_item.bienthe_id
    ).first()
    if not variant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Biến thể sản phẩm không tồn tại"
        )
    
    # Check if already exists (unique constraint)
    existing = db.query(HopQuaBOM).filter(
        HopQuaBOM.hop_qua_id == gift_box_id,
        HopQuaBOM.bienthe_id == bom_item.bienthe_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Biến thể này đã có trong BOM. Hãy cập nhật số lượng thay vì thêm mới."
        )
    
    new_bom_item = HopQuaBOM(
        hop_qua_id=gift_box_id,
        bienthe_id=bom_item.bienthe_id,
        so_luong=bom_item.so_luong
    )
    db.add(new_bom_item)
    db.commit()
    db.refresh(new_bom_item)
    
    # Get variant and product for response
    product = db.query(SanPham).filter(SanPham.sanpham_id == variant.sanpham_id).first()
    
    return {
        "bom_id": new_bom_item.bom_id,
        "hop_qua_id": new_bom_item.hop_qua_id,
        "bienthe_id": new_bom_item.bienthe_id,
        "so_luong": new_bom_item.so_luong,
        "ngay_tao": new_bom_item.ngay_tao.isoformat(),
        "variant_name": f"{variant.huong_vi} {variant.kich_thuoc or ''}".strip(),
        "variant_price": variant.gia_bienthe,
        "product_name": product.ten if product else None,
        "product_category": product.danh_muc if product else None,
        "variant_active": variant.dang_hoat_dong,
    }


@router.put("/{gift_box_id}/bom/{bom_id}", response_model=BomItemResponse)
def update_bom_item(
    gift_box_id: int,
    bom_id: int,
    bom_item: BomItemUpdate,
    current_user: NguoiDung = Depends(require_role("admin", "manager")),
    db: Session = Depends(get_db)
):
    """Cập nhật số lượng BOM item"""
    bom = db.query(HopQuaBOM).filter(
        HopQuaBOM.bom_id == bom_id,
        HopQuaBOM.hop_qua_id == gift_box_id
    ).first()
    if not bom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="BOM item không tồn tại"
        )
    
    bom.so_luong = bom_item.so_luong
    db.commit()
    db.refresh(bom)
    
    # Get variant and product for response
    variant = db.query(BienTheSanPham).filter(
        BienTheSanPham.bienthe_id == bom.bienthe_id
    ).first()
    product = None
    if variant:
        product = db.query(SanPham).filter(SanPham.sanpham_id == variant.sanpham_id).first()
    
    return {
        "bom_id": bom.bom_id,
        "hop_qua_id": bom.hop_qua_id,
        "bienthe_id": bom.bienthe_id,
        "so_luong": bom.so_luong,
        "ngay_tao": bom.ngay_tao.isoformat(),
        "variant_name": f"{variant.huong_vi} {variant.kich_thuoc or ''}".strip() if variant else None,
        "variant_price": variant.gia_bienthe if variant else None,
        "product_name": product.ten if product else None,
        "product_category": product.danh_muc if product else None,
        "variant_active": variant.dang_hoat_dong if variant else None,
    }


@router.delete("/{gift_box_id}/bom/{bom_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bom_item(
    gift_box_id: int,
    bom_id: int,
    current_user: NguoiDung = Depends(require_role("admin", "manager")),
    db: Session = Depends(get_db)
):
    """Xóa BOM item"""
    bom = db.query(HopQuaBOM).filter(
        HopQuaBOM.bom_id == bom_id,
        HopQuaBOM.hop_qua_id == gift_box_id
    ).first()
    if not bom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="BOM item không tồn tại"
        )
    
    # Check if this is the last item
    remaining_count = db.query(HopQuaBOM).filter(
        HopQuaBOM.hop_qua_id == gift_box_id
    ).count()
    
    if remaining_count <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hộp quà phải có ít nhất 1 item trong BOM"
        )
    
    db.delete(bom)
    db.commit()
    
    return None


# =========================================================
# Public Endpoints (Customer-facing, no auth required)
# =========================================================
@public_router.get("", response_model=List[GiftBoxResponse])
def list_gift_boxes_public(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None, description="Tìm kiếm theo tên hoặc SKU"),
    dang_hoat_dong: Optional[bool] = Query(None, description="Lọc theo trạng thái hoạt động"),
    min_price: Optional[Decimal] = Query(None, gt=0),
    max_price: Optional[Decimal] = Query(None, gt=0),
    db: Session = Depends(get_db),
    current_user: Optional[NguoiDung] = Depends(get_optional_user)
):
    """Danh sách hộp quà (public - mặc định chỉ hiển thị hộp quà đang hoạt động)"""
    query = db.query(HopQua)
    
    # Default to active boxes if not specified (for customer-facing pages)
    if dang_hoat_dong is None:
        query = query.filter(HopQua.dang_hoat_dong == True)
    else:
        query = query.filter(HopQua.dang_hoat_dong == dang_hoat_dong)
    
    if search:
        query = query.filter(
            or_(
                HopQua.ten_hop_qua.ilike(f"%{search}%"),
                HopQua.sku.ilike(f"%{search}%")
            )
        )
    
    if min_price:
        query = query.filter(HopQua.gia_ban >= min_price)
    
    if max_price:
        query = query.filter(HopQua.gia_ban <= max_price)
    
    gift_boxes = query.order_by(HopQua.ngay_tao.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "hop_qua_id": gb.hop_qua_id,
            "ten_hop_qua": gb.ten_hop_qua,
            "sku": gb.sku,
            "gia_ban": gb.gia_ban,
            "mo_ta": gb.mo_ta,
            "hinh_anh_url": gb.hinh_anh_url,
            "kich_thuoc": gb.kich_thuoc,
            "trong_luong": gb.trong_luong,
            "dang_hoat_dong": gb.dang_hoat_dong,
            "ngay_tao": gb.ngay_tao.isoformat(),
        }
        for gb in gift_boxes
    ]


@public_router.get("/{gift_box_id}", response_model=GiftBoxResponse)
def get_gift_box_public(
    gift_box_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[NguoiDung] = Depends(get_optional_user)
):
    """Lấy thông tin một hộp quà (public - chỉ hiển thị nếu đang hoạt động)"""
    gift_box = db.query(HopQua).filter(
        HopQua.hop_qua_id == gift_box_id,
        HopQua.dang_hoat_dong == True  # Only active boxes
    ).first()
    if not gift_box:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hộp quà không tồn tại hoặc không còn hoạt động"
        )
    
    return {
        "hop_qua_id": gift_box.hop_qua_id,
        "ten_hop_qua": gift_box.ten_hop_qua,
        "sku": gift_box.sku,
        "gia_ban": gift_box.gia_ban,
        "mo_ta": gift_box.mo_ta,
        "hinh_anh_url": gift_box.hinh_anh_url,
        "kich_thuoc": gift_box.kich_thuoc,
        "trong_luong": gift_box.trong_luong,
        "dang_hoat_dong": gift_box.dang_hoat_dong,
        "ngay_tao": gift_box.ngay_tao.isoformat(),
    }


@public_router.get("/{gift_box_id}/bom", response_model=List[BomItemResponse])
def get_gift_box_bom_public(
    gift_box_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[NguoiDung] = Depends(get_optional_user)
):
    """Lấy danh sách BOM của hộp quà (public - chỉ hiển thị nếu hộp quà đang hoạt động)"""
    # Check gift box exists and is active
    gift_box = db.query(HopQua).filter(
        HopQua.hop_qua_id == gift_box_id,
        HopQua.dang_hoat_dong == True
    ).first()
    if not gift_box:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hộp quà không tồn tại hoặc không còn hoạt động"
        )
    
    # Get BOM items with variant and product details
    bom_items = (
        db.query(
            HopQuaBOM,
            BienTheSanPham,
            SanPham
        )
        .join(BienTheSanPham, HopQuaBOM.bienthe_id == BienTheSanPham.bienthe_id)
        .join(SanPham, BienTheSanPham.sanpham_id == SanPham.sanpham_id)
        .filter(HopQuaBOM.hop_qua_id == gift_box_id)
        .all()
    )
    
    return [
        {
            "bom_id": bom.bom_id,
            "hop_qua_id": bom.hop_qua_id,
            "bienthe_id": bom.bienthe_id,
            "so_luong": bom.so_luong,
            "ngay_tao": bom.ngay_tao.isoformat(),
            "variant_name": f"{variant.huong_vi} {variant.kich_thuoc or ''}".strip(),
            "variant_price": variant.gia_bienthe,
            "product_name": product.ten,
            "product_category": product.danh_muc,
            "variant_active": variant.dang_hoat_dong,
        }
        for bom, variant, product in bom_items
    ]

