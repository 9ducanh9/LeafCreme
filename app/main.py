"""
BakeryOnl API - Main application entry point
"""
# Load environment variables FIRST, before any other imports
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timezone
import os
from pathlib import Path

from app.db import get_db
from app.routers import (
    products, batches, orders, auth, users, 
    suppliers, payments, reports, analytics, gift_boxes, lookup, components, leafie
)
from app.middleware.logging_middleware import LoggingMiddleware
from app.middleware.security_middleware import SecurityMiddleware

# =========================================================
# FastAPI App Configuration
# =========================================================
app = FastAPI(
    title="BakeryOnl API",
    description="Hệ thống quản lý bánh kẹo - API Documentation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# =========================================================
# Middleware Configuration
# =========================================================
# LƯU Ý: Trong FastAPI, middleware được thực thi theo thứ tự NGƯỢC LẠI
# (middleware được add cuối cùng sẽ chạy đầu tiên)
# Vì vậy, CORS phải được add CUỐI CÙNG để chạy ĐẦU TIÊN

# Logging Middleware - Log tất cả requests và responses (chạy cuối cùng)
app.add_middleware(LoggingMiddleware)

# Security Middleware - Thêm security headers vào responses (chạy giữa)
app.add_middleware(SecurityMiddleware)

# CORS Middleware - Xử lý CORS headers (chạy đầu tiên - QUAN TRỌNG!)
# Lấy allowed origins từ environment hoặc default
allowed_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173")
if allowed_origins_env == "*":
    # Khi dùng allow_credentials=True, không thể dùng "*"
    # Default cho development: localhost:3000 và localhost:5173 (Vite default)
    allowed_origins = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"]
else:
    # Cho phép nhiều origins, phân cách bởi dấu phẩy
    allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# =========================================================
# Global Exception Handlers
# =========================================================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Custom handler cho validation errors"""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "detail": exc.errors(),
            "body": exc.body
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler cho các lỗi không mong đợi"""
    # Log error ở đây (có thể dùng logging service)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "detail": "Đã xảy ra lỗi không mong đợi. Vui lòng thử lại sau.",
            "path": str(request.url.path)
        }
    )

# =========================================================
# Routers Registration
# =========================================================
# Static files for uploads
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(products.router)
app.include_router(batches.router)
app.include_router(orders.router)
app.include_router(suppliers.router)
app.include_router(payments.router)
app.include_router(reports.router)
app.include_router(analytics.router)
app.include_router(gift_boxes.router)
app.include_router(gift_boxes.public_router)
app.include_router(lookup.router)
app.include_router(components.router)
app.include_router(leafie.router)

# =========================================================
# Root Endpoint
# =========================================================

@app.get("/", tags=["root"])
def root():
    """Root endpoint - API information"""
    return {
        "name": "BakeryOnl API",
        "version": "1.0.0",
        "description": "Hệ thống quản lý bánh kẹo",
        "docs": "/docs",
        "health": "/health"
    }

# =========================================================
# Health Check & Status Endpoints
# =========================================================

@app.get("/health", tags=["health"])
def health_check():
    """Health check endpoint - kiểm tra server status"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "BakeryOnl API"
    }


@app.get("/health/db", tags=["health"])
def health_check_db(db: Session = Depends(get_db)):
    """Health check với database connection"""
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        db_status = "connected"
        db_error = None
    except Exception as e:
        db_status = "disconnected"
        db_error = str(e)
    
    return {
        "status": "healthy" if db_status == "connected" else "unhealthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "status": db_status,
            "error": db_error
        },
        "service": "BakeryOnl API"
    }


