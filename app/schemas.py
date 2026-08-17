# app/schemas.py
"""
Pydantic schemas cho các cấu trúc JSONB trong database
Dùng để validate và serialize/deserialize các trường JSONB
"""
from pydantic import BaseModel, ConfigDict, Field
from typing import Generic, List, Optional, TypeVar
from datetime import datetime


T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    """Stable server-side pagination envelope used by admin data tables."""

    items: List[T]
    total: int
    skip: int
    limit: int


# =========================================================
# 3.4.6B - Thông tin thanh toán (NhaCungCap.thong_tin_thanh_toan)
# =========================================================
class ThongTinThanhToan(BaseModel):
    """Cấu trúc JSONB cho thông tin thanh toán của nhà cung cấp"""
    ten_ngan_hang: str = Field(..., description="Tên ngân hàng (VD: Vietcombank)")
    chi_nhanh: Optional[str] = Field(None, description="Chi nhánh mở tài khoản")
    so_tai_khoan: str = Field(..., description="Số tài khoản ngân hàng")
    ten_thu_huong: str = Field(..., description="Tên chủ tài khoản")
    
    model_config = ConfigDict(json_schema_extra={
            "example": {
                "ten_ngan_hang": "Vietcombank",
                "chi_nhanh": "Chi nhánh Hà Nội",
                "so_tai_khoan": "1234567890",
                "ten_thu_huong": "CÔNG TY ABC"
            }
        })


# =========================================================
# 3.4.15B - Sản phẩm áp dụng (PhieuGiamGia.san_pham_ap_dung)
# =========================================================
class SanPhamApDung(BaseModel):
    """Cấu trúc JSONB cho danh sách sản phẩm/danh mục áp dụng phiếu giảm giá"""
    loai_ap_dung: str = Field(..., description="Loại áp dụng: 'all' (tất cả), 'san_pham', 'danh_muc'")
    danh_sach_id: Optional[List[int]] = Field(
        None, 
        description="Nếu loai_ap_dung != 'all', đây là mảng chứa các sanpham_id hoặc danhmuc_id được áp dụng"
    )
    
    model_config = ConfigDict(json_schema_extra={
            "examples": [
                {
                    "loai_ap_dung": "all",
                    "danh_sach_id": None
                },
                {
                    "loai_ap_dung": "san_pham",
                    "danh_sach_id": [1, 2, 3, 5]
                },
                {
                    "loai_ap_dung": "danh_muc",
                    "danh_sach_id": [10, 11, 12]
                }
            ]
        })


# =========================================================
# 3.4.19B - Thông tin giao dịch (ThanhToan.thong_tin_giao_dich)
# =========================================================
class ThongTinGiaoDich(BaseModel):
    """Cấu trúc JSONB cho thông tin giao dịch từ cổng thanh toán"""
    ma_giao_dich_ben_thu_3: Optional[str] = Field(
        None, 
        description="Mã giao dịch do cổng thanh toán trả về (VD: vnp_TransactionNo)"
    )
    thoi_gian_giao_dich: Optional[str] = Field(
        None, 
        description="Thời gian giao dịch thành công (VD: vnp_PayDate) - format timestamp"
    )
    chi_tiet_raw: Optional[dict] = Field(
        None, 
        description="Lưu toàn bộ đối tượng JSON gốc do cổng thanh toán trả về để đối soát"
    )
    
    model_config = ConfigDict(json_schema_extra={
            "example": {
                "ma_giao_dich_ben_thu_3": "vnp_TransactionNo_123456789",
                "thoi_gian_giao_dich": "20250116123456",
                "chi_tiet_raw": {
                    "vnp_Amount": "10000000",
                    "vnp_BankCode": "NCB",
                    "vnp_CardType": "ATM",
                    "vnp_OrderInfo": "Thanh toan don hang",
                    "vnp_PayDate": "20250116123456",
                    "vnp_ResponseCode": "00",
                    "vnp_TransactionNo": "vnp_TransactionNo_123456789"
                }
            }
        })


# =========================================================
# Helper functions để validate JSONB data
# =========================================================
def validate_thong_tin_thanh_toan(data: dict) -> dict:
    """Validate và normalize thông tin thanh toán"""
    schema = ThongTinThanhToan(**data)
    return schema.model_dump()


def validate_san_pham_ap_dung(data: dict) -> dict:
    """Validate và normalize sản phẩm áp dụng"""
    schema = SanPhamApDung(**data)
    return schema.model_dump()


def validate_thong_tin_giao_dich(data: dict) -> dict:
    """Validate và normalize thông tin giao dịch"""
    schema = ThongTinGiaoDich(**data)
    return schema.model_dump()

