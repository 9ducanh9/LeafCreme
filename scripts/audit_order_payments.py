"""Read-only report; run before rollout and review against bank records.

Usage: python -m scripts.audit_order_payments
No inventory, order, or payment state is changed.
"""
import json

from sqlalchemy import text

from app.db import engine


def main():
    queries = {
        "cancelled_with_successful_payment": """
            SELECT d.donhang_id, d.ma_don_hang, p.thanhtoan_id,
                   p.ma_giao_dich, p.so_tien
            FROM donhang d JOIN thanhtoan p USING (donhang_id)
            WHERE d.trang_thai = 'da_huy' AND p.trang_thai = 'thanh_cong'
            ORDER BY d.donhang_id
        """,
        "active_online_without_payment_review_cod_manually": """
            SELECT d.donhang_id, d.ma_don_hang, d.ngay_tao, d.tien_thanh_toan
            FROM donhang d
            WHERE d.loai_don = 'online' AND d.trang_thai IN ('cho', 'cho_coc', 'dang_xu_ly')
              AND NOT EXISTS (SELECT 1 FROM thanhtoan p WHERE p.donhang_id = d.donhang_id)
            ORDER BY d.donhang_id
        """,
        "cancelled_with_product_export_without_return": """
            SELECT d.donhang_id, d.ma_don_hang
            FROM donhang d
            WHERE d.trang_thai = 'da_huy'
              AND EXISTS (SELECT 1 FROM lichsukhosanpham l WHERE l.donhang_id = d.donhang_id AND l.loai_giao_dich = 'xuat')
              AND NOT EXISTS (SELECT 1 FROM lichsukhosanpham l WHERE l.donhang_id = d.donhang_id AND l.loai_giao_dich = 'tra_hang')
            ORDER BY d.donhang_id
        """,
    }
    with engine.connect() as connection, connection.begin():
        connection.execute(text("SET TRANSACTION READ ONLY"))
        report = {name: [dict(row) for row in connection.execute(text(query)).mappings()] for name, query in queries.items()}
    print(json.dumps(report, default=str, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
