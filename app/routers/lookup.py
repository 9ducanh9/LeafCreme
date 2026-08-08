from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.db import get_db
from app.models import (
    BienTheSanPham,
    NguoiDung,
    SanPham,
    LoHangSanPham,
    LoHangLinhKien,
    LoHangHopQua,
)

router = APIRouter(prefix="/lookup", tags=["lookup"])


class ScanLookupResponse(BaseModel):
    type: str
    product_id: int | None = None
    product_name: str | None = None
    product_image: str | None = None
    variant_id: int | None = None
    variant_label: str | None = None
    price: float | None = None
    sku: str | None = None
    batch_id: int | None = None
    ma_lo: str | None = None
    ma_qr: str | None = None


@router.get("/scan", response_model=ScanLookupResponse)
def scan_lookup(
    code: str = Query(..., min_length=1, description="Mã scan (SKU biến thể / SKU sản phẩm / mã QR / mã lô)"),
    db: Session = Depends(get_db),
    # Internal stock-receiving lookup only (used by AdminBatchCreatePage).
    # Was previously unauthenticated and reachable from the public /cart
    # page; batch/lot info (ma_lo, batch_id) is internal operational data
    # and should never be exposed to anonymous callers.
    current_user: NguoiDung = Depends(require_role("admin", "manager", "staff")),
):
    raw = (code or "").strip()
    if not raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mã scan không hợp lệ")

    mode: str | None = None
    normalized = raw
    if normalized.upper().startswith("VAR:"):
        mode = "variant"
        normalized = normalized[4:].strip()
    elif normalized.upper().startswith("BATCH:"):
        mode = "batch"
        normalized = normalized[6:].strip()

    if not normalized:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mã scan không hợp lệ")

    if mode in (None, "variant"):
        variant = db.query(BienTheSanPham).filter(BienTheSanPham.sku_bienthe == normalized).first()
        if variant:
            product = db.query(SanPham).filter(SanPham.sanpham_id == variant.sanpham_id).first()
            variant_label = f"{variant.huong_vi} {variant.kich_thuoc or ''}".strip()
            return ScanLookupResponse(
                type="variant",
                product_id=product.sanpham_id if product else None,
                product_name=product.ten if product else None,
                product_image=product.hinh_anh_url if product else None,
                variant_id=variant.bienthe_id,
                variant_label=variant_label or None,
                price=float(variant.gia_bienthe),
                sku=variant.sku_bienthe or (product.sku if product else None),
            )

        product = db.query(SanPham).filter(SanPham.sku == normalized).first()
        if product:
            return ScanLookupResponse(
                type="product",
                product_id=product.sanpham_id,
                product_name=product.ten,
                product_image=product.hinh_anh_url,
                variant_id=None,
                variant_label=None,
                price=float(product.gia_co_ban),
                sku=product.sku,
            )

    if mode in (None, "batch"):
        batch_product = db.query(LoHangSanPham).filter(
            (LoHangSanPham.ma_qr == normalized) | (LoHangSanPham.ma_lo == normalized)
        ).first()
        if batch_product:
            return ScanLookupResponse(
                type="product_batch",
                batch_id=batch_product.lohang_id,
                ma_lo=batch_product.ma_lo,
                ma_qr=batch_product.ma_qr,
            )

        batch_component = db.query(LoHangLinhKien).filter(
            (LoHangLinhKien.ma_qr == normalized) | (LoHangLinhKien.ma_lo == normalized)
        ).first()
        if batch_component:
            return ScanLookupResponse(
                type="component_batch",
                batch_id=batch_component.lohang_id,
                ma_lo=batch_component.ma_lo,
                ma_qr=batch_component.ma_qr,
            )

        batch_giftbox = db.query(LoHangHopQua).filter(
            (LoHangHopQua.ma_qr == normalized) | (LoHangHopQua.ma_lo == normalized)
        ).first()
        if batch_giftbox:
            return ScanLookupResponse(
                type="giftbox_batch",
                batch_id=batch_giftbox.lohang_id,
                ma_lo=batch_giftbox.ma_lo,
                ma_qr=batch_giftbox.ma_qr,
            )

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy dữ liệu cho mã scan")
