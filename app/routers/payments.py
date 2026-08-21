"""
Payments router: Quản lý thanh toán

Thin by design — validates input/transport concerns and translates
DomainError -> HTTPException; all business logic lives in
app.services.payments.PaymentService (see PHASE 1 note in that module).
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.db import get_db
from app.core.capabilities import require_capability
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.models import NguoiDung
from app.schemas import ThongTinGiaoDich
from app.services.payments import DomainError, PaymentService

router = APIRouter(prefix="/payments", tags=["payments"])
payment_service = PaymentService()


def _raise_http(exc: DomainError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail)


# =========================================================
# Request/Response Schemas
# =========================================================
class PaymentCreate(BaseModel):
    """Tạo thanh toán mới"""

    donhang_id: int = Field(..., description="ID đơn hàng")
    phuong_thuc: str = Field(..., description="Phương thức: tien_mat, chuyen_khoan, the_tin_dung, vi_dien_tu")
    so_tien: Decimal = Field(..., gt=0, description="Số tiền thanh toán")
    ma_giao_dich: Optional[str] = Field(None, max_length=100, description="Mã giao dịch từ cổng thanh toán")
    thong_tin_giao_dich: Optional[ThongTinGiaoDich] = Field(None, description="Thông tin giao dịch từ cổng thanh toán")


class PaymentUpdate(BaseModel):
    """Cập nhật thanh toán"""

    trang_thai: Optional[str] = Field(None, description="Trạng thái: dang_xu_ly, thanh_cong, that_bai, da_hoan_tien")
    ma_giao_dich: Optional[str] = Field(None, max_length=100)
    thong_tin_giao_dich: Optional[ThongTinGiaoDich] = None
    ngay_thanh_toan: Optional[datetime] = None


class PaymentVerifyRequest(BaseModel):
    """Verify payment từ callback gateway"""

    ma_giao_dich: str = Field(..., description="Mã giao dịch từ gateway")
    trang_thai: str = Field(..., description="Trạng thái từ gateway")
    thong_tin_giao_dich: Optional[dict] = Field(None, description="Toàn bộ response từ gateway")


class PaymentResponse(BaseModel):
    """Thông tin thanh toán"""

    thanhtoan_id: int
    donhang_id: int
    phuong_thuc: str
    so_tien: Decimal
    trang_thai: str
    ma_giao_dich: Optional[str] = None
    thong_tin_giao_dich: Optional[dict] = None
    ngay_thanh_toan: Optional[datetime] = None
    ngay_tao: datetime
    # Order info
    ma_don_hang: Optional[str] = None
    tong_tien_don_hang: Optional[Decimal] = None

    model_config = ConfigDict(from_attributes=True)


class MomoCreateRequest(BaseModel):
    donhang_id: int = Field(..., description="ID đơn hàng")


class MomoCreateResponse(BaseModel):
    payment_id: int
    payment_url: str


class MomoQRCreateRequest(BaseModel):
    donhang_id: int = Field(..., description="ID đơn hàng")


class MomoQRPaymentInfo(BaseModel):
    payment_id: int
    method: str
    phone_number: str
    account_name: str
    amount: int
    transfer_content: str
    qr_code: Optional[str] = None
    qr_image: Optional[str] = None
    instructions: List[str]


class MomoQRConfirmRequest(BaseModel):
    payment_id: int = Field(..., description="ID thanh toán")
    confirmed: bool = Field(..., description="Đã nhận tiền hay chưa")
    transaction_note: Optional[str] = Field(None, description="Ghi chú từ admin")


# =========================================================
# Endpoints
# =========================================================
@router.get("", response_model=List[PaymentResponse])
def list_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    donhang_id: Optional[int] = Query(None, description="Filter theo đơn hàng"),
    trang_thai: Optional[str] = Query(None, description="Filter theo trạng thái"),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("payments.read")),
):
    """Danh sách thanh toán"""
    return payment_service.list_payments(
        db=db,
        current_user=current_user,
        skip=skip,
        limit=limit,
        donhang_id=donhang_id,
        trang_thai=trang_thai,
    )


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(payment_id: int, db: Session = Depends(get_db), current_user: NguoiDung = Depends(require_capability("payments.read"))):
    """Lấy thông tin chi tiết thanh toán"""
    try:
        return payment_service.get_payment(db, payment_id, current_user)
    except DomainError as exc:
        _raise_http(exc)


# =========================================================
# MoMo Payment Endpoints
# =========================================================
@router.post("/momo/create", response_model=MomoCreateResponse, status_code=status.HTTP_201_CREATED)
def create_momo_payment(
    payload: MomoCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_user),
):
    """Tạo thanh toán MoMo"""
    try:
        result = payment_service.create_momo_payment(db, payload, current_user)
        return MomoCreateResponse(**result)
    except DomainError as exc:
        _raise_http(exc)


@router.get("/momo/ipn", operation_id="momo_ipn_get")
@router.post("/momo/ipn", operation_id="momo_ipn_post")
async def momo_ipn(request: Request, db: Session = Depends(get_db)):
    """MoMo IPN (Instant Payment Notification) callback"""
    try:
        if request.method == "POST":
            body = await request.json()
        else:
            body = dict(request.query_params)
    except Exception:
        return JSONResponse(status_code=400, content={"resultCode": 1, "message": "Invalid request"})

    if not settings.MOMO_SECRET_KEY:
        return JSONResponse(status_code=500, content={"resultCode": 1, "message": "Missing MoMo config"})

    result = payment_service.handle_momo_ipn(db, body)
    return JSONResponse(status_code=200, content=result)


@router.get("/momo/return")
def momo_return(request: Request, db: Session = Depends(get_db)):
    """MoMo return URL - redirect user after payment"""
    params = dict(request.query_params)
    target = payment_service.resolve_momo_return(db, params)
    return RedirectResponse(url=target)


# =========================================================
# MoMo QR Simple Payment Endpoints (không cần Business API)
# =========================================================
@router.post("/momo-qr/create", response_model=MomoQRPaymentInfo, status_code=status.HTTP_201_CREATED)
def create_momo_qr_payment(
    payload: MomoQRCreateRequest, db: Session = Depends(get_db), current_user: NguoiDung = Depends(get_current_user)
):
    """
    Tạo thanh toán MoMo QR đơn giản (không cần API)
    Hiển thị QR cho khách quét và chuyển tiền
    """
    try:
        result = payment_service.create_momo_qr_payment(db, payload, current_user)
        return MomoQRPaymentInfo(**result)
    except DomainError as exc:
        _raise_http(exc)


@router.post("/momo-qr/{payment_id}/confirm", response_model=PaymentResponse)
def confirm_momo_qr_payment(
    payment_id: int,
    payload: MomoQRConfirmRequest,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("payments.manual.create")),
):
    """
    Admin xác nhận đã nhận tiền MoMo (manual confirmation)
    """
    try:
        return payment_service.confirm_momo_qr_payment(db, payment_id, payload, current_user)
    except DomainError as exc:
        _raise_http(exc)


@router.get("/orders/{order_id}", response_model=List[PaymentResponse])
def get_order_payments(
    order_id: int, db: Session = Depends(get_db), current_user: NguoiDung = Depends(require_capability("payments.read"))
):
    """Lấy danh sách thanh toán của đơn hàng"""
    try:
        return payment_service.get_order_payments(db, order_id, current_user)
    except DomainError as exc:
        _raise_http(exc)


@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment(
    payload: PaymentCreate, db: Session = Depends(get_db), current_user: NguoiDung = Depends(require_capability("payments.manual.create"))
):
    """Tạo thanh toán mới"""
    try:
        return payment_service.create_payment(db, payload, current_user)
    except DomainError as exc:
        _raise_http(exc)


@router.put("/{payment_id}/status", response_model=PaymentResponse)
def update_payment_status(
    payment_id: int,
    payload: PaymentUpdate,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("payments.verify")),
):
    """Cập nhật trạng thái thanh toán (chỉ admin/manager)"""
    try:
        return payment_service.update_payment_status(db, payment_id, payload, current_user)
    except DomainError as exc:
        _raise_http(exc)


@router.post("/{payment_id}/verify", response_model=PaymentResponse)
def verify_payment(
    payment_id: int,
    payload: PaymentVerifyRequest,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("payments.verify")),
):
    """
    Verify thanh toán từ callback của payment gateway
    (Có thể mở rộng để không cần auth nếu gateway gọi trực tiếp)
    """
    try:
        return payment_service.verify_payment(db, payment_id, payload, current_user)
    except DomainError as exc:
        _raise_http(exc)
