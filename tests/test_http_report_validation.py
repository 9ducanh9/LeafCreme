import json

import pytest

from scripts.verify_http_resilience import verify_final_report


@pytest.fixture
def report():
    catalog = {"path": "/products?limit=60", "status": 200, "body": json.dumps([{}] * 60)}
    availability = {"path": "/products/1/availability", "status": 200,
                    "body": json.dumps([{"so_luong_con": 10}] * 3)}
    return {
        "load": [{"workers": workers, "requests": [catalog.copy(), availability.copy()] * 100}
                 for workers in (1, 10, 50)],
        "outage": [{"status": 503}, {"status": 200}],
        "recovery": [{"status": 200}, {"status": 200}],
        "checkout_replays": [{"status": 201, "body": json.dumps({"order": {"donhang_id": 1}})} for _ in range(20)],
        "checkout_competition": [{"status": 201}] * 5 + [{"status": 400}] * 15,
        "post_checkout_availability": {"status": 200, "body": json.dumps([
            {"so_luong_con": 8}, {"so_luong_con": 0}, {"so_luong_con": 10},
        ])},
    }


def test_complete_synthetic_report_is_accepted(report):
    verify_final_report(report)


@pytest.mark.parametrize("corruption", [None, "missing", "missing_case", "bypass", "leak", "unscoped_list"])
def test_authorization_report_validation(report, corruption):
    expected = {"anonymous_orders": 401, "invalid_token": 401, "other_customer_order": 403,
                "other_customer_payments": 403, "customer_user_directory": 403,
                "customer_admin_variants": 403, "customer_admin_agent": 403, "owner_order": 200}
    report["authorization_required"] = True
    report["authorization"] = {"checks": [
        {"case": name, "status": status, "denial_body_only_detail": status != 200}
        for name, status in expected.items()], "own_order_list_status": 200, "own_order_list_scoped": True}
    data = report["authorization"]
    if corruption == "missing":
        del report["authorization"]
    elif corruption == "missing_case":
        data["checks"].pop()
    elif corruption == "bypass":
        data["checks"][0]["status"] = 200
    elif corruption == "leak":
        data["checks"][0]["denial_body_only_detail"] = False
    elif corruption == "unscoped_list":
        data["own_order_list_scoped"] = False
    if corruption is None:
        verify_final_report(report)
    else:
        with pytest.raises(AssertionError):
            verify_final_report(report)


@pytest.mark.parametrize("corruption", [None, "missing", "missing_wave", "duplicate_order", "missing_replay", "wrong_stock"])
def test_fresh_order_report_validation(report, corruption):
    waves = [{"requests": [{"status": 201, "body": json.dumps({"order": {"donhang_id": wave * 10 + i + 1}})}
                           for i in range(10)] + [{"status": 400}] * 10,
              "distinct_orders": 10, "successful_replays": 10, "remaining_stock": 0} for wave in range(2)]
    report["fresh_orders_required"] = True
    report["fresh_orders"] = {"waves": waves, "restock_status": 201, "total_distinct_orders": 20,
                              "synthetic_customers": 20, "synthetic_staff": 1}
    if corruption == "missing":
        del report["fresh_orders"]
    elif corruption == "missing_wave":
        waves.pop()
    elif corruption == "duplicate_order":
        waves[1]["requests"][0]["body"] = waves[0]["requests"][0]["body"]
    elif corruption == "missing_replay":
        waves[0]["successful_replays"] = 9
    elif corruption == "wrong_stock":
        waves[0]["remaining_stock"] = 1
    if corruption is None:
        verify_final_report(report)
    else:
        with pytest.raises(AssertionError):
            verify_final_report(report)


@pytest.mark.parametrize("corruption", [None, "wrong_password_accepted", "refresh_failed", "different_user"])
def test_restore_authentication_evidence_validation(report, corruption):
    outcome = {"invalid_password_status": 401, "login_status": 200, "me_status": 200,
               "refresh_status": 200, "refreshed_me_status": 200, "synthetic_user_id": 1}
    report["backup_auth_required"] = True
    report["backup_restore"] = {"authentication": {"source": outcome.copy(), "restored": outcome.copy()}}
    restored = report["backup_restore"]["authentication"]["restored"]
    if corruption == "wrong_password_accepted":
        restored["invalid_password_status"] = 200
    elif corruption == "refresh_failed":
        restored["refresh_status"] = 401
    elif corruption == "different_user":
        restored["synthetic_user_id"] = 2
    if corruption is None:
        verify_final_report(report)
    else:
        with pytest.raises(AssertionError):
            verify_final_report(report)


@pytest.mark.parametrize("corruption", [None, "missing", "no_rejection", "bad_retry", "dead_health", "bad_recovery"])
def test_admission_evidence_validation(report, corruption):
    report["admission_required"] = True
    report["admission"] = {
        "requests": [{"status": 200, "valid": True}] * 20
                    + [{"status": 503, "valid": True, "retry_after": "1"}] * 40,
        "liveness_while_locked": {"status": 200},
        "readiness_after_unlock": {"status": 200},
        "catalog_after_unlock": {"status": 200, "body": json.dumps([{}] * 60)},
    }
    admission = report["admission"]
    if corruption == "missing":
        del report["admission"]
    elif corruption == "no_rejection":
        admission["requests"] = [{"status": 200, "valid": True}] * 60
    elif corruption == "bad_retry":
        admission["requests"][-1] = {"status": 503, "valid": True, "retry_after": None}
    elif corruption == "dead_health":
        admission["liveness_while_locked"]["status"] = 503
    elif corruption == "bad_recovery":
        admission["readiness_after_unlock"]["status"] = 503
    if corruption is None:
        verify_final_report(report)
    else:
        with pytest.raises(AssertionError):
            verify_final_report(report)


@pytest.fixture
def browser_report(report):
    report["browser_required"] = True
    report["browser"] = {
        "exit_code": 0, "checkout_records": 4, "confirmed_receipts": 1,
        "availability": {"status": 200, "body": json.dumps([
            {"so_luong_con": value} for value in (8, 8, 8)])},
        "journey_availability": {"status": 200, "body": json.dumps([
            {"so_luong_con": value} for value in (9, 10, 10)])},
    }
    return report


def test_complete_browser_report_is_accepted(browser_report):
    verify_final_report(browser_report)


@pytest.mark.parametrize("corruption", [
    "missing_browser", "failed_browser", "missing_order", "duplicate_receipt",
    "wrong_stock", "failed_stock_read", "wrong_journey_stock",
])
def test_corrupted_browser_evidence_is_rejected(browser_report, corruption):
    browser = browser_report["browser"]
    if corruption == "missing_browser":
        del browser_report["browser"]
    elif corruption == "failed_browser":
        browser["exit_code"] = 1
    elif corruption == "missing_order":
        browser["checkout_records"] = 3
    elif corruption == "duplicate_receipt":
        browser["confirmed_receipts"] = 2
    elif corruption == "wrong_stock":
        browser["availability"]["body"] = json.dumps([{"so_luong_con": 10}] * 3)
    elif corruption == "failed_stock_read":
        browser["availability"]["status"] = 503
    else:
        browser["journey_availability"]["body"] = json.dumps([{"so_luong_con": 10}] * 3)
    with pytest.raises(AssertionError):
        verify_final_report(browser_report)


@pytest.mark.parametrize("corruption", [
    "missing_tier", "missing_read", "failed_recovery", "missing_replay",
    "duplicate_order", "missing_competitor", "wrong_stock", "failed_stock_read", "empty_soak",
])
def test_incomplete_or_corrupted_report_is_rejected(report, corruption):
    if corruption == "missing_tier":
        report["load"].pop()
    elif corruption == "missing_read":
        report["load"][0]["requests"].pop()
    elif corruption == "failed_recovery":
        report["recovery"][0]["status"] = 503
    elif corruption == "missing_replay":
        report["checkout_replays"].pop()
    elif corruption == "duplicate_order":
        report["checkout_replays"][0]["body"] = json.dumps({"order": {"donhang_id": 2}})
    elif corruption == "missing_competitor":
        report["checkout_competition"].pop()
    elif corruption == "wrong_stock":
        report["post_checkout_availability"]["body"] = json.dumps([{"so_luong_con": 10}] * 3)
    elif corruption == "failed_stock_read":
        report["post_checkout_availability"]["status"] = 500
    else:
        report["soak"] = {"requests": []}
    with pytest.raises(AssertionError):
        verify_final_report(report)
