"""
Tests for app.services.gift_boxes.GiftBoxService — Phase 1 service-layer
migration (see app/services/gift_boxes/gift_box_service.py module docstring).
"""
from decimal import Decimal

import pytest

from app.models import BienTheSanPham, HopQua, SanPham
from app.services.gift_boxes import DomainError, GiftBoxService


@pytest.fixture()
def service() -> GiftBoxService:
    return GiftBoxService()


@pytest.fixture()
def variant(db_session) -> BienTheSanPham:
    product = SanPham(ten="Bánh cho hộp quà", sku="SP-GB-TEST", gia_co_ban=Decimal("30000"))
    db_session.add(product)
    db_session.flush()
    v = BienTheSanPham(sanpham_id=product.sanpham_id, huong_vi="Socola", gia_bienthe=Decimal("30000"))
    db_session.add(v)
    db_session.flush()
    return v


class _GiftBoxPayload:
    def __init__(self, ten_hop_qua, sku=None, gia_ban=Decimal("100000")):
        self.ten_hop_qua = ten_hop_qua
        self.sku = sku
        self.gia_ban = gia_ban
        self.mo_ta = None
        self.hinh_anh_url = None
        self.kich_thuoc = None
        self.trong_luong = None
        self.dang_hoat_dong = True

    def model_dump(self):
        return {
            "ten_hop_qua": self.ten_hop_qua, "sku": self.sku, "gia_ban": self.gia_ban,
            "mo_ta": self.mo_ta, "hinh_anh_url": self.hinh_anh_url, "kich_thuoc": self.kich_thuoc,
            "trong_luong": self.trong_luong, "dang_hoat_dong": self.dang_hoat_dong,
        }


class TestCreateGiftBox:
    def test_auto_generates_sku_when_missing(self, db_session, service):
        result = service.create_gift_box(db_session, _GiftBoxPayload("Hộp quà tự động SKU"))
        assert result["sku"].startswith("GIFTBOX-")

    def test_rejects_duplicate_sku(self, db_session, service):
        service.create_gift_box(db_session, _GiftBoxPayload("Hộp 1", sku="GB-DUP"))
        with pytest.raises(DomainError) as exc_info:
            service.create_gift_box(db_session, _GiftBoxPayload("Hộp 2", sku="GB-DUP"))
        assert exc_info.value.status_code == 400


class TestVisibility:
    def test_inactive_box_hidden_from_public_get(self, db_session, service):
        created = service.create_gift_box(db_session, _GiftBoxPayload("Hộp ẩn", sku="GB-HIDDEN"))
        gift_box = db_session.query(HopQua).filter(HopQua.hop_qua_id == created["hop_qua_id"]).first()
        gift_box.dang_hoat_dong = False
        db_session.commit()

        # Admin can still see it
        admin_result = service.get_gift_box(db_session, created["hop_qua_id"], active_only=False)
        assert admin_result["hop_qua_id"] == created["hop_qua_id"]

        # Public cannot
        with pytest.raises(DomainError) as exc_info:
            service.get_gift_box(db_session, created["hop_qua_id"], active_only=True)
        assert exc_info.value.status_code == 404

    def test_public_list_defaults_to_active_only(self, db_session, service):
        active = service.create_gift_box(db_session, _GiftBoxPayload("Hộp hoạt động", sku="GB-ACTIVE"))
        inactive = service.create_gift_box(db_session, _GiftBoxPayload("Hộp tạm ẩn", sku="GB-INACTIVE"))
        gift_box = db_session.query(HopQua).filter(HopQua.hop_qua_id == inactive["hop_qua_id"]).first()
        gift_box.dang_hoat_dong = False
        db_session.commit()

        public_ids = {gb["hop_qua_id"] for gb in service.list_gift_boxes(db_session, default_active_only=True)}
        assert active["hop_qua_id"] in public_ids
        assert inactive["hop_qua_id"] not in public_ids

        admin_ids = {gb["hop_qua_id"] for gb in service.list_gift_boxes(db_session, default_active_only=False)}
        assert active["hop_qua_id"] in admin_ids
        assert inactive["hop_qua_id"] in admin_ids


class TestBom:
    def test_add_bom_item(self, db_session, service, variant):
        gift_box = service.create_gift_box(db_session, _GiftBoxPayload("Hộp có BOM", sku="GB-BOM-1"))

        class Payload:
            bienthe_id = variant.bienthe_id
            so_luong = 2

        result = service.add_bom_item(db_session, gift_box["hop_qua_id"], Payload())
        assert result["bienthe_id"] == variant.bienthe_id
        assert result["product_name"] == "Bánh cho hộp quà"

    def test_rejects_duplicate_bom_variant(self, db_session, service, variant):
        gift_box = service.create_gift_box(db_session, _GiftBoxPayload("Hộp BOM trùng", sku="GB-BOM-2"))

        class Payload:
            bienthe_id = variant.bienthe_id
            so_luong = 2

        service.add_bom_item(db_session, gift_box["hop_qua_id"], Payload())
        with pytest.raises(DomainError) as exc_info:
            service.add_bom_item(db_session, gift_box["hop_qua_id"], Payload())
        assert exc_info.value.status_code == 400

    def test_cannot_delete_last_bom_item(self, db_session, service, variant):
        gift_box = service.create_gift_box(db_session, _GiftBoxPayload("Hộp 1 BOM", sku="GB-BOM-3"))

        class Payload:
            bienthe_id = variant.bienthe_id
            so_luong = 1

        added = service.add_bom_item(db_session, gift_box["hop_qua_id"], Payload())

        with pytest.raises(DomainError) as exc_info:
            service.delete_bom_item(db_session, gift_box["hop_qua_id"], added["bom_id"])
        assert exc_info.value.status_code == 400
