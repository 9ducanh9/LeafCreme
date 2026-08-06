# These 3 files are historical — Alembic is now the source of truth

`20260528_inventory_ledger_allocations.sql` and `add_phu_hop_dip_to_sanpham.sql`
were applied by hand directly against the database, then later back-filled
into `app/models.py`. Both are now fully covered by
`alembic/versions/0001_baseline.py` (generated from the current
`app/models.py`, so it already includes `phanbolo_chitietdonhang`,
`lichsukholinhkien.donhang_id`, and `sanpham.phu_hop_dip`).

`create_chat_messages.sql` is covered by
`alembic/versions/0002_chat_messages_n8n.py` — kept as its own migration
since that table belongs to the n8n workflow, not the ORM.

Kept here for history, not meant to be run again. Any new schema change from
now on should be an Alembic revision (`alembic revision --autogenerate -m "..."`),
not a new file in this folder.
