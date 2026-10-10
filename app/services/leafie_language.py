"""Bounded Vietnamese address rules, derived only from explicit customer cues."""

import re
from dataclasses import dataclass
from typing import Literal


_QUOTED = r'"[^"\n]*"|“[^”\n]*”|‘[^’\n]*’|\x27[^\x27\n]*\x27|`[^`\n]*`'
_SELF_ADDRESS = re.compile(
    r"^\s*(?:(?:dạ|vâng|ừ|ok|vậy|(?:xin )?chào(?: leafie)?|leafie ơi|bạn ơi)\s*[,!]?[ ]*)?"
    r"(?P<address>anh|chị)\s+"
    r"(?:muốn|cần|đang|thích|tìm|chọn|mua|đặt|xem|hỏi|có|không|chưa|đã|sẽ|vừa|nói)\b",
    re.IGNORECASE,
)
_PREFERENCE = re.compile(
    r"\b(?:(?P<negative>đừng|không)\s+)?(?:hãy\s+)?gọi\s+"
    r"(?:mình|tôi|em|tớ|tui)\s+(?:là\s+)?(?P<address>anh|chị|bạn)\b",
    re.IGNORECASE,
)
# Only repair recognizable assistant subjects, not possessives such as
# "chị gái mình" or "đơn của mình", and never edit quotations/catalog names.
_ASSISTANT_SUBJECT = re.compile(
    r"\b(?P<pronoun>mình)(?=\s+(?:hỗ trợ|tư vấn|gợi ý|giúp|xin|có thể|có|không|"
    r"chưa|đã|sẽ|vừa|đang|chỉ|vẫn|hiểu|biết|kiểm tra|xác nhận|tìm|chọn|còn|"
    r"thấy|nghĩ|đề xuất|nhận|sẵn|rất|cảm ơn|giới thiệu)\b)",
    re.IGNORECASE,
)
_STORE_PRONOUN = re.compile(r"\bbên\s+(?P<pronoun>mình|em)\b", re.IGNORECASE)
_CUSTOMER_SUBJECT = re.compile(
    r"\bbạn(?=\s+(?:muốn|cần|có thể|có muốn|thích|chọn|xem|mở|hãy|cứ|"
    r"nhé|ạ|đang|đã|sẽ|chưa|không|đặt|mua)\b)", re.IGNORECASE,
)
_CUSTOMER_GREETING = re.compile(r"\b(?P<greeting>chào|dạ)[ ,]+(?:bạn|anh|chị)\b(?!\s+(?:gái|trai|ấy)\b)", re.IGNORECASE)


@dataclass(frozen=True)
class AddressStyle:
    customer: Literal["anh", "chị"] | None = None

    @property
    def assistant(self) -> str:
        return "em" if self.customer else "mình"

    @property
    def instruction(self) -> str:
        if self.customer:
            return (
                f"XƯNG HÔ CHO LƯỢT NÀY: Khách đã tự xưng '{self.customer}'. "
                f"Trong output, bạn xưng 'em', gọi khách '{self.customer}'; không xưng 'mình'. "
                "Không đổi lời khách trong trích dẫn hoặc lời khách trên suggestion chips."
            )
        return (
            "XƯNG HÔ CHO LƯỢT NÀY: Chưa có tín hiệu khách tự xưng anh/chị. "
            "Trong output xưng 'mình' khi cần, không tự gọi khách anh/chị do người nhận bánh. "
            "Nếu khách đã yêu cầu gọi tên thì vẫn tôn trọng tên đó. "
            "Người nhận 'chị gái' vẫn là 'chị gái bạn', không phải người đang chat."
        )


def resolve_address(message: str, history: list[dict]) -> AddressStyle:
    style = AddressStyle()
    for text in [turn["content"] for turn in history if turn["role"] == "user"] + [message]:
        unquoted = re.sub(_QUOTED, "", text)
        cues = [(match.start(), match.group("address").lower()) for match in _SELF_ADDRESS.finditer(unquoted)]
        cues += [
            (match.start(), None if match.group("negative") or match.group("address").lower() == "bạn"
             else match.group("address").lower())
            for match in _PREFERENCE.finditer(unquoted)
        ]
        for _, address in sorted(cues):
            style = AddressStyle(customer="anh" if address == "anh" else "chị" if address == "chị" else None)
    return style


def normalize_address(text: str, style: AddressStyle, product_names: list[str]) -> str:
    if not style.customer:
        return text
    names = [re.escape(name) for name in sorted(set(product_names), key=len, reverse=True) if name]
    protected = re.compile(f"({_QUOTED}" + ("|" + "|".join(names) if names else "") + ")", re.IGNORECASE)

    def match_case(value: str, original: str) -> str:
        return value.capitalize() if original[:1].isupper() else value

    parts = protected.split(text)
    for index in range(0, len(parts), 2):
        def repair_self(match: re.Match) -> str:
            prefix = parts[index][:match.start()]
            if re.search(r"\b(?:gái|trai|chị|anh|em|mẹ|bố|ba|con|bạn|nhà|của|đơn|nói|nói rằng)\s+$", prefix, re.IGNORECASE):
                return match.group()
            return match_case(style.assistant, match.group())

        part = _ASSISTANT_SUBJECT.sub(repair_self, parts[index])
        part = _STORE_PRONOUN.sub(lambda match: re.sub(
            r"\b(?:mình|em)\b", style.assistant, match.group(), flags=re.IGNORECASE,
        ), part)
        if style.customer:
            part = _CUSTOMER_SUBJECT.sub(lambda match: match_case(style.customer, match.group()), part)
            part = _CUSTOMER_GREETING.sub(lambda match: f"{match.group('greeting')} {style.customer}", part)
        parts[index] = part
    return "".join(parts)
