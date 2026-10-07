"""Paired service experiment; synthetic data, not customer/business evidence.

Historical service sources run unchanged against the current schema/dependencies.
This deliberately does not claim a full historical deployment benchmark.
"""
import hashlib
import json
import os
import runpy
import subprocess
import sys
import types
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.engine import make_url

from app.models import DonHang, ThanhToan, TonKhoSanPham
from app.services.orders.inventory_service import InventoryService
from app.services.orders.order_service import OrderService
from app.services.reports.report_service import ReportService

ROOT = Path(__file__).resolve().parents[1]
pytestmark = pytest.mark.skipif(os.getenv("RUN_OPERATIONS_BENCHMARK") != "1", reason="Opt-in controlled benchmark")
if os.getenv("RUN_OPERATIONS_BENCHMARK") == "1":
    target = make_url(os.environ["TEST_DATABASE_URL"])
    if (target.host, target.port, target.database) != ("127.0.0.1", 55439, "leafcreme_benchmark_test"):
        raise RuntimeError("Benchmark requires its dedicated local disposable database")


def historical(ref, path, package):
    source = subprocess.check_output(["git", "show", f"{ref}:{path}"], cwd=ROOT).decode("utf-8")
    name = f"{package}._benchmark_{hashlib.sha256(source.encode()).hexdigest()[:12]}"
    module = types.ModuleType(name)
    module.__package__ = package
    sys.modules[name] = module
    exec(compile(source, f"git:{ref}:{path}", "exec"), module.__dict__)
    return module, {"ref": subprocess.check_output(["git", "rev-parse", ref], cwd=ROOT).decode().strip(),
                    "path": path, "sha256": hashlib.sha256(source.encode()).hexdigest()}


def test_paired_operations_experiment(db_session, role_manager):
    inventory_helpers = runpy.run_path(str(ROOT / "tests/test_inventory_service.py"))
    order_helpers = runpy.run_path(str(ROOT / "tests/test_order_service.py"))
    old_inventory, inventory_source = historical("f8fd7b5^", "app/services/orders/inventory_service.py", "app.services.orders")
    old_order, order_source = historical("61612af^", "app/services/orders/order_service.py", "app.services.orders")
    old_report, report_source = historical("61612af^", "app/services/reports/report_service.py", "app.services.reports")
    results = {"classification": "controlled synthetic service experiment",
               "started_at": datetime.now(timezone.utc).isoformat(),
               "head": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT).decode().strip(),
               "environment": "isolated PostgreSQL; current schema and shared current dependencies",
               "postgres_version": db_session.execute(text("SELECT version()")).scalar(),
               "historical_sources": [inventory_source, order_source, report_source],
               "limitations": ["Not a full historical runtime", "Not production customer data",
                               "No human timing, provider timing, concurrency, or business-impact measurement",
                               "Repeated deterministic cases are not independent customer samples"],
               "expiry": [], "pos": []}
    # Each side gets an independently seeded, equivalent stock snapshot.
    for case in range(30):
        case_result = {"case": case, "requested_units": 1 + case % 4, "sides": {}}
        for side, cls in (("before", old_inventory.InventoryService), ("after", InventoryService)):
            variant, lots = inventory_helpers["_make_product_lots"](db_session)
            if case >= 20:
                expired = next(lot for label, lot in lots if label == "expired")
                db_session.query(TonKhoSanPham).filter_by(lohang_sanpham_id=expired.lohang_id).one().so_luong_hien_tai = 0
                db_session.flush()
            allocations = cls().allocate_variant(db_session, variant.bienthe_id, case_result["requested_units"], "Insufficient stock")
            labels = {lot.lohang_id: label for label, lot in lots}
            case_result["sides"][side] = [{"label": labels[a.batch_id], "quantity": a.quantity} for a in allocations]
        results["expiry"].append(case_result)
    for case in range(30):
        case_result = {"case": case, "quantity": 1 + case % 4, "unit_price_vnd": 50000 * (1 + case % 3), "sides": {}}
        for side, order_cls, report_cls in (("before", old_order.OrderService, old_report.ReportService),
                                           ("after", OrderService, ReportService)):
            user = order_helpers["_make_user"](db_session, role_manager, f"bench-{case}-{side}")
            variant, _ = order_helpers["_make_variant_with_stock"](db_session, f"bench-{case}-{side}", gia=Decimal(case_result["unit_price_vnd"]))
            payload = order_helpers["_CreateOrderPayload"]([order_helpers["_OrderItem"](bienthe_id=variant.bienthe_id, so_luong=case_result["quantity"])])
            order = order_cls().create_order(db_session, payload, "pos", user)
            order_id = order["donhang_id"]
            paid = db_session.query(ThanhToan).filter_by(donhang_id=order_id, trang_thai="thanh_cong").all()
            report_day = datetime(2026, 1, 1) + timedelta(days=case * 2 + (side == "after"))
            db_session.get(DonHang, order_id).ngay_tao = report_day
            db_session.flush()
            sales = report_cls().get_sales_report(db_session, report_day.date(), report_day.date())
            case_result["sides"][side] = {"status": order["trang_thai"], "successful_payments": len(paid),
                                         "payable_vnd": str(order["tien_thanh_toan"]),
                                         "reported_total_vnd": str(sum(row["tong_doanh_thu"] for row in sales))}
        results["pos"].append(case_result)
    assert all(any(a["label"] == "expired" for a in row["sides"]["before"]) for row in results["expiry"][:20])
    assert all(all(a["label"] != "expired" for a in row["sides"]["after"]) for row in results["expiry"])
    assert all(row["sides"]["before"] == row["sides"]["after"] for row in results["expiry"][20:])
    assert all(row["sides"]["before"]["status"] == "hoan_thanh" and row["sides"]["after"]["status"] == "dang_xu_ly" for row in results["pos"])
    assert all(not row["sides"][side]["successful_payments"] for row in results["pos"] for side in ("before", "after"))
    assert all(Decimal(row["sides"]["before"]["reported_total_vnd"]) == Decimal(row["sides"]["before"]["payable_vnd"]) and Decimal(row["sides"]["after"]["reported_total_vnd"]) == 0 for row in results["pos"])
    results["finished_at"] = datetime.now(timezone.utc).isoformat()
    output = os.getenv("OPERATIONS_BENCHMARK_OUTPUT")
    if output:
        Path(output).write_text(json.dumps(results, indent=2), encoding="utf-8")
