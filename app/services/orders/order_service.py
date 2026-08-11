from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy import desc, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import (
    BienTheSanPham,
    ChiTietDonHang,
    CongThucHopQua,
    DonHang,
    DonHangPhieuGiamGia,
    HopQua,
    HopQuaBOM,
    LoHangHopQua,
    LoHangSanPham,
    NguoiDung,
    PhanBoChiTietDonHang,
    PhieuGiamGia,
    SanPham,
    ThanhToan,
    TonKhoHopQua,
    TonKhoLinhKien,
    TonKhoSanPham,
)
from app.services.inventory_ledger_service import InventoryLedgerService

from .errors import DomainError
from .inventory_service import InventoryAllocation, InventoryService
from .types import OrderItemInfo
from .voucher_service import VoucherService

_TERMINAL_ORDER_STATUSES = ("hoan_thanh", "da_huy")


class OrderService:
    def __init__(self):
        self.inventory_service = InventoryService()
        self.voucher_service = VoucherService()
        self.ledger = InventoryLedgerService()

    def generate_order_code(self, loai_don: str) -> str:
        prefix = {"pos": "POS", "online": "ONL", "dattruoc": "PRE", "dat_truoc": "PRE"}.get(loai_don, "ORD")
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
        paginated: bool = False,
        sort_by: str = "ngay_tao",
        sort_dir: str = "desc",
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
            query = query.filter(DonHang.ngay_tao < to_date + timedelta(days=1))

        vaitro_ten = current_user.vaitro.ten_vai_tro if current_user.vaitro else None
        if vaitro_ten not in ["admin", "manager"]:
            query = query.filter(DonHang.nguoidung_id == current_user.nguoidung_id)

        if not paginated:
            return query.order_by(desc(DonHang.ngay_tao), DonHang.donhang_id.asc()).offset(skip).limit(limit).all()

        total = query.count()
        sort_map = {
            "ngay_tao": DonHang.ngay_tao,
            "tien_thanh_toan": DonHang.tien_thanh_toan,
            "trang_thai": DonHang.trang_thai,
            "ngay_giao_du_kien": DonHang.ngay_giao_du_kien,
        }
        sort_column = sort_map.get(sort_by, DonHang.ngay_tao)
        direction = sort_column.asc() if sort_dir == "asc" else sort_column.desc()
        items = query.order_by(direction, DonHang.donhang_id.asc()).offset(skip).limit(limit).all()
        return {"items": items, "total": total, "skip": skip, "limit": limit}

    def get_order(self, db: Session, order_id: int, current_user: NguoiDung) -> dict:
        order = db.query(DonHang).filter(DonHang.donhang_id == order_id).first()
        if not order:
            raise DomainError(status_code=404, detail="Đơn hàng không tồn tại")

        vaitro_ten = current_user.vaitro.ten_vai_tro if current_user.vaitro else None
        if vaitro_ten not in ["admin", "manager"] and order.nguoidung_id != current_user.nguoidung_id:
            raise DomainError(status_code=403, detail="Bạn không có quyền xem đơn hàng này")

        items = db.query(ChiTietDonHang).filter(ChiTietDonHang.donhang_id == order_id).all()
        item_names = self._resolve_item_names(db, items)
        items_payload = [{
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
            "product_name": item_names.get(item.chitiet_id, "Sản phẩm không xác định"),
        } for item in items]

        voucher_links = db.query(DonHangPhieuGiamGia).filter(
            DonHangPhieuGiamGia.donhang_id == order_id
        ).all()
        vouchers = []
        for link in voucher_links:
            voucher = db.query(PhieuGiamGia).filter(PhieuGiamGia.phieugiam_id == link.phieugiam_id).first()
            if voucher:
                vouchers.append({
                    "ma_phieu": voucher.ma_phieu,
                    "ten_phieu": voucher.ten_phieu,
                    "so_tien_giam": link.so_tien_giam,
                    "ngay_ap_dung": link.ngay_ap_dung,
                })

        return {
            **{c.name: getattr(order, c.name) for c in order.__table__.columns},
            "items": items_payload,
            "vouchers": vouchers,
        }

    def _resolve_item_names(self, db: Session, items: list[ChiTietDonHang]) -> dict[int, str]:
        """Batch-resolve a human-readable product name per ChiTietDonHang
        row, keyed by chitiet_id. Previously the order confirmation/detail
        pages had nothing to show but raw batch/gift-box IDs
        ("Sản phẩm #12") — OrderItemResponse never carried a name field at
        all. Done as 3 batched queries (not one per item) since an order
        can have several line items. See UI/UX audit follow-up, Finding #4.
        """
        sanpham_batch_ids = {i.lohang_sanpham_id for i in items if i.lohang_sanpham_id}
        hopqua_batch_ids = {i.lohang_hopqua_id for i in items if i.lohang_hopqua_id}
        hopqua_direct_ids = {i.hop_qua_id for i in items if i.hop_qua_id}

        name_by_sanpham_batch: dict[int, str] = {}
        if sanpham_batch_ids:
            rows = (
                db.query(LoHangSanPham.lohang_id, SanPham.ten, BienTheSanPham.huong_vi, BienTheSanPham.kich_thuoc)
                .join(BienTheSanPham, BienTheSanPham.bienthe_id == LoHangSanPham.bienthe_sanpham_id)
                .join(SanPham, SanPham.sanpham_id == BienTheSanPham.sanpham_id)
                .filter(LoHangSanPham.lohang_id.in_(sanpham_batch_ids))
                .all()
            )
            for lohang_id, ten, huong_vi, kich_thuoc in rows:
                variant_label = " - ".join(p for p in (huong_vi, kich_thuoc) if p)
                name_by_sanpham_batch[lohang_id] = f"{ten} ({variant_label})" if variant_label else ten

        name_by_hopqua_batch: dict[int, str] = {}
        if hopqua_batch_ids:
            rows = (
                db.query(LoHangHopQua.lohang_id, HopQua.ten_hop_qua)
                .join(HopQua, HopQua.hop_qua_id == LoHangHopQua.hop_qua_id)
                .filter(LoHangHopQua.lohang_id.in_(hopqua_batch_ids))
                .all()
            )
            name_by_hopqua_batch = dict(rows)

        name_by_hopqua_direct: dict[int, str] = {}
        if hopqua_direct_ids:
            rows = db.query(HopQua.hop_qua_id, HopQua.ten_hop_qua).filter(
                HopQua.hop_qua_id.in_(hopqua_direct_ids)
            ).all()
            name_by_hopqua_direct = dict(rows)

        result: dict[int, str] = {}
        for item in items:
            if item.lohang_sanpham_id and item.lohang_sanpham_id in name_by_sanpham_batch:
                result[item.chitiet_id] = name_by_sanpham_batch[item.lohang_sanpham_id]
            elif item.lohang_hopqua_id and item.lohang_hopqua_id in name_by_hopqua_batch:
                result[item.chitiet_id] = name_by_hopqua_batch[item.lohang_hopqua_id]
            elif item.hop_qua_id and item.hop_qua_id in name_by_hopqua_direct:
                result[item.chitiet_id] = name_by_hopqua_direct[item.hop_qua_id]
        return result

    def _add_allocation(self, db: Session, detail_id: int, allocation: InventoryAllocation) -> None:
        db.add(PhanBoChiTietDonHang(
            chitiet_id=detail_id,
            loai_lohang=allocation.batch_type,
            lohang_sanpham_id=allocation.batch_id if allocation.batch_type == "sanpham" else None,
            lohang_linhkien_id=allocation.batch_id if allocation.batch_type == "linhkien" else None,
            lohang_hopqua_id=allocation.batch_id if allocation.batch_type == "hopqua" else None,
            so_luong=allocation.quantity,
        ))

    def create_order(self, db: Session, payload, loai_don: str, current_user: NguoiDung) -> dict:
        if loai_don == "dattruoc":
            loai_don = "dat_truoc"
        if loai_don not in ["pos", "online", "dat_truoc"]:
            raise DomainError(status_code=400, detail="Loại đơn không hợp lệ. Chọn: pos, online, dattruoc")

        for item in payload.items:
            if not item.bienthe_id and not item.hop_qua_id:
                raise DomainError(status_code=400, detail="Mỗi item phải có bienthe_id hoặc hop_qua_id")
            if item.bienthe_id and item.hop_qua_id:
                raise DomainError(status_code=400, detail="Item không thể có cả bienthe_id và hop_qua_id")

        try:
            order = DonHang(
                ma_don_hang=self.generate_order_code(loai_don),
                loai_don=loai_don,
                nguoidung_id=current_user.nguoidung_id if loai_don != "pos" else None,
                tong_tien=Decimal("0"),
                tien_giam_gia=Decimal("0"),
                tien_thanh_toan=Decimal("0"),
                tien_dat_coc=payload.tien_dat_coc or Decimal("0"),
                trang_thai="cho_coc" if loai_don == "dat_truoc" else ("dang_xu_ly" if loai_don == "online" else "hoan_thanh"),
                ten_khach_hang=payload.ten_khach_hang,
                so_dien_thoai_khach=payload.so_dien_thoai_khach,
                dia_chi_giao_hang=payload.dia_chi_giao_hang,
                ngay_giao_du_kien=payload.ngay_giao_du_kien,
                ghi_chu=payload.ghi_chu,
                nhan_vien_tao=current_user.nguoidung_id if loai_don == "pos" else None,
            )
            db.add(order)
            db.flush()

            tong_tien = Decimal("0")
            order_items_info: list[OrderItemInfo] = []

            for item in payload.items:
                if item.bienthe_id:
                    bienthe = db.query(BienTheSanPham).filter(
                        BienTheSanPham.bienthe_id == item.bienthe_id,
                        BienTheSanPham.dang_hoat_dong == True,
                    ).first()
                    if not bienthe:
                        raise DomainError(status_code=404, detail=f"Biến thể {item.bienthe_id} không tồn tại")

                    allocations = self.inventory_service.allocate_variant(
                        db,
                        item.bienthe_id,
                        item.so_luong,
                        f"Tồn kho không đủ cho biến thể {item.bienthe_id}",
                        donhang_id=order.donhang_id,
                        nguoidung_id=current_user.nguoidung_id,
                    )
                    gia = bienthe.gia_bienthe
                    tong_tien += gia * item.so_luong

                    for allocation in allocations:
                        detail = ChiTietDonHang(
                            donhang_id=order.donhang_id,
                            lohang_sanpham_id=allocation.batch_id,
                            so_luong=allocation.quantity,
                            gia_don_vi=gia,
                            tong_tien_phu=gia * allocation.quantity,
                        )
                        db.add(detail)
                        db.flush()
                        self._add_allocation(db, detail.chitiet_id, allocation)

                    order_items_info.append({"bienthe_id": item.bienthe_id, "sanpham_id": bienthe.sanpham_id})
                    continue

                hopqua = db.query(HopQua).filter(
                    HopQua.hop_qua_id == item.hop_qua_id,
                    HopQua.dang_hoat_dong == True,
                ).first()
                if not hopqua:
                    raise DomainError(status_code=404, detail=f"Hộp quà {item.hop_qua_id} không tồn tại")

                gia = hopqua.gia_ban
                line_total = gia * item.so_luong
                tong_tien += line_total
                gift_detail = ChiTietDonHang(
                    donhang_id=order.donhang_id,
                    hop_qua_id=item.hop_qua_id,
                    so_luong=item.so_luong,
                    gia_don_vi=gia,
                    tong_tien_phu=line_total,
                )
                db.add(gift_detail)
                db.flush()

                gift_allocations = self.inventory_service.allocate_gift_box(
                    db,
                    item.hop_qua_id,
                    item.so_luong,
                    f"Tồn kho không đủ cho hộp quà {hopqua.ten_hop_qua}",
                    donhang_id=order.donhang_id,
                    nguoidung_id=current_user.nguoidung_id,
                )
                for allocation in gift_allocations:
                    self._add_allocation(db, gift_detail.chitiet_id, allocation)

                for bom_item in db.query(HopQuaBOM).filter(HopQuaBOM.hop_qua_id == item.hop_qua_id).all():
                    need_qty = bom_item.so_luong * item.so_luong
                    allocations = self.inventory_service.allocate_variant(
                        db,
                        bom_item.bienthe_id,
                        need_qty,
                        f"Tồn kho không đủ cho sản phẩm trong hộp quà {hopqua.ten_hop_qua}",
                        donhang_id=order.donhang_id,
                        nguoidung_id=current_user.nguoidung_id,
                        reason=f"Gift box product deduction: {hopqua.ten_hop_qua}",
                    )
                    bienthe = db.query(BienTheSanPham).filter(BienTheSanPham.bienthe_id == bom_item.bienthe_id).first()
                    for allocation in allocations:
                        if not bienthe:
                            self._add_allocation(db, gift_detail.chitiet_id, allocation)
                            continue
                        detail = ChiTietDonHang(
                            donhang_id=order.donhang_id,
                            lohang_sanpham_id=allocation.batch_id,
                            so_luong=allocation.quantity,
                            gia_don_vi=bienthe.gia_bienthe,
                            tong_tien_phu=bienthe.gia_bienthe * allocation.quantity,
                            ghi_chu=f"From gift box {hopqua.ten_hop_qua}",
                        )
                        db.add(detail)
                        db.flush()
                        self._add_allocation(db, detail.chitiet_id, allocation)

                for component_bom in db.query(CongThucHopQua).filter(CongThucHopQua.hop_qua_id == item.hop_qua_id).all():
                    need_qty = component_bom.so_luong_linh_kien * item.so_luong
                    allocation = self.inventory_service.allocate_component_lot(
                        db,
                        component_bom.lohang_linhkien_id,
                        need_qty,
                        f"Tồn kho linh kiện không đủ cho hộp quà {hopqua.ten_hop_qua}",
                        bom_id=component_bom.bom_id,
                        donhang_id=order.donhang_id,
                        nguoidung_id=current_user.nguoidung_id,
                        reason=f"Gift box component deduction: {hopqua.ten_hop_qua}",
                    )
                    self._add_allocation(db, gift_detail.chitiet_id, allocation)

                order_items_info.append({"hop_qua_id": item.hop_qua_id})

            tien_giam = Decimal("0")
            vouchers_applied = []
            if payload.phieu_giam_gia_codes:
                tien_giam, vouchers_applied = self.voucher_service.validate_and_apply_voucher(
                    db=db,
                    voucher_codes=payload.phieu_giam_gia_codes,
                    order_total=tong_tien,
                    order_items=order_items_info,
                    user_id=current_user.nguoidung_id,
                )
                for v_info in vouchers_applied:
                    db.add(DonHangPhieuGiamGia(
                        donhang_id=order.donhang_id,
                        phieugiam_id=v_info["phieugiam_id"],
                        so_tien_giam=v_info["so_tien_giam"],
                    ))
                    voucher = db.query(PhieuGiamGia).filter(PhieuGiamGia.phieugiam_id == v_info["phieugiam_id"]).first()
                    if voucher:
                        voucher.so_lan_da_dung += 1

            order.tong_tien = tong_tien
            order.tien_giam_gia = tien_giam
            # Clamped — stacking multiple vouchers used to be able to push
            # this negative (each voucher capped its own discount against
            # tong_tien independently, not against the running remainder),
            # which fed straight into PaymentService._maybe_complete_order
            # ("total_paid >= tien_thanh_toan") and could mark an order
            # hoan_thanh with $0 actually paid. See
            # docs/specs/02-orders.md Finding #1 / docs/specs/03-payments.md
            # Finding #1.
            order.tien_thanh_toan = max(Decimal("0"), tong_tien - tien_giam)

            db.commit()
            db.refresh(order)
            return self.get_order(db=db, order_id=order.donhang_id, current_user=current_user)
        except DomainError:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise DomainError(status_code=500, detail=f"Lỗi khi tạo đơn hàng: {str(e)}")

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
            raise DomainError(status_code=404, detail="Đơn hàng không tồn tại")

        vaitro_ten = current_user.vaitro.ten_vai_tro if current_user.vaitro else None
        if vaitro_ten not in ["admin", "manager"]:
            raise DomainError(status_code=403, detail="Bạn không có quyền cập nhật trạng thái đơn hàng")

        trang_thai = (payload.trang_thai if payload else None) or new_status
        note = (payload.ghi_chu if payload else None) or ghi_chu
        if not trang_thai:
            raise DomainError(status_code=400, detail="Thiếu trạng thái mới (trang_thai hoặc new_status)")

        status_aliases = {
            "thanh_toan": "hoan_thanh",
            "da_nhan": "hoan_thanh",
            "huy": "da_huy",
        }
        trang_thai = status_aliases.get(trang_thai, trang_thai)

        valid_statuses = ["cho", "cho_coc", "dang_xu_ly", "dang_giao", "hoan_thanh", "da_huy"]
        if trang_thai not in valid_statuses:
            raise DomainError(status_code=400, detail=f"Trạng thái không hợp lệ. Chọn: {', '.join(valid_statuses)}")

        # Terminal states can't be walked back out of through this generic
        # endpoint — e.g. da_huy -> hoan_thanh used to be accepted (only
        # enum membership was checked, not the transition itself), which
        # could mark a cancelled order "completed" without ever
        # re-deducting the inventory that cancel_order() had restored. See
        # docs/specs/02-orders.md Finding #3.
        if order.trang_thai in _TERMINAL_ORDER_STATUSES and trang_thai != order.trang_thai:
            raise DomainError(
                status_code=400,
                detail=(
                    f"Đơn hàng đang ở trạng thái cuối ('{order.trang_thai}') — "
                    "không thể chuyển sang trạng thái khác qua endpoint này."
                ),
            )

        order.trang_thai = trang_thai
        if note:
            order.ghi_chu = (order.ghi_chu or "") + f"\n[{datetime.utcnow().strftime('%Y-%m-%d %H:%M')}] {note}"
        if trang_thai == "hoan_thanh" and not order.ngay_nhan:
            order.ngay_nhan = datetime.utcnow()

        db.commit()
        db.refresh(order)
        return self.get_order(db=db, order_id=order_id, current_user=current_user)

    def _restore_order_inventory(self, db: Session, order: DonHang, current_user: Optional[NguoiDung], reason: str) -> None:
        details = db.query(ChiTietDonHang).filter(ChiTietDonHang.donhang_id == order.donhang_id).all()
        detail_ids = [item.chitiet_id for item in details]
        allocations = db.query(PhanBoChiTietDonHang).filter(
            PhanBoChiTietDonHang.chitiet_id.in_(detail_ids)
        ).all() if detail_ids else []

        if allocations:
            for allocation in allocations:
                if allocation.loai_lohang == "sanpham" and allocation.lohang_sanpham_id:
                    stock = db.query(TonKhoSanPham).filter(
                        TonKhoSanPham.lohang_sanpham_id == allocation.lohang_sanpham_id
                    ).with_for_update().first()
                    if stock:
                        before = stock.so_luong_hien_tai or 0
                        stock.so_luong_hien_tai = before + allocation.so_luong
                        stock.so_luong_da_ban = max((stock.so_luong_da_ban or 0) - allocation.so_luong, 0)
                        self.ledger.log_product_movement(
                            db,
                            lohang_sanpham_id=allocation.lohang_sanpham_id,
                            loai_giao_dich="tra_hang",
                            so_luong=allocation.so_luong,
                            so_luong_truoc=before,
                            so_luong_sau=stock.so_luong_hien_tai,
                            ly_do=reason,
                            donhang_id=order.donhang_id,
                            nguoidung_id=current_user.nguoidung_id if current_user else None,
                        )
                elif allocation.loai_lohang == "hopqua" and allocation.lohang_hopqua_id:
                    stock = db.query(TonKhoHopQua).filter(
                        TonKhoHopQua.lohang_hopqua_id == allocation.lohang_hopqua_id
                    ).with_for_update().first()
                    if stock:
                        before = stock.so_luong_hien_tai or 0
                        stock.so_luong_hien_tai = before + allocation.so_luong
                        stock.so_luong_da_ban = max((stock.so_luong_da_ban or 0) - allocation.so_luong, 0)
                        self.ledger.log_gift_box_movement(
                            db,
                            lohang_hopqua_id=allocation.lohang_hopqua_id,
                            loai_giao_dich="tra_hang",
                            so_luong=allocation.so_luong,
                            so_luong_truoc=before,
                            so_luong_sau=stock.so_luong_hien_tai,
                            ly_do=reason,
                            donhang_id=order.donhang_id,
                            nguoidung_id=current_user.nguoidung_id if current_user else None,
                        )
                elif allocation.loai_lohang == "linhkien" and allocation.lohang_linhkien_id:
                    stock = db.query(TonKhoLinhKien).filter(
                        TonKhoLinhKien.lohang_linhkien_id == allocation.lohang_linhkien_id
                    ).with_for_update().first()
                    if stock:
                        before = stock.so_luong_hien_tai or 0
                        stock.so_luong_hien_tai = before + allocation.so_luong
                        stock.so_luong_da_su_dung = max((stock.so_luong_da_su_dung or 0) - allocation.so_luong, 0)
                        self.ledger.log_component_movement(
                            db,
                            lohang_linhkien_id=allocation.lohang_linhkien_id,
                            loai_giao_dich="tra_hang",
                            so_luong=allocation.so_luong,
                            so_luong_truoc=before,
                            so_luong_sau=stock.so_luong_hien_tai,
                            ly_do=reason,
                            donhang_id=order.donhang_id,
                            nguoidung_id=current_user.nguoidung_id if current_user else None,
                        )
            return

        for item in details:
            if not item.lohang_sanpham_id or not item.so_luong:
                continue
            stock = db.query(TonKhoSanPham).filter(
                TonKhoSanPham.lohang_sanpham_id == item.lohang_sanpham_id
            ).with_for_update().first()
            if stock:
                before = stock.so_luong_hien_tai or 0
                stock.so_luong_hien_tai = before + item.so_luong
                stock.so_luong_da_ban = max((stock.so_luong_da_ban or 0) - item.so_luong, 0)
                self.ledger.log_product_movement(
                    db,
                    lohang_sanpham_id=item.lohang_sanpham_id,
                    loai_giao_dich="tra_hang",
                    so_luong=item.so_luong,
                    so_luong_truoc=before,
                    so_luong_sau=stock.so_luong_hien_tai,
                    ly_do=f"{reason} (legacy detail fallback)",
                    donhang_id=order.donhang_id,
                    nguoidung_id=current_user.nguoidung_id if current_user else None,
                )

    def _restore_voucher_usage(self, db: Session, order_id: int) -> None:
        links = db.query(DonHangPhieuGiamGia).filter(DonHangPhieuGiamGia.donhang_id == order_id).all()
        for link in links:
            voucher = db.query(PhieuGiamGia).filter(PhieuGiamGia.phieugiam_id == link.phieugiam_id).first()
            if voucher:
                voucher.so_lan_da_dung = max((voucher.so_lan_da_dung or 0) - 1, 0)

    def fail_unpaid_order(self, db: Session, order_id: int, reason: str) -> None:
        order = db.query(DonHang).filter(DonHang.donhang_id == order_id).first()
        if not order or order.trang_thai in ["da_huy", "huy"]:
            return

        successful_paid = db.query(func.sum(ThanhToan.so_tien)).filter(
            ThanhToan.donhang_id == order_id,
            ThanhToan.trang_thai == "thanh_cong",
        ).scalar() or Decimal("0")
        if successful_paid > 0:
            return

        self._restore_order_inventory(db, order, None, reason)
        self._restore_voucher_usage(db, order_id)
        order.trang_thai = "da_huy"
        order.ghi_chu = (order.ghi_chu or "") + f"\n[PAYMENT FAILED - {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}] {reason}"

    def cancel_order(self, db: Session, order_id: int, ly_do: str, current_user: NguoiDung) -> dict:
        order = db.query(DonHang).filter(DonHang.donhang_id == order_id).first()
        if not order:
            raise DomainError(status_code=404, detail="Đơn hàng không tồn tại")

        vaitro_ten = current_user.vaitro.ten_vai_tro if current_user.vaitro else None
        if vaitro_ten not in ["admin", "manager"]:
            if order.nguoidung_id != current_user.nguoidung_id:
                raise DomainError(status_code=403, detail="Bạn chỉ có thể hủy đơn hàng của mình")
            if order.trang_thai in ["hoan_thanh", "dang_giao"]:
                raise DomainError(status_code=400, detail="Không thể hủy đơn hàng đã thanh toán hoặc hoàn thành")

        if order.trang_thai in ["da_huy", "huy"]:
            raise DomainError(status_code=400, detail="Đơn hàng đã bị hủy")

        try:
            self._restore_order_inventory(db, order, current_user, f"Order cancellation: {ly_do}")
            self._restore_voucher_usage(db, order_id)
            order.trang_thai = "da_huy"
            order.ghi_chu = (order.ghi_chu or "") + f"\n[HỦY ĐƠN - {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}] {ly_do}"
            db.commit()
            db.refresh(order)
        except Exception as e:
            db.rollback()
            raise DomainError(status_code=500, detail=f"Lỗi khi hủy đơn hàng: {str(e)}")

        return self.get_order(db=db, order_id=order_id, current_user=current_user)

    def delete_order(self, db: Session, order_id: int) -> None:
        """Hard-delete — genuinely permanent, unlike cancel_order().

        Used to manually pre-delete ChiTietDonHang/PhanBoChiTietDonHang/
        LichSuKho{SanPham,LinhKien,HopQua}/DanhGiaSanPham/DoiTra/ThanhToan/
        DonHangPhieuGiamGia before deleting the order itself — i.e. it
        deliberately cleared away the inventory ledger and payment history
        so that the DB's own FK protection wouldn't stop it. See
        docs/specs/02-orders.md Finding #4.

        The DB schema already gets this right on its own: ChiTietDonHang,
        PhanBoChiTietDonHang, DonHangPhieuGiamGia, ThanhToan and DoiTra all
        cascade-delete with the order (acceptable — those are order-scoped
        records with no independent meaning), DanhGiaSanPham SET NULLs its
        order reference (a review can outlive the order), but
        LichSuKho{SanPham,LinhKien,HopQua} (the inventory ledger — audit
        trail of real stock movements) has no cascade/set-null rule at all,
        so Postgres rejects the delete outright if this order ever moved
        real inventory. Letting that happen (instead of working around it)
        is the fix: this now only succeeds for orders that never actually
        processed anything. Anything that has — use cancel_order() instead,
        which preserves history.
        """
        order = db.query(DonHang).filter(DonHang.donhang_id == order_id).first()
        if not order:
            raise DomainError(status_code=404, detail=f"Không tìm thấy đơn hàng #{order_id}")

        try:
            db.delete(order)
            db.commit()
        except IntegrityError:
            db.rollback()
            raise DomainError(
                status_code=400,
                detail=(
                    "Không thể xóa vĩnh viễn đơn hàng đã có lịch sử kho (nhập/xuất/điều chỉnh). "
                    "Hãy dùng hủy đơn (cancel) để giữ lại lịch sử kiểm toán."
                ),
            )
