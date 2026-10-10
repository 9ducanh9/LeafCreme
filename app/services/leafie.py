"""Read-only sales assistant using a server-owned public catalog."""

import json
import logging
import os
import re
import unicodedata
from typing import Literal
from uuid import UUID

import openai
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import BienTheSanPham
from app.services.agent.redaction import redact
from app.services import leafie_observability as telemetry
from app.services.errors import DomainError
from app.services.gift_boxes import GiftBoxService
from app.services.leafie_prompt import PROMPT_VERSION, SYSTEM_PROMPT
from app.services.products import ProductService
from app.services.products.availability import sellable_stock

logger = logging.getLogger(__name__)
_CREDENTIAL = re.compile(r"\b(?:sk-[A-Za-z0-9_-]{8,}|Bearer\s+[A-Za-z0-9._-]{8,})")


class HistoryTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class LeafieRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="ignore")
    message: str = Field(min_length=1, max_length=2000)
    conversationHistory: list[HistoryTurn] = Field(default_factory=list, max_length=10)
    conversation_id: UUID | None = None


class ModelReply(BaseModel):
    model_config = ConfigDict(extra="forbid")
    output: str = Field(min_length=1, max_length=1800)
    product_ids: list[int] = Field(default_factory=list, max_length=3)
    gift_box_ids: list[int] = Field(default_factory=list, max_length=3)
    suggestions: list[str] = Field(default_factory=list, max_length=3)


def clean_text(text: str) -> str:
    return _CREDENTIAL.sub("[đã ẩn]", redact(text))


def policy_reply(message: str) -> dict | None:
    normalized = "".join(c for c in unicodedata.normalize("NFD", message.lower()) if not unicodedata.combining(c)).replace("đ", "d")
    if any(term in normalized for term in (
        "api key", "api_key", "mat khau", "system prompt", "prompt he thong", "doanh thu",
        "gia von", "noi bo", "danh sach khach", "thong tin khach hang", "nha cung cap",
        "database", "connection string", "secret key",
    )):
        return {"output": "Thông tin khách hàng và dữ liệu nội bộ của cửa hàng không được cung cấp trong chat. Mình có thể giúp tìm bánh hoặc hộp quà trong menu.", "suggestions": ["Gợi ý bánh đang còn hàng"], "products": []}
    # A new purchase is public sales advice, not a lookup of an existing order.
    # Existing-order/payment signals take priority, including in mixed requests.
    existing_order = any(term in normalized for term in (
        "don cua", "don hang cua", "da chuyen khoan", "da chuyen tien", "da thanh toan", "nhan duoc tien",
        "tra cuu don", "tra cuu thanh toan", "kiem tra don", "trang thai don", "tinh trang don", "ma don",
        "da dat", "vua dat", "hoan tien", "huy don", "giao tre", "chua nhan",
    ))
    new_purchase = any(term in normalized for term in (
        "dat don hang", "tao don hang", "dat hang", "mua banh", "dat banh",
    ))
    if existing_order or ("don hang" in normalized and not new_purchase):
        return {"output": "Trong chat chưa kiểm tra được đơn đã đặt hoặc xác nhận tiền đã nhận. Bạn mở mục Đơn hàng của tôi để xem đơn; nếu cần kiểm tra thanh toán, hãy mở trang thanh toán của đơn hoặc liên hệ cửa hàng qua mục Liên hệ.", "suggestions": [], "products": []}
    return None


def build_catalog(db: Session) -> dict:
    products = ProductService().list_products(db, dang_hoat_dong=True, limit=101)
    product_ids = [p.sanpham_id for p in products[:100]]
    variants = db.scalars(select(BienTheSanPham).where(
        BienTheSanPham.sanpham_id.in_(product_ids), BienTheSanPham.dang_hoat_dong.is_(True),
    ).order_by(BienTheSanPham.bienthe_id)).all()
    stock = sellable_stock(db, [v.bienthe_id for v in variants])
    by_product: dict[int, list] = {}
    for v in variants:
        by_product.setdefault(v.sanpham_id, []).append({
            "id": v.bienthe_id, "size": v.kich_thuoc, "price": float(v.gia_bienthe),
            "available": stock.get(v.bienthe_id, (0, None))[0] > 0,
        })
    catalog = []
    for p in products[:100]:
        sizes = by_product.get(p.sanpham_id, [])
        catalog.append({
            "id": p.sanpham_id, "kind": "product", "name": clean_text(p.ten),
            "description": clean_text((p.mo_ta or "")[:800]), "category": p.danh_muc,
            "price": min((s["price"] for s in sizes), default=float(p.gia_co_ban)),
            "variants": sizes, "available": any(s["available"] for s in sizes) if sizes else None,
            "href": f"/products/{p.sanpham_id}",
        })
    gifts = GiftBoxService().list_gift_boxes(db, default_active_only=True, limit=31)
    return {"products": catalog, "gift_boxes": [{
        "id": g["hop_qua_id"], "kind": "gift_box", "name": clean_text(g["ten_hop_qua"]),
        "description": clean_text((g["mo_ta"] or "")[:800]), "price": float(g["gia_ban"]),
        "variants": [], "available": None, "href": f"/gift-boxes/{g['hop_qua_id']}",
    } for g in gifts[:30]], "partial": len(products) > 100 or len(gifts) > 30}


async def generate_reply(payload: LeafieRequest, catalog: dict) -> dict:
    api_key = os.getenv("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        raise DomainError(status_code=503, detail="Leafie chưa sẵn sàng. Bạn vui lòng thử lại sau hoặc liên hệ cửa hàng.")
    history = [t.model_dump() for t in payload.conversationHistory]
    # Older clients included the current question in their history.
    if history and history[-1] == {"role": "user", "content": payload.message}:
        history.pop()
    messages = [{"role": "system", "content": SYSTEM_PROMPT + "\nCATALOG_SERVER:\n" + json.dumps(catalog, ensure_ascii=False)}]
    # JSON mode needs prior assistant turns in the same wire format, not UI text.
    for turn in history:
        content = clean_text(turn["content"])
        if turn["role"] == "assistant":
            content = json.dumps({
                "output": content, "product_ids": [], "gift_box_ids": [], "suggestions": [],
            }, ensure_ascii=False)
        messages.append({"role": turn["role"], "content": content})
    messages.append({"role": "user", "content": clean_text(payload.message)})
    try:
        async with openai.AsyncOpenAI(
            api_key=api_key, base_url=os.getenv("DEEPSEEK_BASE_URL") or "https://api.deepseek.com",
            timeout=30.0, max_retries=0,
        ) as client:
            model = os.getenv("LEAFIE_MODEL") or "deepseek-chat"
            with telemetry.observation("leafie-model-call", kind="generation", model=model,
                                       input={"system_prompt": SYSTEM_PROMPT, "catalog": catalog},
                                       metadata={"prompt_version": PROMPT_VERSION,
                                                 "customer_text_capture": False}) as generation:
                response = await client.chat.completions.create(
                    model=model, messages=messages,
                    temperature=0.3, max_tokens=1000, response_format={"type": "json_object"},
                )
                usage = getattr(response, "usage", None)
                telemetry.tracing.safe_update(generation, output={
                    "finish_reason": response.choices[0].finish_reason if response.choices else None,
                }, usage_details={"input": usage.prompt_tokens, "output": usage.completion_tokens}
                   if usage is not None else {})
        if not response.choices or response.choices[0].finish_reason != "stop":
            raise ValueError("Incomplete reply")
        reply = ModelReply.model_validate_json(response.choices[0].message.content or "")
        if not reply.output.strip():
            raise ValueError("Empty reply")
        selected = []
        for group, ids in (("products", reply.product_ids), ("gift_boxes", reply.gift_box_ids)):
            lookup = {p["id"]: p for p in catalog[group]}
            for item_id in dict.fromkeys(ids):
                if item_id not in lookup:
                    raise ValueError("Unknown catalog reference")
                selected.append(lookup[item_id])
        return {
            "output": clean_text(reply.output), "products": selected[:3],
            "suggestions": [clean_text(s) for s in reply.suggestions if 0 < len(s.strip()) <= 100],
            "prompt_version": PROMPT_VERSION,
        }
    except (openai.AuthenticationError, openai.PermissionDeniedError) as exc:
        logger.warning("Leafie provider configuration failure: %s", type(exc).__name__)
        raise DomainError(status_code=503, detail="Leafie chưa sẵn sàng. Bạn vui lòng thử lại sau hoặc liên hệ cửa hàng.") from exc
    except openai.APITimeoutError as exc:
        raise DomainError(status_code=504, detail="Leafie trả lời hơi lâu. Bạn thử gửi lại nhé.") from exc
    except (openai.OpenAIError, ValidationError, ValueError, TypeError, IndexError) as exc:
        logger.warning("Leafie provider failure: %s", type(exc).__name__)
        raise DomainError(status_code=502, detail="Leafie đang mất kết nối. Bạn thử lại sau một chút nhé.") from exc
