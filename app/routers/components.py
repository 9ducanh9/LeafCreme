"""
Components router.

Thin by design — see app.services.components.ComponentService for the
business logic (moved out as part of the Phase 1 service-layer migration).
"""
from enum import Enum
from typing import Literal, List, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.db import get_db
from app.services.components import ComponentService, DomainError
from app.schemas import Page

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

    model_config = ConfigDict(from_attributes=True)


class ComponentSortField(str, Enum):
    ten = "ten"
    ngay_tao = "ngay_tao"


@router.get("", response_model=Union[List[ComponentResponse], Page[ComponentResponse]])
def list_components(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    paginated: bool = Query(False),
    sort_by: ComponentSortField = Query(ComponentSortField.ngay_tao),
    sort_dir: Literal["asc", "desc"] = Query("desc"),
    search: Optional[str] = Query(None),
    dang_hoat_dong: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin", "manager", "staff")),
):
    return component_service.list_components(db, skip, limit, search, dang_hoat_dong, paginated, sort_by.value, sort_dir)


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
