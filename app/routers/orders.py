"""
Orders router: Quản lý đơn hàng (POS, Online, Đặt trước)
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Literal, List, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_role
from app.db import get_db
from app.models import NguoiDung
from app.services.orders import DomainError, OrderService
from app.schemas import Page

router = APIRouter(prefix="/orders", tags=["orders"])
order_service = OrderService()


class OrderItemCreate(BaseModel):
    """Item trong đơn hàng"""

    bienthe_id: Optional[int] = None
    hop_qua_id: Optional[int] = None
    so_luong: int = Field(..., gt=0, description="Số lượng sản phẩm")


class OrderCreate(BaseModel):
    """Tạo đơn hàng mới"""

    items: List[OrderItemCreate] = Field(..., min_length=1)
    phieu_giam_gia_codes: Optional[List[str]] = Field(None, description="Danh sách mã phiếu giảm giá")
    tien_dat_coc: Optional[Decimal] = Field(None, ge=0, description="Tiền đặt cọc (cho đơn đặt trước)")
    ten_khach_hang: Optional[str] = Field(None, max_length=100)
    so_dien_thoai_khach: Optional[str] = Field(None, max_length=20)
    dia_chi_giao_hang: Optional[str] = None
    ngay_giao_du_kien: Optional[datetime] = None
    ghi_chu: Optional[str] = None


class OrderItemResponse(BaseModel):
    """Chi tiết item trong đơn hàng"""

    chitiet_id: int
    lohang_sanpham_id: Optional[int] = None
    lohang_hopqua_id: Optional[int] = None
    hop_qua_id: Optional[int] = None
    so_luong: int
    gia_don_vi: Decimal
    tong_tien_phu: Decimal
    ghi_chu: Optional[str] = None
    trang_thai: str
    # Resolved server-side (product/variant or gift box name) so the
    # storefront doesn't have to show raw batch/gift-box IDs on order
    # confirmation/detail. See OrderService._resolve_item_names.
    product_name: str = "Sản phẩm không xác định"

    model_config = ConfigDict(from_attributes=True)


class VoucherAppliedResponse(BaseModel):
    """Thông tin voucher đã áp dụng"""

    ma_phieu: str
    ten_phieu: str
    so_tien_giam: Decimal
    ngay_ap_dung: datetime


class OrderResponse(BaseModel):
    """Thông tin đơn hàng đầy đủ"""

    donhang_id: int
    ma_don_hang: str
    nguoidung_id: Optional[int] = None
    loai_don: str
    tong_tien: Decimal
    tien_giam_gia: Decimal
    tien_thanh_toan: Decimal
    tien_dat_coc: Decimal
    trang_thai: str
    ngay_nhan: Optional[datetime] = None
    ngay_giao_du_kien: Optional[datetime] = None
    ghi_chu: Optional[str] = None
    ten_khach_hang: Optional[str] = None
    so_dien_thoai_khach: Optional[str] = None
    dia_chi_giao_hang: Optional[str] = None
    nhan_vien_tao: Optional[int] = None
    ngay_tao: datetime
    ngay_cap_nhat: datetime
    items: List[OrderItemResponse] = Field(default_factory=list)
    vouchers: List[VoucherAppliedResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class OrderUpdateStatus(BaseModel):
    """Cập nhật trạng thái đơn hàng"""

    trang_thai: str = Field(..., description="Trạng thái mới: cho, dang_xu_ly, thanh_toan, da_nhan, huy")
    ghi_chu: Optional[str] = None


class OrderListResponse(BaseModel):
    """Danh sách đơn hàng (summary)"""

    donhang_id: int
    ma_don_hang: str
    loai_don: str
    tong_tien: Decimal
    tien_giam_gia: Decimal
    tien_thanh_toan: Decimal
    trang_thai: str
    ten_khach_hang: Optional[str] = None
    so_dien_thoai_khach: Optional[str] = None
    dia_chi_giao_hang: Optional[str] = None
    ngay_giao_du_kien: Optional[datetime] = None
    ghi_chu: Optional[str] = None
    ngay_tao: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderSortField(str, Enum):
    ngay_tao = "ngay_tao"
    tien_thanh_toan = "tien_thanh_toan"
    trang_thai = "trang_thai"
    ngay_giao_du_kien = "ngay_giao_du_kien"


def _raise_http(exc: DomainError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail)


@router.get("", response_model=Union[List[OrderListResponse], Page[OrderListResponse]])
def list_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    paginated: bool = Query(False),
    sort_by: OrderSortField = Query(OrderSortField.ngay_tao),
    sort_dir: Literal["asc", "desc"] = Query("desc"),
    loai_don: Optional[str] = Query(None, description="Filter theo loại đơn: pos, online, dattruoc"),
    trang_thai: Optional[str] = Query(None, description="Filter theo trạng thái"),
    ma_don_hang: Optional[str] = Query(None, description="Tìm kiếm theo mã đơn hàng"),
    from_date: Optional[datetime] = Query(None, description="Từ ngày (YYYY-MM-DD)"),
    to_date: Optional[datetime] = Query(None, description="Đến ngày (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_user),
):
    try:
        return order_service.list_orders(
            db=db,
            current_user=current_user,
            skip=skip,
            limit=limit,
            loai_don=loai_don,
            trang_thai=trang_thai,
            ma_don_hang=ma_don_hang,
            from_date=from_date,
            to_date=to_date,
            paginated=paginated,
            sort_by=sort_by.value,
            sort_dir=sort_dir,
        )
    except DomainError as exc:
        _raise_http(exc)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_user),
):
    try:
        order_dict = order_service.get_order(db=db, order_id=order_id, current_user=current_user)
        return OrderResponse(**order_dict)
    except DomainError as exc:
        _raise_http(exc)


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    loai_don: str = Query("pos", description="Loại đơn: pos, online, dattruoc"),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_user),
):
    try:
        order_dict = order_service.create_order(
            db=db,
            payload=payload,
            loai_don=loai_don,
            current_user=current_user,
        )
        return OrderResponse(**order_dict)
    except DomainError as exc:
        _raise_http(exc)


@router.put(
    "/{order_id}/status",
    response_model=OrderResponse,
    operation_id="update_order_status_put",
)
@router.patch(
    "/{order_id}/status",
    response_model=OrderResponse,
    operation_id="update_order_status_patch",
)
def update_order_status(
    order_id: int,
    payload: Optional[OrderUpdateStatus] = None,
    new_status: Optional[str] = Query(None, description="Trạng thái mới (query param)"),
    ghi_chu: Optional[str] = Query(None, description="Ghi chú (query param)"),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_user),
):
    try:
        order_dict = order_service.update_order_status(
            db=db,
            order_id=order_id,
            current_user=current_user,
            payload=payload,
            new_status=new_status,
            ghi_chu=ghi_chu,
        )
        return OrderResponse(**order_dict)
    except DomainError as exc:
        _raise_http(exc)


@router.post("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(
    order_id: int,
    ly_do: str = Query(..., description="Lý do hủy đơn"),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_user),
):
    try:
        order_dict = order_service.cancel_order(
            db=db,
            order_id=order_id,
            ly_do=ly_do,
            current_user=current_user,
        )
        return OrderResponse(**order_dict)
    except DomainError as exc:
        _raise_http(exc)


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_role("admin", "manager")),
):
    try:
        order_service.delete_order(db=db, order_id=order_id)
    except DomainError as exc:
        _raise_http(exc)
    return None
