"""
Logging Middleware: Log tất cả requests và responses
"""
import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from typing import Callable
import logging

# Setup logger
logger = logging.getLogger("bakeryonl.api")
logger.setLevel(logging.INFO)

# Console handler
if not logger.handlers:
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware để log tất cả requests và responses
    - Log: method, path, IP, User-Agent, status code, response time
    - Bỏ qua các path: /docs, /redoc, /openapi.json, /health
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        # Các path không cần log chi tiết
        self.skip_paths = ["/docs", "/redoc", "/openapi.json", "/health", "/favicon.ico"]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Bỏ qua logging cho các path không quan trọng
        if request.url.path in self.skip_paths:
            return await call_next(request)
        
        # Lấy thông tin request
        start_time = time.time()
        method = request.method
        path = request.url.path
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        # Log request
        logger.info(
            f"→ {method} {path} | IP: {client_ip} | "
            f"User-Agent: {user_agent[:50]}"
        )
        
        # Xử lý request
        try:
            response = await call_next(request)
            
            # Tính thời gian xử lý
            process_time = time.time() - start_time
            
            # Log response
            status_code = response.status_code
            status_emoji = "✅" if 200 <= status_code < 300 else "⚠️" if 300 <= status_code < 400 else "❌"
            
            logger.info(
                f"{status_emoji} {method} {path} | "
                f"Status: {status_code} | "
                f"Time: {process_time:.3f}s | "
                f"IP: {client_ip}"
            )
            
            # Thêm header response time
            response.headers["X-Process-Time"] = str(process_time)
            
            return response
            
        except Exception as e:
            # Log lỗi
            process_time = time.time() - start_time
            logger.error(
                f"❌ {method} {path} | "
                f"Error: {str(e)} | "
                f"Time: {process_time:.3f}s | "
                f"IP: {client_ip}",
                exc_info=True
            )
            raise




