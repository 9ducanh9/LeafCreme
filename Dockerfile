# syntax=docker/dockerfile:1

# Backend API image only. frontend/ is a separate Vite/React app with its
# own build+deploy story — not covered by this Dockerfile (see restructure
# plan for scope).

# ---- Stage 1: build dependencies -------------------------------------------
FROM python:3.12-slim AS builder

WORKDIR /build

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ---- Stage 2: runtime -------------------------------------------------------
FROM python:3.12-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 1000 appuser

WORKDIR /app

COPY --from=builder /root/.local /home/appuser/.local
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./alembic.ini
COPY scripts/apply_approved_catalog.py ./scripts/apply_approved_catalog.py
COPY uploads/product ./uploads/product
COPY uploads/payment ./uploads/payment

# uploads/ is served via StaticFiles at /uploads and receives new files at
# runtime (product images and avatars) and must remain writable.
RUN mkdir -p uploads && chown -R appuser:appuser /app
USER appuser

ENV PATH=/home/appuser/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Migrations run as a separate deploy step (see docker-compose.yml command /
# a future fly.toml release_command) — NOT at container start, so a bad
# migration fails the deploy instead of crash-looping the running app.
# The app owns an APScheduler instance. Keep a single worker unless scheduled
# work is moved into a separate worker service, otherwise every worker runs it.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
