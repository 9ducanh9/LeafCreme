"""
Component (LinhKien) domain service.

Extracted from app/routers/components.py (Phase 1 service-layer
migration). Read-only in the original router — no create/update/delete
endpoints exist here (components are created via batch import, see
app.services.batches).
"""
from typing import Optional

from sqlalchemy.orm import Session

from app.models import LinhKien
from app.services.errors import DomainError


class ComponentService:
    @staticmethod
    def list_components(
        db: Session,
        skip: int = 0,
        limit: int = 200,
        search: Optional[str] = None,
        dang_hoat_dong: Optional[bool] = None,
        paginated: bool = False,
        sort_by: str = "ngay_tao",
        sort_dir: str = "desc",
    ) -> list[LinhKien] | dict:
        query = db.query(LinhKien)

        if dang_hoat_dong is not None:
            query = query.filter(LinhKien.dang_hoat_dong == dang_hoat_dong)

        if search:
            term = f"%{search}%"
            query = query.filter((LinhKien.ten_linh_kien.ilike(term)) | (LinhKien.sku.ilike(term)))

        if not paginated:
            return query.order_by(LinhKien.linh_kien_id.desc()).offset(skip).limit(limit).all()

        total = query.count()
        sort_map = {"ten": LinhKien.ten_linh_kien, "ngay_tao": LinhKien.linh_kien_id}
        sort_column = sort_map.get(sort_by, LinhKien.linh_kien_id)
        direction = sort_column.asc() if sort_dir == "asc" else sort_column.desc()
        items = query.order_by(direction, LinhKien.linh_kien_id.asc()).offset(skip).limit(limit).all()
        return {"items": items, "total": total, "skip": skip, "limit": limit}

    @staticmethod
    def get_component(db: Session, component_id: int) -> LinhKien:
        component = db.query(LinhKien).filter(LinhKien.linh_kien_id == component_id).first()
        if not component:
            raise DomainError(status_code=404, detail="Linh kiện không tồn tại")
        return component
