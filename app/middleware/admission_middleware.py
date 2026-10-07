"""Bound HTTP work before requests can consume DB and sync worker capacity."""
import anyio
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send


class AdmissionMiddleware:
    def __init__(self, app: ASGIApp, max_inflight: int = 20,
                 max_waiting: int = 200, wait_seconds: float = 2.0) -> None:
        if not 1 <= max_inflight <= 20 or not 1 <= max_waiting <= 1000 or not 0 < wait_seconds <= 5:
            raise ValueError("Invalid HTTP admission limits")
        self.app = app
        # Reserve capacity below the current 30 DB connections / 40 sync workers.
        self.limiter = anyio.CapacityLimiter(max_inflight)
        self.max_waiting = max_waiting
        self.wait_seconds = wait_seconds
        self.waiting = 0

    async def _busy(self, scope: Scope, receive: Receive, send: Send) -> None:
        response = JSONResponse({"detail": "Server busy; retry shortly."},
                                status_code=503, headers={"Retry-After": "1"})
        await response(scope, receive, send)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope.get("path") == "/health":
            await self.app(scope, receive, send)
            return
        if self.waiting >= self.max_waiting:
            await self._busy(scope, receive, send)
            return
        acquired = False
        self.waiting += 1
        try:
            try:
                with anyio.fail_after(self.wait_seconds):
                    await self.limiter.acquire()
                    acquired = True
            except TimeoutError:
                await self._busy(scope, receive, send)
                return
            finally:
                self.waiting -= 1
            # Hold through response completion AND dependency/session teardown.
            await self.app(scope, receive, send)
        finally:
            if acquired:
                self.limiter.release()
