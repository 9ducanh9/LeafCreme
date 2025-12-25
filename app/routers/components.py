from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db import get_db
from app.models import LinhKien
from app.core.dependencies import require_role

router = APIRouter(prefix="/components", tags=["components"])


class ComponentResponse(BaseModel):
    linh_kien_id: int
    ten_linh_kien: str
    sku: Optional[str] = None
    don_vi_tinh: Optional[str] = None
    gia_don_vi: float
    dang_hoat_dong: bool

    class Config:
        from_attributes = True


@router.get("", response_model=List[ComponentResponse])
def list_components(
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=1000),
    search: Optional[str] = Query(None),
    dang_hoat_dong: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin", "manager", "staff")),
):
    query = db.query(LinhKien)

    if dang_hoat_dong is not None:
        query = query.filter(LinhKien.dang_hoat_dong == dang_hoat_dong)

    if search:
        term = f"%{search}%"
        query = query.filter((LinhKien.ten_linh_kien.ilike(term)) | (LinhKien.sku.ilike(term)))

    return query.order_by(LinhKien.linh_kien_id.desc()).offset(skip).limit(limit).all()


@router.get("/{component_id}", response_model=ComponentResponse)
def get_component(
    component_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin", "manager", "staff")),
):
    component = db.query(LinhKien).filter(LinhKien.linh_kien_id == component_id).first()
    if not component:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Linh kiện không tồn tại")
    return component
