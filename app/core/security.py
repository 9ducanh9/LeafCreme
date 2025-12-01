"""
Security utilities: Password hashing và JWT tokens
"""
from datetime import datetime, timedelta
from typing import Optional, Dict
from jose import JWTError, jwt
import bcrypt
from app.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password với hash (bcrypt)"""
    try:
        password_bytes = plain_password.encode('utf-8')
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hash_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Hash password bằng bcrypt"""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hash_bytes = bcrypt.hashpw(password_bytes, salt)
    return hash_bytes.decode('utf-8')


def create_access_token(data: Dict, expires_delta: Optional[timedelta] = None) -> str:
    """Tạo JWT access token"""
    to_encode = data.copy()
    
    # Convert 'sub' to string if it's an integer (jose requires string)
    if "sub" in to_encode and isinstance(to_encode["sub"], int):
        to_encode["sub"] = str(to_encode["sub"])
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: Dict) -> str:
    """Tạo JWT refresh token"""
    to_encode = data.copy()
    
    # Convert 'sub' to string if it's an integer (jose requires string)
    if "sub" in to_encode and isinstance(to_encode["sub"], int):
        to_encode["sub"] = str(to_encode["sub"])
    
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[Dict]:
    """Decode và verify JWT token"""
    import logging
    logger = logging.getLogger("bakeryonl.api")
    
    try:
        # Debug: Log token info
        logger.debug(f"Decoding token: length={len(token)}, preview={token[:50]}...")
        logger.debug(f"Using SECRET_KEY: length={len(settings.SECRET_KEY)}, algorithm={settings.ALGORITHM}")
        
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        logger.debug(f"Token decoded successfully: user_id={payload.get('sub')}, type={payload.get('type')}")
        return payload
    except JWTError as e:
        # Log error for debugging
        logger.warning(f"JWT decode error: {str(e)}")
        logger.warning(f"Token preview: {token[:50]}...")
        logger.warning(f"SECRET_KEY length: {len(settings.SECRET_KEY)}")
        return None
    except Exception as e:
        # Catch any other exceptions
        logger.error(f"Unexpected error decoding token: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return None

