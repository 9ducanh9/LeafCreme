"""Customer sales chat. Only public catalog reads are available."""

import asyncio
from collections import OrderedDict, deque
from time import monotonic

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.db import get_db
from app.services.errors import DomainError
from app.services.leafie import LeafieRequest, build_catalog, generate_reply, policy_reply

router = APIRouter(prefix="/leafie", tags=["leafie"])
# Bounded per-process limits. No client-supplied session/forwarded IP is trusted.
_requests: OrderedDict[str, deque] = OrderedDict()
_slots = asyncio.Semaphore(4)


def check_rate_limit(client_ip: str) -> None:
    now = monotonic()
    bucket = _requests.pop(client_ip, deque())
    while bucket and bucket[0] <= now - 60:
        bucket.popleft()
    _requests[client_ip] = bucket
    if len(_requests) > 2048:
        _requests.popitem(last=False)
    if len(bucket) >= 10:
        raise HTTPException(status_code=429, detail="Bạn gửi hơi nhanh. Đợi một phút rồi thử lại nhé.", headers={"Retry-After": "60"})
    bucket.append(now)


@router.post("/ask")
async def ask_leafie(payload: LeafieRequest, request: Request, db: Session = Depends(get_db)):
    check_rate_limit(request.client.host if request.client else "unknown")
    guarded = policy_reply(payload.message)
    if guarded is not None:
        return guarded
    if _slots.locked():
        raise HTTPException(status_code=429, detail="Leafie đang bận. Bạn thử lại sau một chút nhé.")
    async with _slots:
        try:
            catalog = await run_in_threadpool(build_catalog, db)
            return await generate_reply(payload, catalog)
        except DomainError as exc:
            raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
