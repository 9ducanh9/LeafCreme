"""
MoMo QR Simple Payment Service
Thanh toán MoMo đơn giản bằng QR code - không cần API
"""
from __future__ import annotations

import qrcode
from io import BytesIO
import base64
from typing import Optional


def generate_momo_qr(phone_number: str, amount: int, note: str) -> str:
    """
    Tạo mã QR MoMo động với số tiền và nội dung tự động điền
    
    MoMo QR format: 2|99|{phone}|{name}|{email}|0|0|{amount}|{note}|transfer_p2p
    
    Khi quét QR này:
    - Số tiền tự động điền
    - Nội dung chuyển khoản tự động điền
    - Người dùng chỉ cần xác nhận
    
    Args:
        phone_number: Số điện thoại MoMo nhận tiền
        amount: Số tiền (VND)
        note: Nội dung chuyển khoản (mã đơn hàng)
        
    Returns:
        str: Base64 encoded QR code image
    """
    # MoMo QR Dynamic Format
    # Format: 2|99|phone|name|email|0|0|amount|note|transfer_p2p
    # 2 = version
    # 99 = payment type (transfer with amount)
    momo_data = f"2|99|{phone_number}|||0|0|{amount}|{note}|transfer_p2p"
    
    # Tạo QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(momo_data)
    qr.make(fit=True)
    
    # Tạo image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return f"data:image/png;base64,{img_str}"


def create_momo_payment_info(
    order_code: str,
    amount: int,
    phone_number: str,
    account_name: str,
    qr_image_path: Optional[str] = None
) -> dict:
    """
    Tạo thông tin thanh toán MoMo để hiển thị cho khách
    
    Args:
        order_code: Mã đơn hàng
        amount: Số tiền
        phone_number: SĐT MoMo
        account_name: Tên tài khoản MoMo
        qr_image_path: Đường dẫn đến ảnh QR (nếu có)
        
    Returns:
        dict: Thông tin thanh toán
    """
    payment_info = {
        "method": "momo_qr",
        "phone_number": phone_number,
        "account_name": account_name,
        "amount": amount,
        "transfer_content": order_code,
        "instructions": [
            f"1. Mở app MoMo",
            f"2. Quét mã QR hoặc chuyển đến: {phone_number}",
            f"3. Nhập số tiền: {amount:,} VNĐ",
            f"4. Nhập nội dung: {order_code}",
            f"5. Xác nhận chuyển tiền",
        ]
    }
    
    # Nếu có ảnh QR sẵn
    if qr_image_path:
        payment_info["qr_image"] = qr_image_path
    else:
        # Tạo QR động
        payment_info["qr_code"] = generate_momo_qr(
            phone_number=phone_number,
            amount=amount,
            note=order_code
        )
    
    return payment_info


def format_momo_amount(amount: float | int) -> str:
    """
    Format số tiền theo định dạng Việt Nam
    
    Args:
        amount: Số tiền
        
    Returns:
        str: Số tiền đã format (VD: "100.000 VNĐ")
    """
    return f"{int(amount):,} VNĐ".replace(",", ".")


def validate_transfer_content(content: str, order_code: str) -> bool:
    """
    Kiểm tra nội dung chuyển khoản có chứa mã đơn hàng không
    
    Args:
        content: Nội dung chuyển khoản từ MoMo
        order_code: Mã đơn hàng cần kiểm tra
        
    Returns:
        bool: True nếu hợp lệ
    """
    # Loại bỏ khoảng trắng, chuyển về chữ thường
    content_clean = content.replace(" ", "").lower()
    order_code_clean = order_code.replace(" ", "").lower()
    
    return order_code_clean in content_clean

