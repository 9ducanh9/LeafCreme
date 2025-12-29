"""
Orders router: Quản lý đơn hàng (POS, Online, Đặt trước)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, or_, and_, func, desc
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field

from app.db import get_db
from app.models import (
    DonHang, ChiTietDonHang, BienTheSanPham, LoHangSanPham,
    PhieuGiamGia, DonHangPhieuGiamGia, TonKhoSanPham,
    NguoiDung, HopQua, LoHangHopQua, HopQuaBOM
)
from app.services.fefo import alloc_fefo_by_variant
from app.core.dependencies import get_current_user, require_role
from app.schemas import validate_san_pham_ap_dung, SanPhamApDung

router = APIRouter(prefix="/orders", tags=["orders"])


# =========================================================
# Request/Response Schemas
# =========================================================
class OrderItemCreate(BaseModel):
    """Item trong đơn hàng"""
    bienthe_id: Optional[int] = None
    hop_qua_id: Optional[int] = None
    so_luong: int = Field(..., gt=0, description="Số lượng sản phẩm")


class OrderCreate(BaseModel):
    """Tạo đơn hàng mới"""
    items: List[OrderItemCreate] = Field(..., min_length=1)
    phieu_giam_gia_codes: Optional[List[str]] = Field(None, description="Danh sách mã phiếu giảm giá")
    tien_dat_coc: Optional[Decimal] = Field(None, ge=0, description="Tiền đặt cọc (cho đơn đặt trước)")
    ten_khach_hang: Optional[str] = Field(None, max_length=100)
    so_dien_thoai_khach: Optional[str] = Field(None, max_length=20)
    dia_chi_giao_hang: Optional[str] = None
    ngay_giao_du_kien: Optional[datetime] = None
    ghi_chu: Optional[str] = None


class OrderItemResponse(BaseModel):
    """Chi tiết item trong đơn hàng"""
    chitiet_id: int
    lohang_sanpham_id: Optional[int] = None
    lohang_hopqua_id: Optional[int] = None
    hop_qua_id: Optional[int] = None
    so_luong: int
    gia_don_vi: Decimal
    tong_tien_phu: Decimal
    ghi_chu: Optional[str] = None
    trang_thai: str
    
    class Config:
        from_attributes = True


class VoucherAppliedResponse(BaseModel):
    """Thông tin voucher đã áp dụng"""
    ma_phieu: str
    ten_phieu: str
    so_tien_giam: Decimal
    ngay_ap_dung: datetime


class OrderResponse(BaseModel):
    """Thông tin đơn hàng đầy đủ"""
    donhang_id: int
    ma_don_hang: str
    nguoidung_id: Optional[int] = None
    loai_don: str
    tong_tien: Decimal
    tien_giam_gia: Decimal
    tien_thanh_toan: Decimal
    tien_dat_coc: Decimal
    trang_thai: str
    ngay_nhan: Optional[datetime] = None
    ngay_giao_du_kien: Optional[datetime] = None
    ghi_chu: Optional[str] = None
    ten_khach_hang: Optional[str] = None
    so_dien_thoai_khach: Optional[str] = None
    dia_chi_giao_hang: Optional[str] = None
    nhan_vien_tao: Optional[int] = None
    ngay_tao: datetime
    ngay_cap_nhat: datetime
    items: List[OrderItemResponse] = []
    vouchers: List[VoucherAppliedResponse] = []
    
    class Config:
        from_attributes = True


class OrderUpdateStatus(BaseModel):
    """Cập nhật trạng thái đơn hàng"""
    trang_thai: str = Field(..., description="Trạng thái mới: cho, dang_xu_ly, thanh_toan, da_nhan, huy")
    ghi_chu: Optional[str] = None


class OrderListResponse(BaseModel):
    """Danh sách đơn hàng (summary)"""
    donhang_id: int
    ma_don_hang: str
    loai_don: str
    tong_tien: Decimal
    tien_giam_gia: Decimal
    tien_thanh_toan: Decimal
    trang_thai: str
    ten_khach_hang: Optional[str] = None
    so_dien_thoai_khach: Optional[str] = None
    dia_chi_giao_hang: Optional[str] = None
    ngay_giao_du_kien: Optional[datetime] = None
    ghi_chu: Optional[str] = None
    ngay_tao: datetime
    
    class Config:
        from_attributes = True


# =========================================================
# Helper Functions
# =========================================================
def validate_and_apply_voucher(
    db: Session,
    voucher_codes: List[str],
    order_total: Decimal,
    order_items: List[dict],
    user_id: Optional[int] = None
) -> tuple[Decimal, List[dict]]:
    """
    Validate và áp dụng voucher
    Returns: (tien_giam_tong, list_voucher_applied)
    """
    if not voucher_codes:
        return Decimal("0"), []
    
    tien_giam_tong = Decimal("0")
    vouchers_applied = []
    
    for code in voucher_codes:
        # Tìm voucher
        voucher = db.query(PhieuGiamGia).filter(
            PhieuGiamGia.ma_phieu == code,
            PhieuGiamGia.dang_hoat_dong == True
        ).first()
        
        if not voucher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Voucher '{code}' không tồn tại"
            )
        
        # Kiểm tra thời gian hiệu lực
        now = datetime.utcnow()
        if now < voucher.ngay_bat_dau or now > voucher.ngay_het_han:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Voucher '{code}' đã hết hạn hoặc chưa có hiệu lực"
            )
        
        # Kiểm tra số lần sử dụng
        if voucher.so_lan_da_dung >= voucher.gioi_han_su_dung:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Voucher '{code}' đã hết lượt sử dụng"
            )
        
        # Kiểm tra giới hạn người dùng
        if voucher.gioi_han_nguoi_dung:
            count_used = db.query(DonHangPhieuGiamGia).join(DonHang).filter(
                DonHangPhieuGiamGia.phieugiam_id == voucher.phieugiam_id,
                DonHang.nguoidung_id == user_id
            ).count()
            
            if count_used >= voucher.gioi_han_nguoi_dung:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Bạn đã sử dụng hết lượt voucher '{code}'"
                )
        
        # Kiểm tra tổng tiền tối thiểu
        if order_total < voucher.tong_tien_toi_thieu:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Voucher '{code}' yêu cầu đơn hàng tối thiểu {voucher.tong_tien_toi_thieu} VNĐ"
            )
        
        # Kiểm tra sản phẩm áp dụng
        if voucher.san_pham_ap_dung:
            try:
                sp_ap_dung = SanPhamApDung(**voucher.san_pham_ap_dung)
                if sp_ap_dung.loai_ap_dung != "all":
                    # Lấy danh sách sản phẩm trong đơn hàng
                    order_sp_ids = []
                    for item in order_items:
                        if item.get("bienthe_id"):
                            # Lấy sanpham_id từ bienthe_id
                            bt = db.query(BienTheSanPham).filter(
                                BienTheSanPham.bienthe_id == item["bienthe_id"]
                            ).first()
                            if bt:
                                order_sp_ids.append(bt.sanpham_id)
                        elif item.get("hop_qua_id"):
                            order_sp_ids.append(item["hop_qua_id"])
                    
                    if not any(sp_id in sp_ap_dung.danh_sach_id for sp_id in order_sp_ids):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Voucher '{code}' không áp dụng cho sản phẩm trong đơn hàng"
                        )
            except Exception as e:
                if isinstance(e, HTTPException):
                    raise
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Voucher '{code}' có cấu hình không hợp lệ"
                )
        
        # Tính tiền giảm
        if voucher.loai_giam == "phan_tram":
            tien_giam = order_total * (voucher.gia_tri_giam / 100)
            tien_giam = min(tien_giam, voucher.gia_tri_giam)  # Nếu có max giảm
        else:  # so_tien
            tien_giam = voucher.gia_tri_giam
        
        tien_giam = min(tien_giam, order_total)  # Không giảm quá tổng tiền
        tien_giam_tong += tien_giam
        
        vouchers_applied.append({
            "phieugiam_id": voucher.phieugiam_id,
            "ma_phieu": voucher.ma_phieu,
            "ten_phieu": voucher.ten_phieu,
            "so_tien_giam": tien_giam
        })
    
    return tien_giam_tong, vouchers_applied


def generate_order_code(loai_don: str) -> str:
    """Tạo mã đơn hàng tự động"""
    prefix = {
        "pos": "POS",
        "online": "ONL",
        "dattruoc": "PRE"
    }.get(loai_don, "ORD")

    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    return f"{prefix}-{timestamp}"


# =========================================================
# Endpoints
# =========================================================
@router.get("", response_model=List[OrderListResponse])
def list_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    loai_don: Optional[str] = Query(None, description="Filter theo loại đơn: pos, online, dattruoc"),
    trang_thai: Optional[str] = Query(None, description="Filter theo trạng thái"),
    ma_don_hang: Optional[str] = Query(None, description="Tìm kiếm theo mã đơn hàng"),
    from_date: Optional[datetime] = Query(None, description="Từ ngày (YYYY-MM-DD)"),
    to_date: Optional[datetime] = Query(None, description="Đến ngày (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_user)
):
    """Danh sách đơn hàng với filter và pagination"""
    query = db.query(DonHang)
    
    # Filter theo loại đơn
    if loai_don:
        query = query.filter(DonHang.loai_don == loai_don)
    
    # Filter theo trạng thái
    if trang_thai:
        query = query.filter(DonHang.trang_thai == trang_thai)
    
    # Tìm kiếm mã đơn hàng
    if ma_don_hang:
        query = query.filter(DonHang.ma_don_hang.ilike(f"%{ma_don_hang}%"))
    
    # Filter theo ngày
    if from_date:
        query = query.filter(DonHang.ngay_tao >= from_date)
    if to_date:
        # Thêm 1 ngày để bao gồm cả ngày cuối
        to_date_end = to_date + timedelta(days=1)
        query = query.filter(DonHang.ngay_tao < to_date_end)
    
    # Nếu không phải admin/manager, chỉ xem đơn của mình
    vaitro_ten = current_user.vaitro.ten_vai_tro if current_user.vaitro else None
    if vaitro_ten not in ["admin", "manager"]:
        query = query.filter(DonHang.nguoidung_id == current_user.nguoidung_id)
    
    # Sắp xếp theo ngày tạo mới nhất
    orders = query.order_by(desc(DonHang.ngay_tao)).offset(skip).limit(limit).all()
    
    return orders


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_user)
):
    """Lấy thông tin chi tiết đơn hàng"""
    order = db.query(DonHang).filter(DonHang.donhang_id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Đơn hàng không tồn tại"
        )
    
    # Kiểm tra quyền: nếu không phải admin/manager thì chỉ xem đơn của mình
    vaitro_ten = current_user.vaitro.ten_vai_tro if current_user.vaitro else None
    if vaitro_ten not in ["admin", "manager"]:
        if order.nguoidung_id != current_user.nguoidung_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xem đơn hàng này"
            )
    
    # Lấy items
    items = db.query(ChiTietDonHang).filter(
        ChiTietDonHang.donhang_id == order_id
    ).all()

    items_payload = []
    for item in items:
        items_payload.append({
            "chitiet_id": item.chitiet_id,
            "lohang_sanpham_id": item.lohang_sanpham_id,
            "lohang_hopqua_id": item.lohang_hopqua_id,
            "hop_qua_id": item.hop_qua_id,
            "so_luong": item.so_luong,
            "gia_don_vi": item.gia_don_vi,
            "tong_tien_phu": item.tong_tien_phu,
            "ghi_chu": item.ghi_chu,
            "trang_thai": getattr(item, "trang_thai_don_hang", None)
            or getattr(item, "trang_thai", None)
            or "dang_xu_ly",
        })
    
    # Lấy vouchers đã áp dụng
    voucher_links = db.query(DonHangPhieuGiamGia).filter(
        DonHangPhieuGiamGia.donhang_id == order_id
    ).all()
    
    vouchers = []
    for link in voucher_links:
        voucher = db.query(PhieuGiamGia).filter(
            PhieuGiamGia.phieugiam_id == link.phieugiam_id
        ).first()
        if voucher:
            vouchers.append({
                "ma_phieu": voucher.ma_phieu,
                "ten_phieu": voucher.ten_phieu,
                "so_tien_giam": link.so_tien_giam,
                "ngay_ap_dung": link.ngay_ap_dung
            })
    
    # Tạo response
    order_dict = {
        **{c.name: getattr(order, c.name) for c in order.__table__.columns},
        "items": items_payload,
        "vouchers": vouchers
    }
    
    return OrderResponse(**order_dict)


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    loai_don: str = Query("pos", description="Loại đơn: pos, online, dattruoc"),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_user)
):
    """
    Tạo đơn hàng mới
    - POS: Đơn tại cửa hàng (không cần user_id)
    - Online: Đơn hàng online (cần user_id, shipping info)
    - Dattruoc: Đơn đặt trước (có thể có đặt cọc)
    """
    if loai_don not in ["pos", "online", "dattruoc"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Loại đơn không hợp lệ. Chọn: pos, online, dattruoc"
        )
    
    # Validate items: phải có bienthe_id HOẶC hop_qua_id
    for item in payload.items:
        if not item.bienthe_id and not item.hop_qua_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mỗi item phải có bienthe_id hoặc hop_qua_id"
            )
        if item.bienthe_id and item.hop_qua_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item không thể có cả bienthe_id và hop_qua_id"
            )
    
    try:
        # Tạo đơn hàng
        ma_don = generate_order_code(loai_don)
        order = DonHang(
            ma_don_hang=ma_don,
            loai_don=loai_don,
            nguoidung_id=current_user.nguoidung_id if loai_don != "pos" else None,
            tong_tien=Decimal("0"),
            tien_giam_gia=Decimal("0"),
            tien_thanh_toan=Decimal("0"),
            tien_dat_coc=payload.tien_dat_coc or Decimal("0"),
            trang_thai="cho" if loai_don == "dattruoc" else ("dang_xu_ly" if loai_don == "online" else "thanh_toan"),
            ten_khach_hang=payload.ten_khach_hang,
            so_dien_thoai_khach=payload.so_dien_thoai_khach,
            dia_chi_giao_hang=payload.dia_chi_giao_hang,
            ngay_giao_du_kien=payload.ngay_giao_du_kien,
            ghi_chu=payload.ghi_chu,
            nhan_vien_tao=current_user.nguoidung_id if loai_don == "pos" else None
        )
        db.add(order)
        db.flush()
        
        # Xử lý từng item và tính tổng tiền
        tong_tien = Decimal("0")
        order_items_info = []
        
        for item in payload.items:
            if item.bienthe_id:
                # Sản phẩm theo biến thể
                bienthe = db.query(BienTheSanPham).filter(
                    BienTheSanPham.bienthe_id == item.bienthe_id,
                    BienTheSanPham.dang_hoat_dong == True
                ).first()
                
                if not bienthe:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Biến thể {item.bienthe_id} không tồn tại"
                    )
                
                # FEFO allocation
                alloc, ok = alloc_fefo_by_variant(db, item.bienthe_id, item.so_luong)
                if not ok:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Tồn kho không đủ cho biến thể {item.bienthe_id}"
                    )
                
                gia = bienthe.gia_bienthe
                line_total = gia * item.so_luong
                tong_tien += line_total
                
                # Tạo chi tiết đơn hàng (mỗi lô một dòng)
                for lohang_id, take_qty in alloc:
                    db.add(ChiTietDonHang(
                        donhang_id=order.donhang_id,
                        lohang_sanpham_id=lohang_id,
                        so_luong=take_qty,
                        gia_don_vi=gia,
                        tong_tien_phu=gia * take_qty
                    ))
                
                order_items_info.append({
                    "bienthe_id": item.bienthe_id,
                    "sanpham_id": bienthe.sanpham_id
                })
                
            elif item.hop_qua_id:
                # Hộp quà
                hopqua = db.query(HopQua).filter(
                    HopQua.hop_qua_id == item.hop_qua_id,
                    HopQua.dang_hoat_dong == True
                ).first()
                
                if not hopqua:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Hộp quà {item.hop_qua_id} không tồn tại"
                    )
                
                # Đọc BOM của hộp quà và trừ tồn kho sản phẩm
                bom_items = db.query(HopQuaBOM).filter(
                    HopQuaBOM.hop_qua_id == item.hop_qua_id
                ).all()
                
                if bom_items:
                    # Với mỗi sản phẩm trong BOM, trừ tồn kho
                    for bom_item in bom_items:
                        # Tính số lượng cần: số lượng trong BOM × số lượng hộp quà
                        need_qty = bom_item.so_luong * item.so_luong
                        
                        # Trừ tồn kho sản phẩm theo FEFO
                        alloc, ok = alloc_fefo_by_variant(db, bom_item.bienthe_id, need_qty)
                        if not ok:
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Tồn kho không đủ cho sản phẩm trong hộp quà {hopqua.ten_hop_qua}. "
                                       f"Biến thể {bom_item.bienthe_id} thiếu {need_qty} sản phẩm."
                            )
                        
                        # Tạo chi tiết đơn hàng cho từng lô hàng sản phẩm (để track)
                        for lohang_id, take_qty in alloc:
                            bienthe = db.query(BienTheSanPham).filter(
                                BienTheSanPham.bienthe_id == bom_item.bienthe_id
                            ).first()
                            if bienthe:
                                db.add(ChiTietDonHang(
                                    donhang_id=order.donhang_id,
                                    lohang_sanpham_id=lohang_id,
                                    so_luong=take_qty,
                                    gia_don_vi=bienthe.gia_bienthe,
                                    tong_tien_phu=bienthe.gia_bienthe * take_qty,
                                    ghi_chu=f"Từ hộp quà {hopqua.ten_hop_qua}"
                                ))
                
                # Tính giá hộp quà
                gia = hopqua.gia_ban
                line_total = gia * item.so_luong
                tong_tien += line_total
                
                # Tạo chi tiết đơn hàng cho hộp quà (tổng hợp)
                db.add(ChiTietDonHang(
                    donhang_id=order.donhang_id,
                    hop_qua_id=item.hop_qua_id,
                    so_luong=item.so_luong,
                    gia_don_vi=gia,
                    tong_tien_phu=line_total
                ))
                
                order_items_info.append({
                    "hop_qua_id": item.hop_qua_id
                })
        
        # Validate và áp dụng voucher
        tien_giam = Decimal("0")
        vouchers_applied = []
        
        if payload.phieu_giam_gia_codes:
            tien_giam, vouchers_applied = validate_and_apply_voucher(
                db, payload.phieu_giam_gia_codes, tong_tien,
                order_items_info, current_user.nguoidung_id
            )
            
            # Lưu voucher links
            for v_info in vouchers_applied:
                db.add(DonHangPhieuGiamGia(
                    donhang_id=order.donhang_id,
                    phieugiam_id=v_info["phieugiam_id"],
                    so_tien_giam=v_info["so_tien_giam"]
                ))
                
                # Cập nhật số lần sử dụng
                voucher = db.query(PhieuGiamGia).filter(
                    PhieuGiamGia.phieugiam_id == v_info["phieugiam_id"]
                ).first()
                if voucher:
                    voucher.so_lan_da_dung += 1
        
        # Cập nhật tổng tiền
        order.tong_tien = tong_tien
        order.tien_giam_gia = tien_giam
        order.tien_thanh_toan = tong_tien - tien_giam
        
        db.commit()
        db.refresh(order)
        
        # Lấy lại đơn hàng với items và vouchers
        return get_order(order.donhang_id, db, current_user)
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tạo đơn hàng: {str(e)}"
        )


@router.put("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    payload: OrderUpdateStatus,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_user)
):
    """Cập nhật trạng thái đơn hàng"""
    order = db.query(DonHang).filter(DonHang.donhang_id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Đơn hàng không tồn tại"
        )
    
    # Kiểm tra quyền: chỉ admin/manager mới được đổi trạng thái
    vaitro_ten = current_user.vaitro.ten_vai_tro if current_user.vaitro else None
    if vaitro_ten not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền cập nhật trạng thái đơn hàng"
        )
    
    # Validate trạng thái
    valid_statuses = ["cho", "dang_xu_ly", "thanh_toan", "da_nhan", "huy"]
    if payload.trang_thai not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trạng thái không hợp lệ. Chọn: {', '.join(valid_statuses)}"
        )
    
    # Cập nhật trạng thái
    old_status = order.trang_thai
    order.trang_thai = payload.trang_thai
    
    if payload.ghi_chu:
        order.ghi_chu = (order.ghi_chu or "") + f"\n[{datetime.utcnow().strftime('%Y-%m-%d %H:%M')}] {payload.ghi_chu}"
    
    # Cập nhật ngày nhận nếu chuyển sang "da_nhan"
    if payload.trang_thai == "da_nhan" and not order.ngay_nhan:
        order.ngay_nhan = datetime.utcnow()
    
    db.commit()
    db.refresh(order)
    
    return get_order(order_id, db, current_user)


@router.post("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(
    order_id: int,
    ly_do: str = Query(..., description="Lý do hủy đơn"),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_user)
):
    """Hủy đơn hàng"""
    order = db.query(DonHang).filter(DonHang.donhang_id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Đơn hàng không tồn tại"
        )
    
    # Kiểm tra quyền
    vaitro_ten = current_user.vaitro.ten_vai_tro if current_user.vaitro else None
    if vaitro_ten not in ["admin", "manager"]:
        # Customer chỉ được hủy đơn của mình và chưa thanh toán
        if order.nguoidung_id != current_user.nguoidung_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn chỉ có thể hủy đơn hàng của mình"
            )
        
        if order.trang_thai in ["thanh_toan", "hoan_thanh"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể hủy đơn hàng đã thanh toán hoặc hoàn thành"
            )
    
    # Kiểm tra trạng thái hiện tại
    if order.trang_thai == "huy":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đơn hàng đã bị hủy"
        )
    
    # TODO: Hoàn trả tồn kho nếu cần
    
    order.trang_thai = "huy"
    order.ghi_chu = (order.ghi_chu or "") + f"\n[HỦY ĐƠN - {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}] {ly_do}"
    
    db.commit()
    db.refresh(order)
    
    return get_order(order_id, db, current_user)


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_role("admin", "manager"))
):
    """
    Xóa đơn hàng (chỉ admin/quản lý)
    CẢNH BÁO: Thao tác này sẽ xóa vĩnh viễn đơn hàng và các chi tiết liên quan
    """
    order = db.query(DonHang).filter(DonHang.donhang_id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy đơn hàng #{order_id}"
        )
    
    # Xóa chi tiết đơn hàng trước (do foreign key constraint)
    db.query(ChiTietDonHang).filter(ChiTietDonHang.donhang_id == order_id).delete()
    
    # Xóa đơn hàng
    db.delete(order)
    db.commit()
    
    return None
