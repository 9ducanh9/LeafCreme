"""Internal actions used by the bounded proactive expiry scenario."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime
from typing import Any, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import NguoiDung, ProactiveInsight
from app.services.alerts import AlertService
from app.services.alerts.alert_service import is_current_high_expiry_alert
from app.services.alerts.product_stock import PRODUCT_STOCK_ALERT_TYPE
from app.services.errors import DomainError


def build_alert_condition(alert: dict[str, Any]) -> dict[str, Any]:
    if alert.get("loai_canh_bao") == PRODUCT_STOCK_ALERT_TYPE:
        digest = alert.get("chi_tiet_ton_kho_san_pham") or {}
        return {
            "alert_id": alert["canhbao_id"],
            "alert_type": alert["loai_canh_bao"],
            "scenario": "product_stock",
            "severity": alert["muc_do_nghiem_trong"],
            "product_count": digest.get("product_count", 0),
            "affected_size_count": digest.get("affected_size_count", 0),
            "unavailable_product_count": digest.get("unavailable_product_count", 0),
            "never_stocked_count": digest.get("never_stocked_count", 0),
            "out_of_stock_count": digest.get("out_of_stock_count", 0),
            "partial_out_of_stock_count": digest.get("partial_out_of_stock_count", 0),
            "low_stock_count": digest.get("low_stock_count", 0),
            "categories": digest.get("categories", {}),
            "products": digest.get("products", []),
        }

    expiry = alert.get("ngay_het_han")
    if isinstance(expiry, datetime):
        expiry = expiry.isoformat()
    return {
        "alert_id": alert["canhbao_id"],
        "alert_type": alert["loai_canh_bao"],
        "scenario": "expiring_batch",
        "severity": alert["muc_do_nghiem_trong"],
        "batch_id": alert.get("lohang_id"),
        "batch_kind": alert.get("loai_lohang"),
        "batch_code": alert.get("ma_lo"),
        "product": alert.get("ten_san_pham"),
        "expires_at": expiry,
        "units_on_hand": alert.get("so_luong_hien_tai"),
    }


def insight_fingerprint(condition: dict[str, Any]) -> str:
    """Keep the Phase 4 dedupe identity stable across the P5 upgrade."""
    if condition.get("scenario") == "product_stock":
        payload = {
            key: condition.get(key)
            for key in (
                "alert_id",
                "alert_type",
                "severity",
                "product_count",
                "affected_size_count",
                "products",
            )
        }
    else:
        payload = {
            key: condition.get(key)
            for key in ("alert_id", "alert_type", "severity", "expires_at", "batch_id", "batch_kind")
        }
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def automation_idempotency_key(condition: dict[str, Any], occurrence: Optional[str] = None) -> str:
    """Include the full observed condition so a genuinely changed state can retry."""
    payload = {"condition": condition, "occurrence": occurrence}
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, default=str).encode("utf-8")
    return f"proactive-notification:{hashlib.sha256(encoded).hexdigest()}"


def capture_notification_state(
    db: Session,
    params: dict[str, Any],
    current_user: Optional[NguoiDung],
) -> dict[str, Any]:
    alert = AlertService().get_alert(db, int(params["source_alert_id"]))
    if alert.get("loai_canh_bao") == PRODUCT_STOCK_ALERT_TYPE:
        digest = alert.get("chi_tiet_ton_kho_san_pham") or {}
        if not digest.get("products"):
            raise DomainError(status_code=409, detail="ACTION_STALE: Tồn kho sản phẩm không còn cần bổ sung")
    elif not is_current_high_expiry_alert(alert):
        raise DomainError(status_code=409, detail="ACTION_STALE: Cảnh báo hạn dùng không còn hiện hành")
    return build_alert_condition(alert)


def revalidate_notification_state(
    db: Session,
    params: dict[str, Any],
    preconditions: dict[str, Any],
    current_user: Optional[NguoiDung],
) -> None:
    live = capture_notification_state(db, params, current_user)
    if live != preconditions:
        raise DomainError(
            status_code=409,
            detail="ACTION_STALE: Dữ liệu lô hàng đã thay đổi sau khi Agent đánh giá",
        )


def create_proactive_notification(
    db: Session,
    params: dict[str, Any],
    current_user: Optional[NguoiDung],
) -> dict[str, Any]:
    evidence = params["evidence"]
    expected_fingerprint = insight_fingerprint(evidence)
    if params["fingerprint"] != expected_fingerprint or int(params["source_alert_id"]) != int(evidence["alert_id"]):
        raise DomainError(status_code=400, detail="Fingerprint hoặc nguồn cảnh báo không khớp bằng chứng")

    existing = db.query(ProactiveInsight).filter(
        ProactiveInsight.fingerprint == params["fingerprint"]
    ).first()
    if existing:
        if params.get("reopen_existing") and existing.trang_thai == "superseded":
            existing.trang_thai = "unread"
            existing.ngay_doc = None
            existing.ngay_xu_ly = None
            existing.ngay_thay_the = None
            db.commit()
            db.refresh(existing)
            return {
                "created": False,
                "reopened": True,
                "insight_id": existing.insight_id,
                "deduplicated": False,
            }
        return {"created": False, "insight_id": existing.insight_id, "deduplicated": True}

    insight = ProactiveInsight(
        source_alert_id=int(params["source_alert_id"]),
        fingerprint=params["fingerprint"],
        scenario=params["scenario"],
        muc_do_nghiem_trong=params["severity"],
        tieu_de=params["title"],
        khuyen_nghi=params["recommendation"],
        bang_chung=evidence,
        tool_trace=params["tool_trace"],
        prompt_version=params["prompt_version"],
        model=params.get("model"),
        used_llm=bool(params["used_llm"]),
        trang_thai="unread",
    )
    db.add(insight)
    try:
        db.commit()
        db.refresh(insight)
        return {"created": True, "insight_id": insight.insight_id, "deduplicated": False}
    except IntegrityError:
        db.rollback()
        existing = db.query(ProactiveInsight).filter(
            ProactiveInsight.fingerprint == params["fingerprint"]
        ).first()
        if existing:
            return {"created": False, "insight_id": existing.insight_id, "deduplicated": True}
        raise
