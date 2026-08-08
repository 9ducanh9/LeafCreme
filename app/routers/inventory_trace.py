"""
Inventory trace / ledger router.

Thin by design — see app.services.inventory_trace.InventoryTraceService for
the business logic (moved out as part of the Phase 1 service-layer
migration).
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.db import get_db
from app.models import NguoiDung
from app.services.inventory_trace import DomainError, InventoryTraceService

router = APIRouter(tags=["inventory-trace"])
inventory_trace_service = InventoryTraceService()


def _raise_http(exc: DomainError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail)


@router.get("/inventory-ledger")
def get_inventory_ledger(
    item_type: Optional[str] = Query(None, pattern="^(sanpham|linhkien|hopqua)$"),
    batch_id: Optional[int] = Query(None, ge=1),
    movement_type: Optional[str] = Query(None, pattern="^(nhap_hang|xuat_ban|xuat_huy|dieu_chinh|kiem_ke|tra_hang|xuat_bom)$"),
    order_id: Optional[int] = Query(None, ge=1),
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_role("admin", "manager", "staff")),
):
    return inventory_trace_service.get_inventory_ledger(
        db,
        item_type=item_type,
        batch_id=batch_id,
        movement_type=movement_type,
        order_id=order_id,
        date_from=date_from,
        date_to=date_to,
        skip=skip,
        limit=limit,
    )


@router.get("/batch-trace/{batch_type}/{batch_id}")
def get_batch_trace(
    batch_type: str,
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_role("admin", "manager", "staff")),
):
    try:
        return inventory_trace_service.get_batch_trace(db, batch_type, batch_id)
    except DomainError as exc:
        _raise_http(exc)
