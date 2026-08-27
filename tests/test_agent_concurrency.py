"""Integration test for the concurrency guard in
app.services.agent.agent_service.approve_action — two managers approving
the same pending action at nearly the same time must not both execute the
underlying tool.

This can't be exercised through the ordinary `db_session` fixture (see
tests/conftest.py): that fixture wraps each test in an outer transaction
that's rolled back at teardown, using SAVEPOINTs to make `session.commit()`
inside the code under test *look* like a real commit without one actually
happening. A second, independent connection would never see those
uncommitted rows — but seeing each other's committed state is exactly what
two concurrent requests racing against the same row need. So this test
uses its own connections that commit for real, and cleans up explicitly.
"""
import os
import threading
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import (
    AgentAction,
    BienTheSanPham,
    CanhBaoTonKho,
    LoHangSanPham,
    NguoiDung,
    SanPham,
    TonKhoSanPham,
    VaiTro,
)
from app.services.agent import agent_service
from app.services.alerts import AlertService
from app.services.errors import DomainError

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL") or os.getenv("DATABASE_URL")

pytestmark = pytest.mark.skipif(not TEST_DATABASE_URL, reason="requires a real Postgres DATABASE_URL")


def test_concurrent_approve_executes_the_underlying_tool_exactly_once():
    engine = create_engine(TEST_DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    suffix = uuid.uuid4().hex[:8]
    created: dict = {}

    setup = SessionLocal()
    try:
        # approve_action now checks the caller's real role name ("admin"/
        # "manager"/"staff") against the target tool's classification —
        # a made-up role string like the old "concurrency_admin_role_*"
        # would correctly get rejected with 403 before ever reaching the
        # claim step this test is exercising. Reuse "admin" if another
        # test already committed it in this DB; only clean it up here if
        # this run is the one that created it.
        role = setup.query(VaiTro).filter(VaiTro.ten_vai_tro == "admin").first()
        created_role = role is None
        if role is None:
            role = VaiTro(ten_vai_tro="admin")
            setup.add(role)
            setup.flush()
        user = NguoiDung(
            ten_dang_nhap=f"concurrency_admin_{suffix}",
            email=f"concurrency_admin_{suffix}@example.com",
            mat_khau_ma_hoa="hashed",
            vaitro_id=role.vaitro_id,
            ho_ten="Concurrency Admin",
        )
        setup.add(user)
        setup.flush()

        product = SanPham(ten="Bánh concurrency", sku=f"SP-CONC-{suffix}", gia_co_ban=Decimal("50000"))
        setup.add(product)
        setup.flush()
        variant = BienTheSanPham(sanpham_id=product.sanpham_id, huong_vi="Vani", gia_bienthe=Decimal("50000"))
        setup.add(variant)
        setup.flush()
        batch = LoHangSanPham(
            bienthe_sanpham_id=variant.bienthe_id,
            ma_lo=f"LOT-CONC-{suffix}",
            ngay_het_han=datetime.now() + timedelta(days=90),
            so_luong=3,
            gia_don_vi=Decimal("50000"),
            trang_thai="hoatdong",
        )
        setup.add(batch)
        setup.flush()
        inventory = TonKhoSanPham(lohang_sanpham_id=batch.lohang_id, so_luong_hien_tai=3, so_luong_da_ban=0)
        setup.add(inventory)
        setup.flush()

        AlertService().generate_alerts(setup, low_stock_threshold=10, expiring_days=7)
        alert = setup.query(CanhBaoTonKho).filter(
            CanhBaoTonKho.loai_canh_bao == "san_pham_can_nhap",
            CanhBaoTonKho.trang_thai == "chua_xu_ly",
        ).one()

        proposal = agent_service.propose_action(setup, "resolve_alert", {"alert_id": alert.canhbao_id}, user)
        setup.commit()

        created = {
            "action_id": proposal["action"]["action_id"],
            "alert_id": alert.canhbao_id,
            "tonkho_id": inventory.tonkho_id,
            "lohang_id": batch.lohang_id,
            "bienthe_id": variant.bienthe_id,
            "sanpham_id": product.sanpham_id,
            "nguoidung_id": user.nguoidung_id,
            "vaitro_id": role.vaitro_id,
            "created_role": created_role,
        }
    finally:
        setup.close()

    try:
        results: dict[str, tuple] = {}
        barrier = threading.Barrier(2)

        def worker(key: str) -> None:
            session = SessionLocal()
            try:
                worker_user = session.query(NguoiDung).filter(NguoiDung.nguoidung_id == created["nguoidung_id"]).first()
                barrier.wait()
                try:
                    result = agent_service.approve_action(session, created["action_id"], worker_user)
                    results[key] = ("ok", result["trang_thai"])
                except DomainError as exc:
                    results[key] = ("error", exc.status_code)
            finally:
                session.close()

        threads = [threading.Thread(target=worker, args=(f"t{i}",)) for i in range(2)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        outcomes = sorted(results.values())
        assert outcomes == [("error", 400), ("ok", "hoan_thanh")], (
            "exactly one of the two concurrent approvals should succeed and the other "
            f"should be rejected as already-processed; got {results}"
        )

        verify = SessionLocal()
        try:
            action = verify.query(AgentAction).filter(AgentAction.action_id == created["action_id"]).first()
            assert action.trang_thai == "hoan_thanh"
            # Whichever request won holds the sole approver record — proof
            # the claim wasn't split between the two racing requests.
            assert action.nguoidung_duyet_id == created["nguoidung_id"]
        finally:
            verify.close()
    finally:
        cleanup = SessionLocal()
        try:
            cleanup.query(AgentAction).filter(AgentAction.action_id == created["action_id"]).delete()
            cleanup.query(CanhBaoTonKho).filter(CanhBaoTonKho.canhbao_id == created["alert_id"]).delete()
            cleanup.query(TonKhoSanPham).filter(TonKhoSanPham.tonkho_id == created["tonkho_id"]).delete()
            cleanup.query(LoHangSanPham).filter(LoHangSanPham.lohang_id == created["lohang_id"]).delete()
            cleanup.query(BienTheSanPham).filter(BienTheSanPham.bienthe_id == created["bienthe_id"]).delete()
            cleanup.query(SanPham).filter(SanPham.sanpham_id == created["sanpham_id"]).delete()
            cleanup.query(NguoiDung).filter(NguoiDung.nguoidung_id == created["nguoidung_id"]).delete()
            if created.get("created_role"):
                cleanup.query(VaiTro).filter(VaiTro.vaitro_id == created["vaitro_id"]).delete()
            cleanup.commit()
        finally:
            cleanup.close()
        engine.dispose()
