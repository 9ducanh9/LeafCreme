"""
BakeryOnl API - Main application entry point
"""
from fastapi import FastAPI, Request, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
import os

from app.db import get_db
from app.core.config import settings
from app.routers import (
    products, batches, orders, auth, users, 
    suppliers, payments, reports
)
from app.middleware.logging_middleware import LoggingMiddleware

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
# CORS Configuration - Environment-based
# =========================================================
# Lấy allowed origins từ environment hoặc default
allowed_origins_env = os.getenv("CORS_ORIGINS", "*")
if allowed_origins_env == "*":
    allowed_origins = ["*"]
else:
    # Cho phép nhiều origins, phân cách bởi dấu phẩy
    allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging Middleware - Log tất cả requests và responses
app.add_middleware(LoggingMiddleware)

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
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(products.router)
app.include_router(batches.router)
app.include_router(orders.router)
app.include_router(suppliers.router)
app.include_router(payments.router)
app.include_router(reports.router)

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
        "timestamp": datetime.utcnow().isoformat(),
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
        "timestamp": datetime.utcnow().isoformat(),
        "database": {
            "status": db_status,
            "error": db_error
        },
        "service": "BakeryOnl API"
    }


