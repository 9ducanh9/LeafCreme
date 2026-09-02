"""
Security Middleware: Thêm security headers vào responses
"""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from typing import Callable


class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Middleware để thêm security headers vào tất cả responses
    - X-Content-Type-Options: nosniff - Ngăn MIME type sniffing
    - X-Frame-Options: DENY - Ngăn clickjacking
    - X-XSS-Protection: 1; mode=block - XSS protection (legacy browsers)
    - Referrer-Policy: strict-origin-when-cross-origin - Control referrer info
    - Permissions-Policy: Giới hạn browser features
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next: Callable):
        response = await call_next(request)
        
        # Bỏ qua security headers cho OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return response
        
        # Chỉ thêm security headers nếu chưa có. Các tên cố định bên dưới
        # không trùng với CORS headers do CORSMiddleware quản lý.
        if "X-Content-Type-Options" not in response.headers:
            response.headers["X-Content-Type-Options"] = "nosniff"
        if "X-Frame-Options" not in response.headers:
            response.headers["X-Frame-Options"] = "DENY"
        if "X-XSS-Protection" not in response.headers:
            response.headers["X-XSS-Protection"] = "1; mode=block"
        if "Referrer-Policy" not in response.headers:
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions-Policy: Giới hạn các browser features không cần thiết
        if "Permissions-Policy" not in response.headers:
            response.headers["Permissions-Policy"] = (
                "geolocation=(), "
                "microphone=(), "
                "camera=(), "
                "payment=(), "
                "usb=(), "
                "magnetometer=(), "
                "gyroscope=(), "
                "speaker=()"
            )
        
        return response

