"""
MoMo Payment Service
Tích hợp thanh toán MoMo cho Leaf Creme
"""
from __future__ import annotations

import hmac
import hashlib
import json
from typing import Any, Dict, Tuple
from datetime import datetime


def sign_request(params: Dict[str, Any], secret_key: str) -> str:
    """
    Tạo chữ ký HMAC SHA256 cho request MoMo
    
    Args:
        params: Các tham số cần ký
        secret_key: Secret key từ MoMo
        
    Returns:
        str: Chữ ký HMAC SHA256
    """
    # MoMo yêu cầu format: accessKey=...&amount=...&extraData=...&ipnUrl=...&orderId=...&orderInfo=...&partnerCode=...&redirectUrl=...&requestId=...&requestType=...
    raw_signature = (
        f"accessKey={params.get('accessKey', '')}"
        f"&amount={params.get('amount', '')}"
        f"&extraData={params.get('extraData', '')}"
        f"&ipnUrl={params.get('ipnUrl', '')}"
        f"&orderId={params.get('orderId', '')}"
        f"&orderInfo={params.get('orderInfo', '')}"
        f"&partnerCode={params.get('partnerCode', '')}"
        f"&redirectUrl={params.get('redirectUrl', '')}"
        f"&requestId={params.get('requestId', '')}"
        f"&requestType={params.get('requestType', '')}"
    )
    
    return hmac.new(
        secret_key.encode("utf-8"),
        raw_signature.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()


def verify_signature(params: Dict[str, Any], secret_key: str) -> Tuple[bool, str]:
    """
    Xác thực chữ ký từ MoMo callback
    
    Args:
        params: Tham số từ MoMo callback
        secret_key: Secret key từ MoMo
        
    Returns:
        Tuple[bool, str]: (Valid hay không, Expected signature)
    """
    received_signature = str(params.get("signature") or "")
    
    # MoMo IPN signature format
    raw_signature = (
        f"accessKey={params.get('accessKey', '')}"
        f"&amount={params.get('amount', '')}"
        f"&extraData={params.get('extraData', '')}"
        f"&message={params.get('message', '')}"
        f"&orderId={params.get('orderId', '')}"
        f"&orderInfo={params.get('orderInfo', '')}"
        f"&orderType={params.get('orderType', '')}"
        f"&partnerCode={params.get('partnerCode', '')}"
        f"&payType={params.get('payType', '')}"
        f"&requestId={params.get('requestId', '')}"
        f"&responseTime={params.get('responseTime', '')}"
        f"&resultCode={params.get('resultCode', '')}"
        f"&transId={params.get('transId', '')}"
    )
    
    expected_signature = hmac.new(
        secret_key.encode("utf-8"),
        raw_signature.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    
    return received_signature.lower() == expected_signature.lower(), expected_signature


def create_payment_request(
    partner_code: str,
    access_key: str,
    secret_key: str,
    order_id: str,
    amount: int,
    order_info: str,
    redirect_url: str,
    ipn_url: str,
    request_id: str,
    extra_data: str = "",
    request_type: str = "payWithMethod",
    lang: str = "vi"
) -> Dict[str, Any]:
    """
    Tạo request thanh toán MoMo
    
    Args:
        partner_code: Mã đối tác từ MoMo
        access_key: Access key từ MoMo
        secret_key: Secret key từ MoMo
        order_id: Mã đơn hàng
        amount: Số tiền (VND)
        order_info: Thông tin đơn hàng
        redirect_url: URL redirect sau thanh toán
        ipn_url: URL nhận IPN callback
        request_id: Mã request (unique)
        extra_data: Dữ liệu bổ sung (base64)
        request_type: Loại request (payWithMethod, captureWallet)
        lang: Ngôn ngữ (vi, en)
        
    Returns:
        Dict: Request body để gửi đến MoMo
    """
    params = {
        "partnerCode": partner_code,
        "accessKey": access_key,
        "requestId": request_id,
        "amount": str(amount),
        "orderId": order_id,
        "orderInfo": order_info,
        "redirectUrl": redirect_url,
        "ipnUrl": ipn_url,
        "requestType": request_type,
        "extraData": extra_data,
        "lang": lang
    }
    
    signature = sign_request(params, secret_key)
    params["signature"] = signature
    
    return params


def parse_momo_datetime(value: str | None) -> datetime | None:
    """
    Parse datetime từ MoMo response
    MoMo format: timestamp milliseconds
    
    Args:
        value: Timestamp string từ MoMo
        
    Returns:
        datetime hoặc None
    """
    if not value:
        return None
    try:
        # MoMo trả về timestamp milliseconds
        timestamp_ms = int(value)
        return datetime.fromtimestamp(timestamp_ms / 1000.0)
    except (ValueError, TypeError):
        return None




