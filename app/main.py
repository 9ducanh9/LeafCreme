"""
BakeryOnl API - Main application entry point
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, Request, status, Depends
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db import get_db
from app.core.config import settings
from app.routers import (
    products,
    batches,
    orders,
    auth,
    users,
    suppliers,
    payments,
    reports,
    analytics,
    gift_boxes,
    lookup,
    components,
    leafie,
    alerts,
    inventory_trace,
)
from app.middleware.logging_middleware import LoggingMiddleware
from app.middleware.security_middleware import SecurityMiddleware
from app.scheduler import shutdown_scheduler, start_scheduler


@asynccontextmanager
async def lifespan(_: FastAPI):
    start_scheduler()
    try:
        yield
    finally:
        shutdown_scheduler()


app = FastAPI(
    title="BakeryOnl API",
    description="Hệ thống quản lý bánh kẹo - API Documentation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(LoggingMiddleware)
app.add_middleware(SecurityMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # exc.errors() can contain non-JSON-native types (Decimal, datetime, ...)
    # pulled straight from the failed field/constraint — e.g. a `gia_co_ban`
    # (Decimal) validation error embeds a Decimal in its `ctx`. JSONResponse
    # renders via plain json.dumps, which can't serialize those, so without
    # jsonable_encoder this handler itself raises and every such validation
    # error surfaces to the client as an opaque 500 instead of the intended
    # 422 with the actual field error. jsonable_encoder is what FastAPI's
    # own request handling normally uses to make response bodies JSON-safe;
    # this handler needs it too since it builds the JSONResponse manually.
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content=jsonable_encoder({"error": "Validation Error", "detail": exc.errors(), "body": exc.body}),
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "detail": "Đã xảy ra lỗi không mong đợi. Vui lòng thử lại sau.",
            "path": str(request.url.path),
        },
    )


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
app.include_router(alerts.router)
app.include_router(inventory_trace.router)


@app.get("/", tags=["root"])
def root():
    return {
        "name": "BakeryOnl API",
        "version": "1.0.0",
        "description": "Hệ thống quản lý bánh kẹo",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat(), "service": "BakeryOnl API"}


@app.get("/health/db", tags=["health"])
def health_check_db(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
        db_error = None
    except Exception as e:
        db_status = "disconnected"
        db_error = str(e)

    return {
        "status": "healthy" if db_status == "connected" else "unhealthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {"status": db_status, "error": db_error},
        "service": "BakeryOnl API",
    }
