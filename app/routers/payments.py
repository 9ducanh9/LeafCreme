"""
Payments router: Quản lý thanh toán
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field

from app.db import get_db
from app.models import ThanhToan, DonHang
from app.core.dependencies import get_current_user, require_role
from app.schemas import ThongTinGiaoDich, validate_thong_tin_giao_dich

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
        db.func.sum(ThanhToan.so_tien)
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
                db.func.sum(ThanhToan.so_tien)
            ).scalar() or Decimal("0")
            
            if total_paid >= order.tien_thanh_toan and order.trang_thai == "cho":
                order.trang_thai = "thanh_toan"
        
        # Nếu hủy thanh toán đã thành công, cần cập nhật lại đơn hàng
        elif payload.trang_thai in ["that_bai", "huy"] and old_status == "thanh_cong":
            total_paid = db.query(ThanhToan).filter(
                ThanhToan.donhang_id == order.donhang_id,
                ThanhToan.trang_thai == "thanh_cong"
            ).with_entities(
                db.func.sum(ThanhToan.so_tien)
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
            db.func.sum(ThanhToan.so_tien)
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

