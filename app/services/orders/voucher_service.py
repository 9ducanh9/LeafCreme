from decimal import Decimal
from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.time import utc_now
from app.models import BienTheSanPham, DonHang, DonHangPhieuGiamGia, PhieuGiamGia
from app.schemas import SanPhamApDung

from .errors import DomainError
from .types import OrderItemInfo, VoucherAppliedInfo


class VoucherService:
    def validate_and_apply_voucher(
        self,
        db: Session,
        voucher_codes: List[str],
        order_total: Decimal,
        order_items: List[OrderItemInfo],
        user_id: Optional[int] = None,
    ) -> tuple[Decimal, List[VoucherAppliedInfo]]:
        if not voucher_codes:
            return Decimal("0"), []

        tien_giam_tong = Decimal("0")
        vouchers_applied: List[VoucherAppliedInfo] = []

        for code in voucher_codes:
            # Locked for the rest of this transaction — the usage-limit
            # check below (so_lan_da_dung >= gioi_han_su_dung) used to run
            # unlocked, so two concurrent orders using the last remaining
            # slot of the same voucher could both pass the check before
            # either committed its increment, letting a voucher be used
            # more times than its limit. See docs/specs/02-orders.md
            # Finding #2. The increment itself still happens in
            # OrderService.create_order, inside the same session/
            # transaction this lock is held for.
            voucher = (
                db.query(PhieuGiamGia)
                .filter(PhieuGiamGia.ma_phieu == code, PhieuGiamGia.dang_hoat_dong == True)
                .with_for_update()
                .first()
            )

            if not voucher:
                raise DomainError(status_code=404, detail=f"Voucher '{code}' không tồn tại")

            now = utc_now()
            if now < voucher.ngay_bat_dau or now > voucher.ngay_het_han:
                raise DomainError(status_code=400, detail=f"Voucher '{code}' đã hết hạn hoặc chưa có hiệu lực")

            if voucher.so_lan_da_dung >= voucher.gioi_han_su_dung:
                raise DomainError(status_code=400, detail=f"Voucher '{code}' đã hết lượt sử dụng")

            if voucher.gioi_han_nguoi_dung:
                count_used = (
                    db.query(DonHangPhieuGiamGia)
                    .join(DonHang)
                    .filter(DonHangPhieuGiamGia.phieugiam_id == voucher.phieugiam_id, DonHang.nguoidung_id == user_id)
                    .count()
                )

                if count_used >= voucher.gioi_han_nguoi_dung:
                    raise DomainError(status_code=400, detail=f"Bạn đã sử dụng hết lượt voucher '{code}'")

            if order_total < voucher.tong_tien_toi_thieu:
                raise DomainError(
                    status_code=400,
                    detail=f"Voucher '{code}' yêu cầu đơn hàng tối thiểu {voucher.tong_tien_toi_thieu} VNĐ",
                )

            if voucher.san_pham_ap_dung:
                try:
                    sp_ap_dung = SanPhamApDung(**voucher.san_pham_ap_dung)
                    if sp_ap_dung.loai_ap_dung != "all":
                        order_sp_ids = []
                        for item in order_items:
                            if item.get("bienthe_id"):
                                bt = (
                                    db.query(BienTheSanPham)
                                    .filter(BienTheSanPham.bienthe_id == item["bienthe_id"])
                                    .first()
                                )
                                if bt:
                                    order_sp_ids.append(bt.sanpham_id)
                            elif item.get("hop_qua_id"):
                                order_sp_ids.append(item["hop_qua_id"])

                        if not any(sp_id in sp_ap_dung.danh_sach_id for sp_id in order_sp_ids):
                            raise DomainError(
                                status_code=400, detail=f"Voucher '{code}' không áp dụng cho sản phẩm trong đơn hàng"
                            )
                except Exception as e:
                    if isinstance(e, DomainError):
                        raise
                    raise DomainError(status_code=400, detail=f"Voucher '{code}' có cấu hình không hợp lệ")

            if voucher.loai_giam in ("phantram", "phan_tram"):
                tien_giam = order_total * (voucher.gia_tri_giam / 100)
            else:
                tien_giam = voucher.gia_tri_giam

            tien_giam = min(tien_giam, order_total)
            tien_giam_tong += tien_giam

            vouchers_applied.append(
                {
                    "phieugiam_id": voucher.phieugiam_id,
                    "ma_phieu": voucher.ma_phieu,
                    "ten_phieu": voucher.ten_phieu,
                    "so_tien_giam": tien_giam,
                }
            )

        return tien_giam_tong, vouchers_applied
