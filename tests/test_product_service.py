"""
Tests for app.services.products.ProductService — Phase 1 service-layer
migration (see app/routers/products.py / app/services/products/
product_service.py).
"""
from decimal import Decimal

import pytest

from app.services.products import DomainError, ProductService


@pytest.fixture()
def service() -> ProductService:
    return ProductService()


class _ProductPayload:
    def __init__(self, ten, sku, gia_co_ban=Decimal("50000")):
        self.ten = ten
        self.sku = sku
        self.loai = "don"
        self.gia_co_ban = gia_co_ban
        self.mo_ta = None
        self.hinh_anh_url = None
        self.danh_muc = None
        self.don_vi_tinh = "chiếc"
        self.phu_hop_dip = None
        self.dang_hoat_dong = True

    def model_dump(self, exclude_unset=False):
        return {
            "ten": self.ten, "sku": self.sku, "loai": self.loai, "gia_co_ban": self.gia_co_ban,
            "mo_ta": self.mo_ta, "hinh_anh_url": self.hinh_anh_url, "danh_muc": self.danh_muc,
            "don_vi_tinh": self.don_vi_tinh, "phu_hop_dip": self.phu_hop_dip, "dang_hoat_dong": self.dang_hoat_dong,
        }


class _VariantPayload:
    def __init__(self, sanpham_id, huong_vi="Vani", sku_bienthe=None):
        self.sanpham_id = sanpham_id
        self.huong_vi = huong_vi
        self.kich_thuoc = None
        self.gia_bienthe = Decimal("50000")
        self.sku_bienthe = sku_bienthe
        self.muc_gioi_han_ton = 10
        self.dang_hoat_dong = True

    def model_dump(self, exclude_unset=False):
        return {
            "sanpham_id": self.sanpham_id, "huong_vi": self.huong_vi, "kich_thuoc": self.kich_thuoc,
            "gia_bienthe": self.gia_bienthe, "sku_bienthe": self.sku_bienthe,
            "muc_gioi_han_ton": self.muc_gioi_han_ton, "dang_hoat_dong": self.dang_hoat_dong,
        }


class TestProductCrud:
    def test_rejects_duplicate_sku(self, db_session, service):
        service.create_product(db_session, _ProductPayload("Bánh A", "SKU-DUP-1"))
        with pytest.raises(DomainError) as exc_info:
            service.create_product(db_session, _ProductPayload("Bánh B", "SKU-DUP-1"))
        assert exc_info.value.status_code == 400

    def test_delete_is_soft_delete(self, db_session, service):
        product = service.create_product(db_session, _ProductPayload("Bánh xoá", "SKU-DEL-1"))
        service.delete_product(db_session, product.sanpham_id)

        # Soft delete: still fetchable directly, just flagged inactive
        still_there = service.get_product(db_session, product.sanpham_id)
        assert still_there.dang_hoat_dong is False

    def test_get_not_found_raises_404(self, db_session, service):
        with pytest.raises(DomainError) as exc_info:
            service.get_product(db_session, 999999)
        assert exc_info.value.status_code == 404


class TestVariantCrud:
    def test_rejects_unknown_product(self, db_session, service):
        with pytest.raises(DomainError) as exc_info:
            service.create_variant(db_session, _VariantPayload(sanpham_id=999999))
        assert exc_info.value.status_code == 404

    def test_rejects_duplicate_variant_sku(self, db_session, service):
        product = service.create_product(db_session, _ProductPayload("Bánh biến thể", "SKU-VAR-1"))
        service.create_variant(db_session, _VariantPayload(product.sanpham_id, sku_bienthe="VAR-DUP"))
        with pytest.raises(DomainError) as exc_info:
            service.create_variant(db_session, _VariantPayload(product.sanpham_id, sku_bienthe="VAR-DUP"))
        assert exc_info.value.status_code == 400

    def test_get_product_variants_returns_only_that_products_variants(self, db_session, service):
        product_a = service.create_product(db_session, _ProductPayload("Bánh A2", "SKU-VAR-A"))
        product_b = service.create_product(db_session, _ProductPayload("Bánh B2", "SKU-VAR-B"))
        service.create_variant(db_session, _VariantPayload(product_a.sanpham_id, huong_vi="Dâu"))
        service.create_variant(db_session, _VariantPayload(product_b.sanpham_id, huong_vi="Socola"))

        variants = service.get_product_variants(db_session, product_a.sanpham_id)
        assert len(variants) == 1
        assert variants[0].huong_vi == "Dâu"


    def test_deleting_last_variant_hides_parent_product(self, db_session, service):
        product = service.create_product(db_session, _ProductPayload("Last variant cake", "SKU-LAST-VARIANT"))
        variant = service.create_variant(db_session, _VariantPayload(product.sanpham_id, sku_bienthe="LAST-VARIANT"))

        service.delete_variant(db_session, variant.bienthe_id)

        assert service.get_variant(db_session, variant.bienthe_id).dang_hoat_dong is False
        assert service.get_product(db_session, product.sanpham_id).dang_hoat_dong is False

    def test_deleting_one_of_multiple_variants_keeps_parent_product_active(self, db_session, service):
        product = service.create_product(db_session, _ProductPayload("Multiple variant cake", "SKU-MULTI-VARIANT"))
        first = service.create_variant(db_session, _VariantPayload(product.sanpham_id, sku_bienthe="MULTI-ONE"))
        service.create_variant(db_session, _VariantPayload(product.sanpham_id, sku_bienthe="MULTI-TWO"))

        service.delete_variant(db_session, first.bienthe_id)

        assert service.get_product(db_session, product.sanpham_id).dang_hoat_dong is True

    def test_active_catalog_excludes_product_without_an_active_variant(self, db_session, service):
        product = service.create_product(db_session, _ProductPayload("Inactive variant cake", "SKU-INACTIVE-VARIANT"))
        product.loai = "bien_the"
        variant = service.create_variant(db_session, _VariantPayload(product.sanpham_id, sku_bienthe="INACTIVE-VARIANT"))
        variant.dang_hoat_dong = False
        db_session.commit()

        products = service.list_products(db_session, dang_hoat_dong=True)

        assert product.sanpham_id not in {item.sanpham_id for item in products}


class TestImageUpload:
    def test_rejects_non_image_content_type(self, service):
        with pytest.raises(DomainError) as exc_info:
            service.store_product_image("text/plain", "notes.txt", b"hello")
        assert exc_info.value.status_code == 400

    def test_rejects_oversized_file(self, service):
        oversized = b"x" * (5 * 1024 * 1024 + 1)
        with pytest.raises(DomainError) as exc_info:
            service.store_product_image("image/jpeg", "big.jpg", oversized)
        assert exc_info.value.status_code == 400
