from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models import LichSuKhoHopQua, LichSuKhoLinhKien, LichSuKhoSanPham


class InventoryLedgerService:
    def log_product_movement(
        self,
        db: Session,
        *,
        lohang_sanpham_id: int,
        loai_giao_dich: str,
        so_luong: int,
        so_luong_truoc: int,
        so_luong_sau: int,
        ly_do: str,
        donhang_id: Optional[int] = None,
        doitra_id: Optional[int] = None,
        nguoidung_id: Optional[int] = None,
        gia_tri: Optional[Decimal] = None,
    ) -> None:
        db.add(LichSuKhoSanPham(
            lohang_sanpham_id=lohang_sanpham_id,
            loai_giao_dich=loai_giao_dich,
            so_luong=so_luong,
            so_luong_truoc=so_luong_truoc,
            so_luong_sau=so_luong_sau,
            gia_tri=gia_tri,
            ly_do=ly_do,
            donhang_id=donhang_id,
            doitra_id=doitra_id,
            nguoidung_id=nguoidung_id,
        ))

    def log_component_movement(
        self,
        db: Session,
        *,
        lohang_linhkien_id: int,
        loai_giao_dich: str,
        so_luong: int,
        so_luong_truoc: int,
        so_luong_sau: int,
        ly_do: str,
        bom_id: Optional[int] = None,
        donhang_id: Optional[int] = None,
        nguoidung_id: Optional[int] = None,
        gia_tri: Optional[Decimal] = None,
    ) -> None:
        db.add(LichSuKhoLinhKien(
            lohang_linhkien_id=lohang_linhkien_id,
            loai_giao_dich=loai_giao_dich,
            so_luong=so_luong,
            so_luong_truoc=so_luong_truoc,
            so_luong_sau=so_luong_sau,
            gia_tri=gia_tri,
            ly_do=ly_do,
            bom_id=bom_id,
            donhang_id=donhang_id,
            nguoidung_id=nguoidung_id,
        ))

    def log_gift_box_movement(
        self,
        db: Session,
        *,
        lohang_hopqua_id: int,
        loai_giao_dich: str,
        so_luong: int,
        so_luong_truoc: int,
        so_luong_sau: int,
        ly_do: str,
        donhang_id: Optional[int] = None,
        nguoidung_id: Optional[int] = None,
        gia_tri: Optional[Decimal] = None,
    ) -> None:
        db.add(LichSuKhoHopQua(
            lohang_hopqua_id=lohang_hopqua_id,
            loai_giao_dich=loai_giao_dich,
            so_luong=so_luong,
            so_luong_truoc=so_luong_truoc,
            so_luong_sau=so_luong_sau,
            gia_tri=gia_tri,
            ly_do=ly_do,
            donhang_id=donhang_id,
            nguoidung_id=nguoidung_id,
        ))
