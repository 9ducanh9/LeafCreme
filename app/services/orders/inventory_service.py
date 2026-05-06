from sqlalchemy.orm import Session

from app.services.fefo import alloc_fefo_by_variant

from .errors import DomainError


class InventoryService:
    def allocate_variant(self, db: Session, bienthe_id: int, so_luong: int, error_message: str):
        alloc, ok = alloc_fefo_by_variant(db, bienthe_id, so_luong)
        if not ok:
            raise DomainError(status_code=400, detail=error_message)
        return alloc
