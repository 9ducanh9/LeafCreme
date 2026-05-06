from decimal import Decimal
from typing import Optional, TypedDict


class OrderItemInfo(TypedDict, total=False):
    bienthe_id: int
    sanpham_id: int
    hop_qua_id: int


class VoucherAppliedInfo(TypedDict):
    phieugiam_id: int
    ma_phieu: str
    ten_phieu: str
    so_tien_giam: Decimal


class VoucherResponseInfo(TypedDict):
    ma_phieu: str
    ten_phieu: str
    so_tien_giam: Decimal
    ngay_ap_dung: object
