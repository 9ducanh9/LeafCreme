"""
Dependencies cho authentication và authorization
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from app.db import get_db
from app.models import NguoiDung, VaiTro
from app.core.security import decode_token
from app.core.config import settings

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> NguoiDung:
    """
    Dependency để lấy current user từ JWT token
    """
    token = credentials.credentials
    
    # Debug logging
    import logging
    logger = logging.getLogger("bakeryonl.api")
    
    # Debug: Log token info
    logger.info(f"Received token for /auth/me: length={len(token)}, preview={token[:50]}...")
    
    payload = decode_token(token)
    
    if payload is None:
        logger.error(f"❌ Token decode failed!")
        logger.error(f"   Token preview: {token[:50]}... (length: {len(token)})")
        logger.error(f"   SECRET_KEY length: {len(settings.SECRET_KEY)}")
        logger.error(f"   Algorithm: {settings.ALGORITHM}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if payload.get("type") != "access":
        logger.warning(f"Token type mismatch - expected 'access', got '{payload.get('type')}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user_id from payload (can be string or int)
    user_id_raw = payload.get("sub")
    if user_id_raw is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Convert to int if it's a string
    user_id = int(user_id_raw) if isinstance(user_id_raw, str) else user_id_raw
    
    user = db.query(NguoiDung).filter(NguoiDung.nguoidung_id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.dang_hoat_dong:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )
    
    return user


def get_current_active_user(
    current_user: NguoiDung = Depends(get_current_user)
) -> NguoiDung:
    """Dependency để đảm bảo user đang active"""
    if not current_user.dang_hoat_dong:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    return current_user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[NguoiDung]:
    """
    Optional dependency để lấy user nếu có token, không thì trả về None
    Cho phép public access nhưng vẫn có thể lấy user info nếu đã login
    """
    if credentials is None:
        return None
    
    try:
        token = credentials.credentials
        payload = decode_token(token)
        
        if payload is None or payload.get("type") != "access":
            return None
        
        # Get user_id from payload (can be string or int)
        user_id_raw = payload.get("sub")
        if user_id_raw is None:
            return None
        
        # Convert to int if it's a string
        user_id = int(user_id_raw) if isinstance(user_id_raw, str) else user_id_raw
        
        user = db.query(NguoiDung).filter(NguoiDung.nguoidung_id == user_id).first()
        if user and user.dang_hoat_dong:
            return user
        return None
    except Exception:
        return None


def require_role(*allowed_roles: str):
    """
    Dependency factory để check role
    Usage: Depends(require_role("admin", "manager"))
    """
    def role_checker(current_user: NguoiDung = Depends(get_current_active_user)) -> NguoiDung:
        # Lấy tên vai trò từ relationship
        vaitro_ten = current_user.vaitro.ten_vai_tro if current_user.vaitro else None
        
        if vaitro_ten not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role: {', '.join(allowed_roles)}"
            )
        return current_user
    
    return role_checker


