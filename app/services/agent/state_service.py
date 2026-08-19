"""Business state snapshot for the Operations Agent.

Pulls a point-in-time read of "what needs attention" from the existing
domain services/tables — inventory alerts, batches, orders — into one
shape the insight engine (see agent_service.py) and the admin UI can both
consume. Deliberately read-only and side-effect free.
"""
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import DonHang
from app.services.alerts import AlertService

_alert_service = AlertService()

# Orders sitting in these statuses for longer than STALE_ORDER_HOURS are
# flagged as stuck — nobody has moved them forward.
STALE_ORDER_HOURS = 24
_ACTIONABLE_ORDER_STATUSES = ("cho", "cho_coc", "dang_xu_ly")


@dataclass(frozen=True)
class BusinessStateSnapshot:
    generated_at: datetime
    alert_summary: dict
    urgent_alerts: list[dict]
    stale_orders: list[dict]
    stale_order_count: int

    def to_dict(self) -> dict:
        return {
            "generated_at": self.generated_at,
            "alert_summary": self.alert_summary,
            "urgent_alerts": self.urgent_alerts,
            "stale_orders": self.stale_orders,
            "stale_order_count": self.stale_order_count,
        }


def _get_stale_orders(db: Session, hours: int, limit: int) -> tuple[list[dict], int]:
    cutoff = datetime.now() - timedelta(hours=hours)
    query = db.query(DonHang).filter(
        DonHang.trang_thai.in_(_ACTIONABLE_ORDER_STATUSES),
        DonHang.ngay_tao <= cutoff,
    )
    total = query.count()
    rows = query.order_by(DonHang.ngay_tao.asc()).limit(limit).all()
    orders = [
        {
            "donhang_id": o.donhang_id,
            "ma_don_hang": o.ma_don_hang,
            "trang_thai": o.trang_thai,
            "loai_don": o.loai_don,
            "tien_thanh_toan": o.tien_thanh_toan,
            "ngay_tao": o.ngay_tao,
            "hours_open": round((datetime.now() - o.ngay_tao).total_seconds() / 3600, 1),
        }
        for o in rows
    ]
    return orders, total


def list_stale_orders(db: Session, hours: int = STALE_ORDER_HOURS, limit: int = 10) -> dict:
    """Public, tool-callable wrapper around `_get_stale_orders` — used by
    AgentTool "list_stale_orders" so the chat agent can pull this on its
    own instead of only seeing it pre-baked into an insight."""
    orders, total = _get_stale_orders(db, hours, limit)
    return {"orders": orders, "total": total}


def build_snapshot(db: Session, stale_order_hours: int = STALE_ORDER_HOURS, limit: int = 10) -> BusinessStateSnapshot:
    alert_summary = _alert_service.get_summary(db)
    urgent_alerts = _alert_service.list_alerts(
        db, trang_thai="chua_xu_ly", limit=limit, sort_by="muc_do", sort_dir="desc"
    )
    stale_orders, stale_order_count = _get_stale_orders(db, stale_order_hours, limit)

    return BusinessStateSnapshot(
        generated_at=datetime.now(),
        alert_summary=alert_summary,
        urgent_alerts=urgent_alerts,
        stale_orders=stale_orders,
        stale_order_count=stale_order_count,
    )
