"""Address consistency must not depend on a model following style instructions."""

import pytest

from app.services.leafie_language import AddressStyle, normalize_address, resolve_address


@pytest.mark.parametrize("message,expected", [
    ("Chị muốn bánh kem chocolate", "chị"),
    ("Anh cần bánh sinh nhật", "anh"),
    ("Dạ, chị đang tìm bánh", "chị"),
    ("Chào Leafie, anh muốn mua bánh", "anh"),
    ("Bạn ơi, chị cần tư vấn", "chị"),
    ("Gọi tôi là anh nhé", "anh"),
    ("Hãy gọi mình là chị", "chị"),
    ("Mua cho chị gái", None),
    ("Chị gái mình thích bánh kem", None),
    ("Chị ấy thích chocolate", None),
    ("Chị Mai muốn bánh kem", None),
    ("Mua cho anh trai, anh muốn vị chocolate", None),
    ('Chị gái nói "chị muốn bánh kem"', None),
    ("Tôi muốn mua bánh", None),
    ("Em muốn mua bánh", None),
])
def test_only_explicit_customer_address_selects_a_pair(message, expected):
    assert resolve_address(message, []).customer == expected


def test_followups_retain_customer_address_not_the_assistants_mistake():
    history = [
        {"role": "user", "content": "Chị muốn bánh kem chocolate"},
        {"role": "assistant", "content": "Anh muốn size nào?"},
        {"role": "user", "content": "Mua cho em gái"},
    ]
    assert resolve_address("Dưới 300k nhé", history) == AddressStyle(customer="chị")


@pytest.mark.parametrize("correction,expected", [
    ("Gọi mình là bạn thôi", None),
    ("Đừng gọi tôi là chị", None),
    ("Không gọi mình chị nhé", None),
    ("Gọi tôi là anh", "anh"),
    ("Đừng gọi mình là chị; gọi mình là anh", "anh"),
])
def test_new_address_preferences_override_history(correction, expected):
    history = [{"role": "user", "content": "Chị muốn bánh kem"}]
    assert resolve_address(correction, history).customer == expected


@pytest.mark.parametrize("output,expected", [
    ("Chào chị, mình hỗ trợ chị đặt bánh nhé.", "Chào chị, em hỗ trợ chị đặt bánh nhé."),
    ("Mình có thể giúp bạn chọn bánh.", "Em có thể giúp chị chọn bánh."),
    ("Bên mình còn mousse. Bạn muốn xem không?", "Bên em còn mousse. Chị muốn xem không?"),
    ("Chị muốn mình gợi ý mẫu khác không?", "Chị muốn em gợi ý mẫu khác không?"),
    ("Thành thật xin lỗi chị, mình đã hiểu rồi: dưới 300.000đ.", "Thành thật xin lỗi chị, em đã hiểu rồi: dưới 300.000đ."),
    ('Chị nói "mình có ngân sách 300k". Mình gợi ý mousse.', 'Chị nói "mình có ngân sách 300k". Em gợi ý mousse.'),
    ("Chị gái mình có thích dâu không?", "Chị gái mình có thích dâu không?"),
    ("Chị nói mình có ngân sách 300k.", "Chị nói mình có ngân sách 300k."),
    ("Em gái chị thích vị gì?", "Em gái chị thích vị gì?"),
    ("Chị ấy thích mousse. Mình có thể gợi ý mẫu này.", "Chị ấy thích mousse. Em có thể gợi ý mẫu này."),
])
def test_normalization_repairs_bot_subjects_without_changing_customer_or_recipient(output, expected):
    assert normalize_address(output, AddressStyle(customer="chị"), []) == expected


def test_product_names_prices_and_quotes_are_preserved():
    text = 'Mình gợi ý Mình Có Bánh size 16cm, giá 260.000đ. Chị nói “mình có 300k”.'
    assert normalize_address(text, AddressStyle(customer="chị"), ["Mình Có Bánh"]) == (
        'Em gợi ý Mình Có Bánh size 16cm, giá 260.000đ. Chị nói “mình có 300k”.'
    )


def test_neutral_customers_and_customer_suggestion_messages_are_not_rewritten():
    text = "Mình muốn mua bánh cho chị gái. Em có thích chocolate không?"
    assert normalize_address(text, AddressStyle(), []) == text


def test_male_customer_keeps_the_same_em_anh_pair():
    assert normalize_address("Mình có thể gợi ý, bạn xem nhé.", AddressStyle(customer="anh"), []) == (
        "Em có thể gợi ý, anh xem nhé."
    )


def test_customer_role_does_not_relabel_other_family_members():
    text = "Chị thích dâu còn em gái thích chocolate. Anh muốn xem mẫu nào?"
    assert normalize_address(text, AddressStyle(customer="anh"), []) == text
