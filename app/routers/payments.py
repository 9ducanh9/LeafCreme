"""
Payments router: Quản lý thanh toán
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field

from app.db import get_db
from app.models import ThanhToan, DonHang
from app.core.dependencies import get_current_user, require_role
from app.core.config import settings
from app.schemas import ThongTinGiaoDich, validate_thong_tin_giao_dich
from app.services.momo import create_payment_request, verify_signature, parse_momo_datetime
from app.services.momo_qr import create_momo_payment_info
import requests
import uuid

router = APIRouter(prefix="/payments", tags=["payments"])


# =========================================================
# Request/Response Schemas
# =========================================================
class PaymentCreate(BaseModel):
    """Tạo thanh toán mới"""
    donhang_id: int = Field(..., description="ID đơn hàng")
    phuong_thuc: str = Field(..., description="Phương thức: tien_mat, chuyen_khoan, the, vi_dien_tu")
    so_tien: Decimal = Field(..., gt=0, description="Số tiền thanh toán")
    ma_giao_dich: Optional[str] = Field(None, max_length=100, description="Mã giao dịch từ cổng thanh toán")
    thong_tin_giao_dich: Optional[ThongTinGiaoDich] = Field(
        None,
        description="Thông tin giao dịch từ cổng thanh toán"
    )


class PaymentUpdate(BaseModel):
    """Cập nhật thanh toán"""
    trang_thai: Optional[str] = Field(None, description="Trạng thái: dang_xu_ly, thanh_cong, that_bai, huy")
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
    
    class Config:
        from_attributes = True


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
    current_user = Depends(get_current_user)
):
    """Danh sách thanh toán"""
    query = db.query(ThanhToan)
    
    # Filter theo đơn hàng
    if donhang_id:
        query = query.filter(ThanhToan.donhang_id == donhang_id)
    
    # Filter theo trạng thái
    if trang_thai:
        query = query.filter(ThanhToan.trang_thai == trang_thai)
    
    # Nếu không phải admin/manager, chỉ xem thanh toán của đơn hàng mình
    vaitro_ten = current_user.vaitro.ten_vai_tro if current_user.vaitro else None
    if vaitro_ten not in ["admin", "manager"]:
        # Join với DonHang để filter theo user
        query = query.join(DonHang).filter(
            DonHang.nguoidung_id == current_user.nguoidung_id
        )
    
    payments = query.order_by(desc(ThanhToan.ngay_tao)).offset(skip).limit(limit).all()
    
    # Thêm thông tin đơn hàng
    result = []
    for payment in payments:
        order = db.query(DonHang).filter(DonHang.donhang_id == payment.donhang_id).first()
        payment_dict = {
            **{c.name: getattr(payment, c.name) for c in payment.__table__.columns},
            "ma_don_hang": order.ma_don_hang if order else None,
            "tong_tien_don_hang": order.tong_tien if order else None
        }
        result.append(PaymentResponse(**payment_dict))
    
    return result


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Lấy thông tin chi tiết thanh toán"""
    payment = db.query(ThanhToan).filter(ThanhToan.thanhtoan_id == payment_id).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thanh toán không tồn tại"
        )
    
    # Kiểm tra quyền
    order = db.query(DonHang).filter(DonHang.donhang_id == payment.donhang_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Đơn hàng không tồn tại"
        )
    
    vaitro_ten = current_user.vaitro.ten_vai_tro if current_user.vaitro else None
    if vaitro_ten not in ["admin", "manager"]:
        if order.nguoidung_id != current_user.nguoidung_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xem thanh toán này"
            )
    
    payment_dict = {
        **{c.name: getattr(payment, c.name) for c in payment.__table__.columns},
        "ma_don_hang": order.ma_don_hang,
        "tong_tien_don_hang": order.tong_tien
    }
    
    return PaymentResponse(**payment_dict)


# =========================================================
# MoMo Payment Endpoints
# =========================================================
@router.post("/momo/create", response_model=MomoCreateResponse, status_code=status.HTTP_201_CREATED)
def create_momo_payment(
    payload: MomoCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Tạo thanh toán MoMo"""
    if not settings.MOMO_PARTNER_CODE or not settings.MOMO_ACCESS_KEY or not settings.MOMO_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Thiếu cấu hình MoMo (MOMO_PARTNER_CODE/MOMO_ACCESS_KEY/MOMO_SECRET_KEY)"
        )

    order = db.query(DonHang).filter(DonHang.donhang_id == payload.donhang_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Đơn hàng không tồn tại"
        )

    vaitro_ten = current_user.vaitro.ten_vai_tro if current_user.vaitro else None
    if vaitro_ten not in ["admin", "manager"]:
        if order.nguoidung_id != current_user.nguoidung_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn chỉ có thể thanh toán đơn hàng của mình"
            )

    total_paid = db.query(ThanhToan).filter(
        ThanhToan.donhang_id == order.donhang_id,
        ThanhToan.trang_thai == "thanh_cong"
    ).with_entities(
        func.sum(ThanhToan.so_tien)
    ).scalar() or Decimal("0")

    remaining = (order.tien_thanh_toan or Decimal("0")) - total_paid
    if remaining <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đơn hàng đã được thanh toán đủ"
        )

    payment = ThanhToan(
        donhang_id=order.donhang_id,
        phuong_thuc="vi_dien_tu",
        so_tien=remaining,
        trang_thai="dang_xu_ly",
        thong_tin_giao_dich=validate_thong_tin_giao_dich({
            "ma_giao_dich_ben_thu_3": None,
            "thoi_gian_giao_dich": None,
            "chi_tiet_raw": {"provider": "momo"}
        })
    )
    db.add(payment)
    db.flush()

    # Tạo request ID unique
    request_id = f"MOMO_{payment.thanhtoan_id}_{uuid.uuid4().hex[:8]}"
    order_id = str(payment.thanhtoan_id)
    
    # Số tiền phải là integer (VND)
    amount = int(payment.so_tien or Decimal("0"))

    return_url = f"{settings.BACKEND_BASE_URL.rstrip('/')}/payments/momo/return"
    ipn_url = f"{settings.BACKEND_BASE_URL.rstrip('/')}/payments/momo/ipn"

    momo_request = create_payment_request(
        partner_code=settings.MOMO_PARTNER_CODE,
        access_key=settings.MOMO_ACCESS_KEY,
        secret_key=settings.MOMO_SECRET_KEY,
        order_id=order_id,
        amount=amount,
        order_info=f"Thanh toán đơn {order.ma_don_hang}",
        redirect_url=return_url,
        ipn_url=ipn_url,
        request_id=request_id,
        extra_data="",
        request_type=settings.MOMO_REQUEST_TYPE,
        lang=settings.MOMO_LANG
    )

    # Gọi MoMo API
    try:
        response = requests.post(
            settings.MOMO_PAYMENT_URL,
            json=momo_request,
            timeout=30
        )
        response.raise_for_status()
        momo_response = response.json()
        
        if momo_response.get("resultCode") != 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"MoMo error: {momo_response.get('message', 'Unknown error')}"
            )
        
        payment_url = momo_response.get("payUrl")
        if not payment_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="MoMo không trả về payment URL"
            )
        
        db.commit()
        db.refresh(payment)
        
        return MomoCreateResponse(payment_id=payment.thanhtoan_id, payment_url=payment_url)
        
    except requests.exceptions.RequestException as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi kết nối MoMo: {str(e)}"
        )


@router.api_route("/momo/ipn", methods=["GET", "POST"])
async def momo_ipn(request: Request, db: Session = Depends(get_db)):
    """MoMo IPN (Instant Payment Notification) callback"""
    try:
        if request.method == "POST":
            body = await request.json()
        else:
            body = dict(request.query_params)
    except Exception:
        return JSONResponse(
            status_code=400,
            content={"resultCode": 1, "message": "Invalid request"}
        )

    if not settings.MOMO_SECRET_KEY:
        return JSONResponse(
            status_code=500,
            content={"resultCode": 1, "message": "Missing MoMo config"}
        )

    # Verify signature
    ok, _ = verify_signature(body, settings.MOMO_SECRET_KEY)
    if not ok:
        return JSONResponse(
            status_code=200,
            content={"resultCode": 97, "message": "Invalid signature"}
        )

    order_id = body.get("orderId")
    if not order_id:
        return JSONResponse(
            status_code=200,
            content={"resultCode": 1, "message": "Order not found"}
        )

    try:
        payment_id = int(str(order_id))
    except Exception:
        return JSONResponse(
            status_code=200,
            content={"resultCode": 1, "message": "Invalid order ID"}
        )

    payment = db.query(ThanhToan).filter(ThanhToan.thanhtoan_id == payment_id).first()
    if not payment:
        return JSONResponse(
            status_code=200,
            content={"resultCode": 1, "message": "Payment not found"}
        )

    order = db.query(DonHang).filter(DonHang.donhang_id == payment.donhang_id).first()
    if not order:
        return JSONResponse(
            status_code=200,
            content={"resultCode": 1, "message": "Order not found"}
        )

    # Check amount
    received_amount = body.get("amount")
    if received_amount is None:
        return JSONResponse(
            status_code=200,
            content={"resultCode": 4, "message": "Invalid amount"}
        )

    try:
        expected_amount = int(payment.so_tien or Decimal("0"))
        received_amount = int(received_amount)
    except Exception:
        return JSONResponse(
            status_code=200,
            content={"resultCode": 4, "message": "Invalid amount"}
        )

    if received_amount != expected_amount:
        return JSONResponse(
            status_code=200,
            content={"resultCode": 4, "message": "Amount mismatch"}
        )

    # Check if already processed
    if payment.trang_thai == "thanh_cong":
        return JSONResponse(
            status_code=200,
            content={"resultCode": 2, "message": "Order already confirmed"}
        )

    # Update payment status
    result_code = body.get("resultCode")
    if result_code == 0:
        payment.trang_thai = "thanh_cong"
        payment.ngay_thanh_toan = parse_momo_datetime(str(body.get("responseTime"))) or datetime.utcnow()
    else:
        payment.trang_thai = "that_bai"

    trans_id = body.get("transId")
    if trans_id:
        payment.ma_giao_dich = str(trans_id)

    payment.thong_tin_giao_dich = {
        "ma_giao_dich_ben_thu_3": str(trans_id) if trans_id else None,
        "thoi_gian_giao_dich": str(body.get("responseTime")) if body.get("responseTime") else None,
        "chi_tiet_raw": body
    }

    # Update order status if payment successful
    if payment.trang_thai == "thanh_cong":
        total_paid = db.query(ThanhToan).filter(
            ThanhToan.donhang_id == order.donhang_id,
            ThanhToan.trang_thai == "thanh_cong"
        ).with_entities(
            func.sum(ThanhToan.so_tien)
        ).scalar() or Decimal("0")

        if total_paid >= order.tien_thanh_toan and order.trang_thai == "cho":
            order.trang_thai = "thanh_toan"

    db.commit()

    return JSONResponse(
        status_code=200,
        content={"resultCode": 0, "message": "Success"}
    )


@router.get("/momo/return")
def momo_return(request: Request, db: Session = Depends(get_db)):
    """MoMo return URL - redirect user after payment"""
    params = dict(request.query_params)

    payment_status = "unknown"
    if not settings.MOMO_SECRET_KEY:
        payment_status = "config_error"
    else:
        # MoMo return URL may not have signature, check resultCode
        result_code = params.get("resultCode")
        if result_code == "0":
            payment_status = "success"
        elif result_code:
            payment_status = "failed"
        else:
            payment_status = "unknown"

    order_id = None
    momo_order_id = params.get("orderId")
    if momo_order_id:
        try:
            payment_id = int(str(momo_order_id))
            payment = db.query(ThanhToan).filter(ThanhToan.thanhtoan_id == payment_id).first()
            if payment:
                order_id = payment.donhang_id
        except Exception:
            order_id = None

    if not order_id:
        return RedirectResponse(url=f"{settings.FRONTEND_BASE_URL.rstrip('/')}/")

    target = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/orders/{order_id}/success?payment_status={payment_status}&payment_method=momo"
    return RedirectResponse(url=target)


# =========================================================
# MoMo QR Simple Payment Endpoints (không cần Business API)
# =========================================================
@router.post("/momo-qr/create", response_model=MomoQRPaymentInfo, status_code=status.HTTP_201_CREATED)
def create_momo_qr_payment(
    payload: MomoQRCreateRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Tạo thanh toán MoMo QR đơn giản (không cần API)
    Hiển thị QR cho khách quét và chuyển tiền
    """
    if not settings.MOMO_QR_PHONE:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Chưa cấu hình số điện thoại MoMo (MOMO_QR_PHONE)"
        )

    order = db.query(DonHang).filter(DonHang.donhang_id == payload.donhang_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Đơn hàng không tồn tại"
        )

    vaitro_ten = current_user.vaitro.ten_vai_tro if current_user.vaitro else None
    if vaitro_ten not in ["admin", "manager"]:
        if order.nguoidung_id != current_user.nguoidung_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn chỉ có thể thanh toán đơn hàng của mình"
            )

    total_paid = db.query(ThanhToan).filter(
        ThanhToan.donhang_id == order.donhang_id,
        ThanhToan.trang_thai == "thanh_cong"
    ).with_entities(
        func.sum(ThanhToan.so_tien)
    ).scalar() or Decimal("0")

    remaining = (order.tien_thanh_toan or Decimal("0")) - total_paid
    if remaining <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đơn hàng đã được thanh toán đủ"
        )

    # Tạo payment record
    payment = ThanhToan(
        donhang_id=order.donhang_id,
        phuong_thuc="vi_dien_tu",
        so_tien=remaining,
        trang_thai="dang_xu_ly",
        thong_tin_giao_dich=validate_thong_tin_giao_dich({
            "ma_giao_dich_ben_thu_3": None,
            "thoi_gian_giao_dich": None,
            "chi_tiet_raw": {"provider": "momo_qr", "method": "manual"}
        })
    )
    db.add(payment)
    db.flush()

    # Tạo thông tin thanh toán với QR
    payment_info = create_momo_payment_info(
        order_code=order.ma_don_hang,
        amount=int(remaining),
        phone_number=settings.MOMO_QR_PHONE,
        account_name=settings.MOMO_QR_ACCOUNT_NAME or "Leaf Creme",
        qr_image_path=settings.MOMO_QR_IMAGE_PATH or None
    )

    db.commit()
    db.refresh(payment)

    return MomoQRPaymentInfo(
        payment_id=payment.thanhtoan_id,
        **payment_info
    )


@router.post("/momo-qr/{payment_id}/confirm", response_model=PaymentResponse)
def confirm_momo_qr_payment(
    payment_id: int,
    payload: MomoQRConfirmRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin", "manager", "staff"))
):
    """
    Admin xác nhận đã nhận tiền MoMo (manual confirmation)
    """
    if payload.payment_id != payment_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment ID không khớp"
        )

    payment = db.query(ThanhToan).filter(ThanhToan.thanhtoan_id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thanh toán không tồn tại"
        )

    order = db.query(DonHang).filter(DonHang.donhang_id == payment.donhang_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Đơn hàng không tồn tại"
        )

    if payload.confirmed:
        # Admin xác nhận đã nhận tiền
        payment.trang_thai = "thanh_cong"
        payment.ngay_thanh_toan = datetime.utcnow()
        
        # Lưu thông tin xác nhận
        if payment.thong_tin_giao_dich:
            payment.thong_tin_giao_dich["confirmed_by"] = current_user.nguoidung_id
            payment.thong_tin_giao_dich["confirmed_at"] = datetime.utcnow().isoformat()
            if payload.transaction_note:
                payment.thong_tin_giao_dich["admin_note"] = payload.transaction_note
        
        # Cập nhật trạng thái đơn hàng
        total_paid = db.query(ThanhToan).filter(
            ThanhToan.donhang_id == order.donhang_id,
            ThanhToan.trang_thai == "thanh_cong"
        ).with_entities(
            func.sum(ThanhToan.so_tien)
        ).scalar() or Decimal("0")

        if total_paid >= order.tien_thanh_toan and order.trang_thai == "cho":
            order.trang_thai = "thanh_toan"
    else:
        # Admin xác nhận KHÔNG nhận được tiền
        payment.trang_thai = "that_bai"
        if payment.thong_tin_giao_dich:
            payment.thong_tin_giao_dich["rejected_by"] = current_user.nguoidung_id
            payment.thong_tin_giao_dich["rejected_at"] = datetime.utcnow().isoformat()
            if payload.transaction_note:
                payment.thong_tin_giao_dich["reject_reason"] = payload.transaction_note

    db.commit()
    db.refresh(payment)

    payment_dict = {
        **{c.name: getattr(payment, c.name) for c in payment.__table__.columns},
        "ma_don_hang": order.ma_don_hang,
        "tong_tien_don_hang": order.tong_tien
    }

    return PaymentResponse(**payment_dict)


@router.get("/orders/{order_id}", response_model=List[PaymentResponse])
def get_order_payments(
    order_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Lấy danh sách thanh toán của đơn hàng"""
    order = db.query(DonHang).filter(DonHang.donhang_id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Đơn hàng không tồn tại"
        )
    
    # Kiểm tra quyền
    vaitro_ten = current_user.vaitro.ten_vai_tro if current_user.vaitro else None
    if vaitro_ten not in ["admin", "manager"]:
        if order.nguoidung_id != current_user.nguoidung_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xem đơn hàng này"
            )
    
    payments = db.query(ThanhToan).filter(
        ThanhToan.donhang_id == order_id
    ).order_by(desc(ThanhToan.ngay_tao)).all()
    
    result = []
    for payment in payments:
        payment_dict = {
            **{c.name: getattr(payment, c.name) for c in payment.__table__.columns},
            "ma_don_hang": order.ma_don_hang,
            "tong_tien_don_hang": order.tong_tien
        }
        result.append(PaymentResponse(**payment_dict))
    
    return result


@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Tạo thanh toán mới"""
    # Validate phương thức
    valid_methods = ["tien_mat", "chuyen_khoan", "the", "vi_dien_tu"]
    if payload.phuong_thuc not in valid_methods:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Phương thức không hợp lệ. Chọn: {', '.join(valid_methods)}"
        )
    
    # Kiểm tra đơn hàng
    order = db.query(DonHang).filter(DonHang.donhang_id == payload.donhang_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Đơn hàng không tồn tại"
        )
    
    # Kiểm tra quyền: user chỉ tạo thanh toán cho đơn hàng của mình
    vaitro_ten = current_user.vaitro.ten_vai_tro if current_user.vaitro else None
    if vaitro_ten not in ["admin", "manager"]:
        if order.nguoidung_id != current_user.nguoidung_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn chỉ có thể thanh toán đơn hàng của mình"
            )
    
    # Kiểm tra số tiền không vượt quá số tiền còn lại của đơn hàng
    total_paid = db.query(ThanhToan).filter(
        ThanhToan.donhang_id == payload.donhang_id,
        ThanhToan.trang_thai == "thanh_cong"
    ).with_entities(
        func.sum(ThanhToan.so_tien)
    ).scalar() or Decimal("0")
    
    remaining = order.tien_thanh_toan - total_paid
    
    if payload.so_tien > remaining:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Số tiền vượt quá số tiền còn lại. Còn lại: {remaining:,.0f} VNĐ"
        )
    
    # Validate và chuẩn hóa thông tin giao dịch
    thong_tin_gd_dict = None
    if payload.thong_tin_giao_dich:
        try:
            thong_tin_gd_dict = validate_thong_tin_giao_dich(
                payload.thong_tin_giao_dich.model_dump()
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Thông tin giao dịch không hợp lệ: {str(e)}"
            )
    
    # Tạo thanh toán
    payment = ThanhToan(
        donhang_id=payload.donhang_id,
        phuong_thuc=payload.phuong_thuc,
        so_tien=payload.so_tien,
        trang_thai="thanh_cong" if payload.phuong_thuc == "tien_mat" else "dang_xu_ly",
        ma_giao_dich=payload.ma_giao_dich,
        thong_tin_giao_dich=thong_tin_gd_dict,
        ngay_thanh_toan=datetime.utcnow() if payload.phuong_thuc == "tien_mat" else None
    )
    
    db.add(payment)
    
    # Cập nhật trạng thái đơn hàng nếu đã thanh toán đủ
    if payment.trang_thai == "thanh_cong":
        new_total_paid = total_paid + payload.so_tien
        if new_total_paid >= order.tien_thanh_toan:
            # Đã thanh toán đủ
            if order.trang_thai == "cho":
                order.trang_thai = "thanh_toan"
    
    db.commit()
    db.refresh(payment)
    
    payment_dict = {
        **{c.name: getattr(payment, c.name) for c in payment.__table__.columns},
        "ma_don_hang": order.ma_don_hang,
        "tong_tien_don_hang": order.tong_tien
    }
    
    return PaymentResponse(**payment_dict)


@router.put("/{payment_id}/status", response_model=PaymentResponse)
def update_payment_status(
    payment_id: int,
    payload: PaymentUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin", "manager"))
):
    """Cập nhật trạng thái thanh toán (chỉ admin/manager)"""
    payment = db.query(ThanhToan).filter(ThanhToan.thanhtoan_id == payment_id).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thanh toán không tồn tại"
        )
    
    order = db.query(DonHang).filter(DonHang.donhang_id == payment.donhang_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Đơn hàng không tồn tại"
        )
    
    # Validate trạng thái
    if payload.trang_thai:
        valid_statuses = ["dang_xu_ly", "thanh_cong", "that_bai", "huy"]
        if payload.trang_thai not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Trạng thái không hợp lệ. Chọn: {', '.join(valid_statuses)}"
            )
        
        old_status = payment.trang_thai
        payment.trang_thai = payload.trang_thai
        
        # Nếu chuyển sang thanh_cong, cập nhật ngày thanh toán và trạng thái đơn hàng
        if payload.trang_thai == "thanh_cong" and old_status != "thanh_cong":
            payment.ngay_thanh_toan = payload.ngay_thanh_toan or datetime.utcnow()
            
            # Kiểm tra xem đã thanh toán đủ chưa
            total_paid = db.query(ThanhToan).filter(
                ThanhToan.donhang_id == order.donhang_id,
                ThanhToan.trang_thai == "thanh_cong"
            ).with_entities(
                func.sum(ThanhToan.so_tien)
            ).scalar() or Decimal("0")
            
            if total_paid >= order.tien_thanh_toan and order.trang_thai == "cho":
                order.trang_thai = "thanh_toan"
        
        # Nếu hủy thanh toán đã thành công, cần cập nhật lại đơn hàng
        elif payload.trang_thai in ["that_bai", "huy"] and old_status == "thanh_cong":
            total_paid = db.query(ThanhToan).filter(
                ThanhToan.donhang_id == order.donhang_id,
                ThanhToan.trang_thai == "thanh_cong"
            ).with_entities(
                func.sum(ThanhToan.so_tien)
            ).scalar() or Decimal("0")
            
            if total_paid < order.tien_thanh_toan and order.trang_thai == "thanh_toan":
                order.trang_thai = "cho"
    
    if payload.ma_giao_dich is not None:
        # Kiểm tra unique
        existing = db.query(ThanhToan).filter(
            ThanhToan.ma_giao_dich == payload.ma_giao_dich,
            ThanhToan.thanhtoan_id != payment_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mã giao dịch '{payload.ma_giao_dich}' đã tồn tại"
            )
        
        payment.ma_giao_dich = payload.ma_giao_dich
    
    if payload.thong_tin_giao_dich is not None:
        try:
            payment.thong_tin_giao_dich = validate_thong_tin_giao_dich(
                payload.thong_tin_giao_dich.model_dump()
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Thông tin giao dịch không hợp lệ: {str(e)}"
            )
    
    if payload.ngay_thanh_toan is not None:
        payment.ngay_thanh_toan = payload.ngay_thanh_toan
    
    db.commit()
    db.refresh(payment)
    
    payment_dict = {
        **{c.name: getattr(payment, c.name) for c in payment.__table__.columns},
        "ma_don_hang": order.ma_don_hang,
        "tong_tien_don_hang": order.tong_tien
    }
    
    return PaymentResponse(**payment_dict)


@router.post("/{payment_id}/verify", response_model=PaymentResponse)
def verify_payment(
    payment_id: int,
    payload: PaymentVerifyRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin", "manager"))
):
    """
    Verify thanh toán từ callback của payment gateway
    (Có thể mở rộng để không cần auth nếu gateway gọi trực tiếp)
    """
    payment = db.query(ThanhToan).filter(ThanhToan.thanhtoan_id == payment_id).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thanh toán không tồn tại"
        )
    
    order = db.query(DonHang).filter(DonHang.donhang_id == payment.donhang_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Đơn hàng không tồn tại"
        )
    
    # Validate trạng thái từ gateway
    if payload.trang_thai == "00" or "success" in payload.trang_thai.lower():
        payment.trang_thai = "thanh_cong"
        payment.ngay_thanh_toan = datetime.utcnow()
    elif "fail" in payload.trang_thai.lower() or "error" in payload.trang_thai.lower():
        payment.trang_thai = "that_bai"
    else:
        payment.trang_thai = "dang_xu_ly"
    
    # Lưu thông tin từ gateway
    if payload.ma_giao_dich:
        payment.ma_giao_dich = payload.ma_giao_dich
    
    if payload.thong_tin_giao_dich:
        try:
            payment.thong_tin_giao_dich = validate_thong_tin_giao_dich(
                payload.thong_tin_giao_dich
            )
        except:
            # Nếu không validate được, lưu raw
            payment.thong_tin_giao_dich = payload.thong_tin_giao_dich
    
    # Cập nhật trạng thái đơn hàng nếu thanh toán thành công
    if payment.trang_thai == "thanh_cong":
        total_paid = db.query(ThanhToan).filter(
            ThanhToan.donhang_id == order.donhang_id,
            ThanhToan.trang_thai == "thanh_cong"
        ).with_entities(
            func.sum(ThanhToan.so_tien)
        ).scalar() or Decimal("0")
        
        if total_paid >= order.tien_thanh_toan and order.trang_thai == "cho":
            order.trang_thai = "thanh_toan"
    
    db.commit()
    db.refresh(payment)
    
    payment_dict = {
        **{c.name: getattr(payment, c.name) for c in payment.__table__.columns},
        "ma_don_hang": order.ma_don_hang,
        "tong_tien_don_hang": order.tong_tien
    }
    
    return PaymentResponse(**payment_dict)

