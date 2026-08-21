from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.core.capabilities import require_capability
from app.db import get_db
from app.models import NguoiDung
from app.schemas import Page
from app.services.errors import DomainError
from app.services.vouchers import VoucherService

router = APIRouter(prefix="/vouchers", tags=["vouchers"])
service = VoucherService()


class VoucherResponse(BaseModel):
    phieugiam_id: int
    ma_phieu: str
    ten_phieu: str
    loai_giam: str
    gia_tri_giam: Decimal
    tong_tien_toi_thieu: Decimal
    ngay_bat_dau: datetime
    ngay_het_han: datetime
    gioi_han_su_dung: int
    so_lan_da_dung: int
    gioi_han_nguoi_dung: Optional[int]
    san_pham_ap_dung: Optional[dict]
    dang_hoat_dong: bool
    mo_ta: Optional[str]
    ngay_tao: datetime

    model_config = ConfigDict(from_attributes=True)


class VoucherCreate(BaseModel):
    ma_phieu: str = Field(..., min_length=1, max_length=50)
    ten_phieu: str = Field(..., min_length=1, max_length=100)
    loai_giam: str = Field(..., pattern="^(phantram|sotien)$")
    gia_tri_giam: Decimal = Field(..., gt=0)
    tong_tien_toi_thieu: Decimal = Field(default=Decimal("0"), ge=0)
    ngay_bat_dau: Optional[datetime] = None
    ngay_het_han: datetime
    gioi_han_su_dung: int = Field(default=0, ge=0, description="0 = không giới hạn")
    gioi_han_nguoi_dung: Optional[int] = Field(None, ge=1)
    san_pham_ap_dung: Optional[dict] = None
    dang_hoat_dong: bool = True
    mo_ta: Optional[str] = None


class VoucherUpdate(BaseModel):
    ma_phieu: Optional[str] = Field(None, min_length=1, max_length=50)
    ten_phieu: Optional[str] = Field(None, min_length=1, max_length=100)
    loai_giam: Optional[str] = Field(None, pattern="^(phantram|sotien)$")
    gia_tri_giam: Optional[Decimal] = Field(None, gt=0)
    tong_tien_toi_thieu: Optional[Decimal] = Field(None, ge=0)
    ngay_bat_dau: Optional[datetime] = None
    ngay_het_han: Optional[datetime] = None
    gioi_han_su_dung: Optional[int] = Field(None, ge=0)
    gioi_han_nguoi_dung: Optional[int] = Field(None, ge=1)
    san_pham_ap_dung: Optional[dict] = None
    dang_hoat_dong: Optional[bool] = None
    mo_ta: Optional[str] = None


def _raise_http(exc: DomainError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail)


@router.get("", response_model=Union[List[VoucherResponse], Page[VoucherResponse]])
def list_vouchers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    paginated: bool = Query(False),
    search: Optional[str] = Query(None),
    dang_hoat_dong: Optional[bool] = Query(None),
    loai_giam: Optional[str] = Query(None, pattern="^(phantram|sotien)$"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("vouchers.read")),
):
    result = service.list(db, skip=skip, limit=limit, search=search, dang_hoat_dong=dang_hoat_dong, loai_giam=loai_giam, sort_dir=sort_dir)
    if paginated:
        return result
    return result["items"]


@router.get("/active", response_model=List[VoucherResponse])
def list_active_vouchers(
    limit: int = Query(200, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Public read-only promotion lookup for storefront flows."""

    return service.list_active(db, limit=limit)


@router.get("/{voucher_id}", response_model=VoucherResponse)
def get_voucher(voucher_id: int, db: Session = Depends(get_db), current_user: NguoiDung = Depends(require_capability("vouchers.read"))):
    try:
        return service.get(db, voucher_id)
    except DomainError as exc:
        _raise_http(exc)


@router.post("", response_model=VoucherResponse, status_code=status.HTTP_201_CREATED)
def create_voucher(payload: VoucherCreate, db: Session = Depends(get_db), current_user: NguoiDung = Depends(require_capability("vouchers.write"))):
    if payload.loai_giam == "phantram" and payload.gia_tri_giam > 100:
        raise HTTPException(status_code=400, detail="Giảm phần trăm không được vượt quá 100")
    try:
        return service.create(db, payload)
    except DomainError as exc:
        _raise_http(exc)


@router.put("/{voucher_id}", response_model=VoucherResponse)
def update_voucher(voucher_id: int, payload: VoucherUpdate, db: Session = Depends(get_db), current_user: NguoiDung = Depends(require_capability("vouchers.write"))):
    try:
        result = service.update(db, voucher_id, payload)
        if result.loai_giam == "phantram" and result.gia_tri_giam > 100:
            raise HTTPException(status_code=400, detail="Giảm phần trăm không được vượt quá 100")
        return result
    except DomainError as exc:
        _raise_http(exc)


@router.delete("/{voucher_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_voucher(voucher_id: int, db: Session = Depends(get_db), current_user: NguoiDung = Depends(require_capability("vouchers.write"))):
    try:
        service.delete(db, voucher_id)
    except DomainError as exc:
        _raise_http(exc)
    return None
