"""
HTTP-level tests for POST/PUT/DELETE /products — the request-validation and
auth/role boundary that app.services.products.ProductService's own tests
(tests/test_product_service.py) don't exercise, since those call the service
directly and bypass the router's Pydantic schemas and require_role() guard.

Written during manual admin-dashboard QA: the UI's client-side form blocks
most bad input before it reaches the API, so this checks the API holds the
line on its own for a client that doesn't go through that form (a script,
a future mobile client, curl, an attacker).
"""
import pytest

from app.core.security import create_access_token
from app.models import NguoiDung, VaiTro


@pytest.fixture()
def admin_token(db_session) -> str:
    role = db_session.query(VaiTro).filter_by(ten_vai_tro="admin").first()
    if not role:
        role = VaiTro(ten_vai_tro="admin")
        db_session.add(role)
        db_session.flush()
    user = NguoiDung(
        ten_dang_nhap="product_api_admin",
        email="product_api_admin@example.com",
        mat_khau_ma_hoa="hashed",
        vaitro_id=role.vaitro_id,
        ho_ten="Product API Admin",
    )
    db_session.add(user)
    db_session.flush()
    return create_access_token({"sub": user.nguoidung_id})


@pytest.fixture()
def customer_token(db_session) -> str:
    role = db_session.query(VaiTro).filter_by(ten_vai_tro="customer").first()
    if not role:
        role = VaiTro(ten_vai_tro="customer")
        db_session.add(role)
        db_session.flush()
    user = NguoiDung(
        ten_dang_nhap="product_api_customer",
        email="product_api_customer@example.com",
        mat_khau_ma_hoa="hashed",
        vaitro_id=role.vaitro_id,
        ho_ten="Product API Customer",
    )
    db_session.add(user)
    db_session.flush()
    return create_access_token({"sub": user.nguoidung_id})


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


VALID_PAYLOAD = {"ten": "Bánh test API", "sku": "SP-API-VALID-1", "gia_co_ban": 50000}


class TestCreateProductAuth:
    def test_rejects_anonymous_request(self, client):
        res = client.post("/products", json=VALID_PAYLOAD)
        assert res.status_code == 401

    def test_rejects_customer_role(self, client, customer_token):
        res = client.post("/products", json=VALID_PAYLOAD, headers=_auth(customer_token))
        assert res.status_code == 403

    def test_allows_admin_role(self, client, admin_token):
        res = client.post("/products", json=VALID_PAYLOAD, headers=_auth(admin_token))
        assert res.status_code == 201


class TestCreateProductValidation:
    @pytest.mark.parametrize(
        "field,value",
        [
            ("gia_co_ban", 0),
            ("gia_co_ban", -100),
            ("ten", ""),
            ("ten", "x" * 201),
            ("sku", ""),
            ("sku", "S" * 51),
            ("loai", "khong_hop_le"),
        ],
    )
    def test_rejects_invalid_field(self, client, admin_token, field, value):
        payload = {**VALID_PAYLOAD, "sku": f"SP-API-INVALID-{field}", field: value}
        res = client.post("/products", json=payload, headers=_auth(admin_token))
        assert res.status_code == 422, f"{field}={value!r} should be rejected, got {res.status_code}: {res.text}"

    def test_rejects_missing_required_field(self, client, admin_token):
        payload = {"sku": "SP-API-NOTEN", "gia_co_ban": 1000}  # missing `ten`
        res = client.post("/products", json=payload, headers=_auth(admin_token))
        assert res.status_code == 422

    def test_accepts_price_with_two_decimal_places(self, client, admin_token):
        payload = {**VALID_PAYLOAD, "sku": "SP-API-DECIMAL", "gia_co_ban": "99999.99"}
        res = client.post("/products", json=payload, headers=_auth(admin_token))
        assert res.status_code == 201
        assert res.json()["gia_co_ban"] == 99999.99


class TestSkuNormalization:
    """SKUs are uppercased + trimmed at the schema boundary (see
    app/routers/products.py _normalize_sku), so 'CAKE-001' and 'cake-001'
    are always the same SKU — both for the duplicate check and for what
    ends up stored. Was previously case-sensitive (a real gap, see
    alembic/versions/0005_normalize_sku_case.py for the data backfill)."""

    def test_same_case_duplicate_is_rejected(self, client, admin_token):
        client.post("/products", json={**VALID_PAYLOAD, "sku": "SP-API-CASE-1"}, headers=_auth(admin_token))
        res = client.post("/products", json={**VALID_PAYLOAD, "sku": "SP-API-CASE-1"}, headers=_auth(admin_token))
        assert res.status_code == 400

    def test_different_case_duplicate_is_now_rejected(self, client, admin_token):
        client.post("/products", json={**VALID_PAYLOAD, "sku": "SP-API-CASE-2"}, headers=_auth(admin_token))
        res = client.post("/products", json={**VALID_PAYLOAD, "sku": "sp-api-case-2"}, headers=_auth(admin_token))
        assert res.status_code == 400, (
            f"'sp-api-case-2' should collide with existing 'SP-API-CASE-2'. Got {res.status_code}: {res.text}"
        )

    def test_lowercase_input_is_stored_uppercase(self, client, admin_token):
        res = client.post("/products", json={**VALID_PAYLOAD, "sku": "sp-api-lower-1"}, headers=_auth(admin_token))
        assert res.status_code == 201
        assert res.json()["sku"] == "SP-API-LOWER-1"

    def test_whitespace_padded_sku_is_trimmed_and_rejects_case_variant(self, client, admin_token):
        client.post("/products", json={**VALID_PAYLOAD, "sku": "  sp-api-case-3  "}, headers=_auth(admin_token))
        res = client.post("/products", json={**VALID_PAYLOAD, "sku": "SP-API-CASE-3"}, headers=_auth(admin_token))
        assert res.status_code == 400

    def test_whitespace_only_sku_is_rejected(self, client, admin_token):
        res = client.post("/products", json={**VALID_PAYLOAD, "sku": "   "}, headers=_auth(admin_token))
        assert res.status_code == 422


class TestUpdateAndDeleteBoundaries:
    def test_update_nonexistent_product_returns_404(self, client, admin_token):
        res = client.put("/products/999999999", json={"ten": "x"}, headers=_auth(admin_token))
        assert res.status_code == 404

    def test_delete_nonexistent_product_returns_404(self, client, admin_token):
        res = client.delete("/products/999999999", headers=_auth(admin_token))
        assert res.status_code == 404

    def test_update_rejects_invalid_price_same_as_create(self, client, admin_token):
        create = client.post("/products", json={**VALID_PAYLOAD, "sku": "SP-API-UPDATE-1"}, headers=_auth(admin_token))
        product_id = create.json()["sanpham_id"]
        res = client.put(f"/products/{product_id}", json={"gia_co_ban": -1}, headers=_auth(admin_token))
        assert res.status_code == 422

    def test_delete_is_idempotent(self, client, admin_token):
        create = client.post("/products", json={**VALID_PAYLOAD, "sku": "SP-API-DEL-IDEMPOTENT"}, headers=_auth(admin_token))
        product_id = create.json()["sanpham_id"]
        first = client.delete(f"/products/{product_id}", headers=_auth(admin_token))
        second = client.delete(f"/products/{product_id}", headers=_auth(admin_token))
        assert first.status_code == 204
        assert second.status_code == 204  # soft delete of an already-inactive product doesn't error

    def test_deleted_product_still_returned_by_get(self, client, admin_token):
        """Soft delete: the row stays fully readable via GET /products/{id}
        with dang_hoat_dong=False. Matches the admin UI, where the product
        stays in the list forever with status "Ẩn" instead of disappearing —
        confirms that's the service's real contract, not a UI display bug."""
        create = client.post("/products", json={**VALID_PAYLOAD, "sku": "SP-API-DEL-VISIBLE"}, headers=_auth(admin_token))
        product_id = create.json()["sanpham_id"]
        client.delete(f"/products/{product_id}", headers=_auth(admin_token))
        res = client.get(f"/products/{product_id}")
        assert res.status_code == 200
        assert res.json()["dang_hoat_dong"] is False
