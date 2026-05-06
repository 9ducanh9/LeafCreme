from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models import (
    BienTheSanPham,
    ChiTietDonHang,
    DanhGiaSanPham,
    DonHang,
    DonHangPhieuGiamGia,
    DoiTra,
    HopQua,
    HopQuaBOM,
    LichSuKhoHopQua,
    LichSuKhoSanPham,
    NguoiDung,
    PhieuGiamGia,
    ThanhToan,
    TonKhoSanPham,
)

from .errors import DomainError
from .inventory_service import InventoryService
from .types import OrderItemInfo
from .voucher_service import VoucherService


class OrderService:
    def __init__(self):
        self.inventory_service = InventoryService()
        self.voucher_service = VoucherService()

    def generate_order_code(self, loai_don: str) -> str:
        prefix = {
            "pos": "POS",
            "online": "ONL",
            "dattruoc": "PRE"
        }.get(loai_don, "ORD")

        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
        return f"{prefix}-{timestamp}"

    def list_orders(
        self,
        db: Session,
        current_user: NguoiDung,
        skip: int = 0,
        limit: int = 50,
        loai_don: Optional[str] = None,
        trang_thai: Optional[str] = None,
        ma_don_hang: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
    ):
        query = db.query(DonHang)

        if loai_don:
            query = query.filter(DonHang.loai_don == loai_don)

        if trang_thai:
            query = query.filter(DonHang.trang_thai == trang_thai)

        if ma_don_hang:
            query = query.filter(DonHang.ma_don_hang.ilike(f"%{ma_don_hang}%"))

        if from_date:
            query = query.filter(DonHang.ngay_tao >= from_date)
        if to_date:
            to_date_end = to_date + timedelta(days=1)
            query = query.filter(DonHang.ngay_tao < to_date_end)

        vaitro_ten = current_user.vaitro.ten_vai_tro if current_user.vaitro else None
        if vaitro_ten not in ["admin", "manager"]:
            query = query.filter(DonHang.nguoidung_id == current_user.nguoidung_id)

        orders = query.order_by(desc(DonHang.ngay_tao)).offset(skip).limit(limit).all()
        return orders

    def get_order(self, db: Session, order_id: int, current_user: NguoiDung) -> dict:
        order = db.query(DonHang).filter(DonHang.donhang_id == order_id).first()

        if not order:
            raise DomainError(
                status_code=404,
                detail="Đơn hàng không tồn tại"
            )

        vaitro_ten = current_user.vaitro.ten_vai_tro if current_user.vaitro else None
        if vaitro_ten not in ["admin", "manager"]:
            if order.nguoidung_id != current_user.nguoidung_id:
                raise DomainError(
                    status_code=403,
                    detail="Bạn không có quyền xem đơn hàng này"
                )

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

        order_dict = {
            **{c.name: getattr(order, c.name) for c in order.__table__.columns},
            "items": items_payload,
            "vouchers": vouchers
        }

        return order_dict

    def create_order(self, db: Session, payload, loai_don: str, current_user: NguoiDung) -> dict:
        if loai_don not in ["pos", "online", "dattruoc"]:
            raise DomainError(
                status_code=400,
                detail="Loại đơn không hợp lệ. Chọn: pos, online, dattruoc"
            )

        for item in payload.items:
            if not item.bienthe_id and not item.hop_qua_id:
                raise DomainError(
                    status_code=400,
                    detail="Mỗi item phải có bienthe_id hoặc hop_qua_id"
                )
            if item.bienthe_id and item.hop_qua_id:
                raise DomainError(
                    status_code=400,
                    detail="Item không thể có cả bienthe_id và hop_qua_id"
                )

        try:
            ma_don = self.generate_order_code(loai_don)
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

            tong_tien = Decimal("0")
            order_items_info: list[OrderItemInfo] = []

            for item in payload.items:
                if item.bienthe_id:
                    bienthe = db.query(BienTheSanPham).filter(
                        BienTheSanPham.bienthe_id == item.bienthe_id,
                        BienTheSanPham.dang_hoat_dong == True
                    ).first()

                    if not bienthe:
                        raise DomainError(
                            status_code=404,
                            detail=f"Biến thể {item.bienthe_id} không tồn tại"
                        )

                    alloc = self.inventory_service.allocate_variant(
                        db=db,
                        bienthe_id=item.bienthe_id,
                        so_luong=item.so_luong,
                        error_message=f"Tồn kho không đủ cho biến thể {item.bienthe_id}",
                    )

                    gia = bienthe.gia_bienthe
                    line_total = gia * item.so_luong
                    tong_tien += line_total

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
                    hopqua = db.query(HopQua).filter(
                        HopQua.hop_qua_id == item.hop_qua_id,
                        HopQua.dang_hoat_dong == True
                    ).first()

                    if not hopqua:
                        raise DomainError(
                            status_code=404,
                            detail=f"Hộp quà {item.hop_qua_id} không tồn tại"
                        )

                    bom_items = db.query(HopQuaBOM).filter(
                        HopQuaBOM.hop_qua_id == item.hop_qua_id
                    ).all()

                    if bom_items:
                        for bom_item in bom_items:
                            need_qty = bom_item.so_luong * item.so_luong
                            alloc = self.inventory_service.allocate_variant(
                                db=db,
                                bienthe_id=bom_item.bienthe_id,
                                so_luong=need_qty,
                                error_message=(
                                    f"Tồn kho không đủ cho sản phẩm trong hộp quà {hopqua.ten_hop_qua}. "
                                    f"Biến thể {bom_item.bienthe_id} thiếu {need_qty} sản phẩm."
                                ),
                            )

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

                    gia = hopqua.gia_ban
                    line_total = gia * item.so_luong
                    tong_tien += line_total

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

            tien_giam = Decimal("0")
            vouchers_applied = []

            if payload.phieu_giam_gia_codes:
                tien_giam, vouchers_applied = self.voucher_service.validate_and_apply_voucher(
                    db=db,
                    voucher_codes=payload.phieu_giam_gia_codes,
                    order_total=tong_tien,
                    order_items=order_items_info,
                    user_id=current_user.nguoidung_id
                )

                for v_info in vouchers_applied:
                    db.add(DonHangPhieuGiamGia(
                        donhang_id=order.donhang_id,
                        phieugiam_id=v_info["phieugiam_id"],
                        so_tien_giam=v_info["so_tien_giam"]
                    ))

                    voucher = db.query(PhieuGiamGia).filter(
                        PhieuGiamGia.phieugiam_id == v_info["phieugiam_id"]
                    ).first()
                    if voucher:
                        voucher.so_lan_da_dung += 1

            order.tong_tien = tong_tien
            order.tien_giam_gia = tien_giam
            order.tien_thanh_toan = tong_tien - tien_giam

            db.commit()
            db.refresh(order)
            return self.get_order(db=db, order_id=order.donhang_id, current_user=current_user)

        except DomainError:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise DomainError(
                status_code=500,
                detail=f"Lỗi khi tạo đơn hàng: {str(e)}"
            )

    def update_order_status(
        self,
        db: Session,
        order_id: int,
        current_user: NguoiDung,
        payload=None,
        new_status: Optional[str] = None,
        ghi_chu: Optional[str] = None,
    ) -> dict:
        order = db.query(DonHang).filter(DonHang.donhang_id == order_id).first()

        if not order:
            raise DomainError(
                status_code=404,
                detail="Đơn hàng không tồn tại"
            )

        vaitro_ten = current_user.vaitro.ten_vai_tro if current_user.vaitro else None
        if vaitro_ten not in ["admin", "manager"]:
            raise DomainError(
                status_code=403,
                detail="Bạn không có quyền cập nhật trạng thái đơn hàng"
            )

        trang_thai = (payload.trang_thai if payload else None) or new_status
        note = (payload.ghi_chu if payload else None) or ghi_chu

        if not trang_thai:
            raise DomainError(
                status_code=400,
                detail="Thiếu trạng thái mới (trang_thai hoặc new_status)"
            )

        valid_statuses = ["cho", "dang_xu_ly", "thanh_toan", "da_nhan", "huy"]
        if trang_thai not in valid_statuses:
            raise DomainError(
                status_code=400,
                detail=f"Trạng thái không hợp lệ. Chọn: {', '.join(valid_statuses)}"
            )

        order.trang_thai = trang_thai

        if note:
            order.ghi_chu = (order.ghi_chu or "") + f"\n[{datetime.utcnow().strftime('%Y-%m-%d %H:%M')}] {note}"

        if trang_thai == "da_nhan" and not order.ngay_nhan:
            order.ngay_nhan = datetime.utcnow()

        db.commit()
        db.refresh(order)

        return self.get_order(db=db, order_id=order_id, current_user=current_user)

    def cancel_order(self, db: Session, order_id: int, ly_do: str, current_user: NguoiDung) -> dict:
        order = db.query(DonHang).filter(DonHang.donhang_id == order_id).first()

        if not order:
            raise DomainError(
                status_code=404,
                detail="Đơn hàng không tồn tại"
            )

        vaitro_ten = current_user.vaitro.ten_vai_tro if current_user.vaitro else None
        if vaitro_ten not in ["admin", "manager"]:
            if order.nguoidung_id != current_user.nguoidung_id:
                raise DomainError(
                    status_code=403,
                    detail="Bạn chỉ có thể hủy đơn hàng của mình"
                )

            if order.trang_thai in ["thanh_toan", "hoan_thanh"]:
                raise DomainError(
                    status_code=400,
                    detail="Không thể hủy đơn hàng đã thanh toán hoặc hoàn thành"
                )

        if order.trang_thai == "huy":
            raise DomainError(
                status_code=400,
                detail="Đơn hàng đã bị hủy"
            )

        try:
            order_items = db.query(ChiTietDonHang).filter(
                ChiTietDonHang.donhang_id == order_id
            ).all()

            for item in order_items:
                if item.lohang_sanpham_id and item.so_luong:
                    tonkho = db.query(TonKhoSanPham).filter(
                        TonKhoSanPham.lohang_sanpham_id == item.lohang_sanpham_id
                    ).first()
                    if tonkho:
                        tonkho.so_luong_hien_tai += item.so_luong
                        tonkho.so_luong_da_ban = max((tonkho.so_luong_da_ban or 0) - item.so_luong, 0)

            order.trang_thai = "huy"
            order.ghi_chu = (order.ghi_chu or "") + f"\n[HỦY ĐƠN - {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}] {ly_do}"

            db.commit()
            db.refresh(order)
        except Exception as e:
            db.rollback()
            raise DomainError(
                status_code=500,
                detail=f"Lỗi khi hủy đơn hàng: {str(e)}"
            )

        return self.get_order(db=db, order_id=order_id, current_user=current_user)

    def delete_order(self, db: Session, order_id: int) -> None:
        order = db.query(DonHang).filter(DonHang.donhang_id == order_id).first()
        if not order:
            raise DomainError(
                status_code=404,
                detail=f"Không tìm thấy đơn hàng #{order_id}"
            )

        try:
            db.query(LichSuKhoSanPham).filter(LichSuKhoSanPham.donhang_id == order_id).delete()
            db.query(LichSuKhoHopQua).filter(LichSuKhoHopQua.donhang_id == order_id).delete()
            db.query(DanhGiaSanPham).filter(DanhGiaSanPham.donhang_id == order_id).delete()
            db.query(DoiTra).filter(DoiTra.donhang_id == order_id).delete()
            db.query(ThanhToan).filter(ThanhToan.donhang_id == order_id).delete()
            db.query(DonHangPhieuGiamGia).filter(DonHangPhieuGiamGia.donhang_id == order_id).delete()
            db.query(ChiTietDonHang).filter(ChiTietDonHang.donhang_id == order_id).delete()

            db.delete(order)
            db.commit()
        except Exception as e:
            db.rollback()
            raise DomainError(
                status_code=500,
                detail=f"Không thể xóa đơn hàng: {str(e)}"
            )
