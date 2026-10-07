import asyncio

import pytest
from starlette.responses import JSONResponse

from app.middleware.admission_middleware import AdmissionMiddleware


async def invoke(app, path="/work"):
    messages = []

    async def receive():
        return {"type": "http.request", "body": b""}

    async def send(message):
        messages.append(message)

    await app({"type": "http", "path": path, "method": "GET", "headers": [],
               "http_version": "1.1"}, receive, send)
    return messages


@pytest.mark.asyncio
async def test_bounded_queue_timeout_and_liveness_bypass():
    entered = asyncio.Event()
    finish = asyncio.Event()
    calls = []

    async def endpoint(scope, receive, send):
        calls.append(scope["path"])
        if scope["path"] != "/health":
            entered.set()
            await finish.wait()
        await JSONResponse({"ok": True})(scope, receive, send)

    middleware = AdmissionMiddleware(endpoint, max_inflight=1, max_waiting=1, wait_seconds=0.05)
    first = asyncio.create_task(invoke(middleware))
    await asyncio.wait_for(entered.wait(), 1)
    queued = asyncio.create_task(invoke(middleware))
    async with asyncio.timeout(1):
        while middleware.waiting != 1:
            await asyncio.sleep(0)
    rejected = await invoke(middleware)
    assert rejected[0]["status"] == 503
    assert (b"retry-after", b"1") in rejected[0]["headers"]
    assert (await invoke(middleware, "/health"))[0]["status"] == 200
    assert (await queued)[0]["status"] == 503
    assert calls == ["/work", "/health"]
    finish.set()
    assert (await first)[0]["status"] == 200
    assert middleware.limiter.borrowed_tokens == 0
    assert middleware.waiting == 0
    assert (await invoke(middleware))[0]["status"] == 200


@pytest.mark.asyncio
async def test_slots_release_after_endpoint_failure_and_cancellation():
    entered = asyncio.Event()

    async def endpoint(scope, receive, send):
        entered.set()
        if scope["path"] == "/error":
            raise RuntimeError("Synthetic endpoint failure")
        await asyncio.Event().wait()

    middleware = AdmissionMiddleware(endpoint, max_inflight=1)
    with pytest.raises(RuntimeError):
        await invoke(middleware, "/error")
    assert middleware.limiter.borrowed_tokens == 0
    task = asyncio.create_task(invoke(middleware))
    while not middleware.limiter.borrowed_tokens:
        await asyncio.sleep(0)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    assert middleware.limiter.borrowed_tokens == 0
    assert middleware.waiting == 0


@pytest.mark.asyncio
async def test_slot_is_held_after_body_until_dependency_teardown():
    body_sent = asyncio.Event()
    teardown = asyncio.Event()
    calls = []

    async def endpoint(scope, receive, send):
        calls.append(scope["path"])
        await JSONResponse({"ok": True})(scope, receive, send)
        if scope["path"] == "/first":
            body_sent.set()
            await teardown.wait()

    middleware = AdmissionMiddleware(endpoint, max_inflight=1)
    first = asyncio.create_task(invoke(middleware, "/first"))
    await asyncio.wait_for(body_sent.wait(), 1)
    second = asyncio.create_task(invoke(middleware, "/second"))
    async with asyncio.timeout(1):
        while middleware.waiting != 1:
            await asyncio.sleep(0)
    assert calls == ["/first"]
    teardown.set()
    assert (await first)[0]["status"] == 200
    assert (await second)[0]["status"] == 200
    assert calls == ["/first", "/second"]
    assert middleware.limiter.borrowed_tokens == 0
