"""
Components router.

Thin by design — see app.services.components.ComponentService for the
business logic (moved out as part of the Phase 1 service-layer migration).
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.db import get_db
from app.services.components import ComponentService, DomainError

router = APIRouter(prefix="/components", tags=["components"])
component_service = ComponentService()


def _raise_http(exc: DomainError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail)


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
    return component_service.list_components(db, skip, limit, search, dang_hoat_dong)


@router.get("/{component_id}", response_model=ComponentResponse)
def get_component(
    component_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin", "manager", "staff")),
):
    try:
        return component_service.get_component(db, component_id)
    except DomainError as exc:
        _raise_http(exc)
