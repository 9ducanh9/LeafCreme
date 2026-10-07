"""Disposable image launcher for signal-triggered thread stack diagnostics."""
import faulthandler
import os
from pathlib import Path
import signal
import sys

import uvicorn

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


if __name__ == "__main__":
    from verify_http_resilience import IMAGE_DB_URL

    if os.getenv("DATABASE_URL") != IMAGE_DB_URL or os.getenv("RUN_HTTP_RESILIENCE") != "1":
        raise SystemExit("Debug launcher requires the dedicated disposable image DB")
    faulthandler.register(signal.SIGUSR1, all_threads=True)
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000)
