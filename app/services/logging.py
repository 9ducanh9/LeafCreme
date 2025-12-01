"""
Logging service: Ghi log vào SystemLog
"""
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import Request

from app.models import SystemLog, NguoiDung


def log_action(
    db: Session,
    hanh_dong: str,
    nguoi_dung_id: Optional[int] = None,
    bang_du_lieu: Optional[str] = None,
    ban_ghi_id: Optional[int] = None,
    chi_tiet_cu: Optional[Dict[str, Any]] = None,
    chi_tiet_moi: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> SystemLog:
    """
    Ghi log hành động vào SystemLog
    
    Args:
        db: Database session
        hanh_dong: Tên hành động (VD: "create_user", "update_product", "delete_order")
        nguoi_dung_id: ID người dùng thực hiện
        bang_du_lieu: Tên bảng (VD: "nguoidung", "sanpham")
        ban_ghi_id: ID bản ghi bị thay đổi
        chi_tiet_cu: Dữ liệu cũ (cho update/delete)
        chi_tiet_moi: Dữ liệu mới (cho create/update)
        ip_address: IP address của client
        user_agent: User agent string
    
    Returns:
        SystemLog instance đã được tạo
    """
    log_entry = SystemLog(
        nguoi_dung_id=nguoi_dung_id,
        hanh_dong=hanh_dong,
        bang_du_lieu=bang_du_lieu,
        ban_ghi_id=ban_ghi_id,
        chi_tiet_cu=chi_tiet_cu,
        chi_tiet_moi=chi_tiet_moi,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    
    return log_entry


def extract_client_info(request: Request) -> tuple[Optional[str], Optional[str]]:
    """
    Lấy IP address và User Agent từ request
    """
    ip_address = None
    user_agent = None
    
    # Lấy IP address (xử lý proxy/load balancer)
    if request.client:
        ip_address = request.client.host
    
    # Forwarded headers
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        ip_address = forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        ip_address = real_ip
    
    # User Agent
    user_agent = request.headers.get("User-Agent")
    
    return ip_address, user_agent


def serialize_model_for_log(model_instance) -> Dict[str, Any]:
    """
    Serialize SQLAlchemy model instance thành dict để lưu log
    Chỉ lấy các column values, bỏ qua relationships
    """
    if model_instance is None:
        return {}
    
    result = {}
    for column in model_instance.__table__.columns:
        value = getattr(model_instance, column.name)
        # Convert datetime, date, Decimal to string hoặc số
        if hasattr(value, 'isoformat'):
            result[column.name] = value.isoformat()
        elif hasattr(value, '__float__'):
            result[column.name] = float(value)
        else:
            result[column.name] = value
    
    return result

