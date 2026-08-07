"""align operational enum labels with order and inventory services.

Revision ID: 0003_align_operational_enums
Revises: 0002_chat_messages_n8n
"""

from alembic import op


revision = "0003_align_operational_enums"
down_revision = "0002_chat_messages_n8n"
branch_labels = None
depends_on = None


ENUM_LABELS = {
    "loai_don_hang": ("dat_truoc",),
    "trang_thai_don_hang": ("dang_giao", "hoan_thanh", "da_huy", "cho_coc"),
    "trang_thai_lo_hang": ("tamdung", "daxuathet"),
    "phuong_thuc_thanh_toan": ("the_tin_dung",),
    "trang_thai_thanh_toan": ("da_hoan_tien",),
    "trang_thai_doi_tra": ("da_duyet", "da_hoan_thanh"),
    "loai_giao_dich_kho": (
        "nhap_hang",
        "xuat_ban",
        "xuat_huy",
        "dieu_chinh",
        "tra_hang",
        "xuat_bom",
    ),
}


def upgrade() -> None:
    for enum_name, labels in ENUM_LABELS.items():
        for label in labels:
            op.execute(f"ALTER TYPE {enum_name} ADD VALUE IF NOT EXISTS '{label}'")


def downgrade() -> None:
    # PostgreSQL cannot remove enum labels without recreating dependent columns.
    # Keep this revision forward-only to avoid destructive schema rewrites.
    pass
