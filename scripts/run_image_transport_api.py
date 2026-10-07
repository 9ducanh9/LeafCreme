"""Disposable httptools launcher with socket-close diagnostics, never production."""
import json
import os
from pathlib import Path
import sys
import time

import uvicorn
from uvicorn.protocols.http.httptools_impl import HttpToolsProtocol

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class DiagnosticProtocol(HttpToolsProtocol):
    def timeout_keep_alive_handler(self):
        peer = self.transport.get_extra_info("peername")
        print("SOCKET_DIAGNOSTIC " + json.dumps({
            "event": "keepalive_timeout", "peer_port": peer[1] if peer else None,
            "timestamp": time.time(), "already_closing": self.transport.is_closing(),
        }), flush=True)
        super().timeout_keep_alive_handler()


if __name__ == "__main__":
    from verify_http_resilience import IMAGE_DB_URL

    if os.getenv("DATABASE_URL") != IMAGE_DB_URL or os.getenv("RUN_HTTP_RESILIENCE") != "1":
        raise SystemExit("Transport diagnostics require the dedicated disposable image DB")
    from app.main import app

    async def diagnostic_app(scope, receive, send):
        async def diagnostic_send(message):
            if message["type"] == "http.response.start":
                peer = scope.get("client")
                message = dict(message)
                message["headers"] = list(message["headers"]) + [
                    (b"x-test-peer-port", str(peer[1] if peer else 0).encode("ascii")),
                ]
            await send(message)

        await app(scope, receive, diagnostic_send)

    uvicorn.run(diagnostic_app, host="0.0.0.0", port=8000, http=DiagnosticProtocol)
