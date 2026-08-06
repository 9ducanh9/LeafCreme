"""
Helper service: Các utility functions hỗ trợ chung cho toàn bộ ứng dụng
"""
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, String


# =========================================================
# Date & Time Utilities
# =========================================================

def parse_date_vietnam(date_str: str) -> Optional[date]:
    """
    Parse ngày theo format Việt Nam (DD/MM/YYYY) hoặc ISO (YYYY-MM-DD)
    Hỗ trợ: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
    """
    if not date_str:
        return None
    
    date_str = date_str.strip()
    formats = [
        ("%d/%m/%Y", "DD/MM/YYYY"),      # Format Việt Nam
        ("%d-%m-%Y", "DD-MM-YYYY"),      # Format Việt Nam (dấu gạch ngang)
        ("%Y-%m-%d", "YYYY-MM-DD"),      # Format ISO
    ]
    
    for fmt, fmt_name in formats:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    
    raise ValueError(
        f"Format ngày không hợp lệ: '{date_str}'. "
        f"Hỗ trợ: DD/MM/YYYY (ví dụ: 16/10/2004), DD-MM-YYYY, hoặc YYYY-MM-DD"
    )


def format_date_vietnam(d: date) -> str:
    """Format date thành DD/MM/YYYY"""
    return d.strftime("%d/%m/%Y")


def format_datetime_vietnam(dt: datetime) -> str:
    """Format datetime thành DD/MM/YYYY HH:MM"""
    return dt.strftime("%d/%m/%Y %H:%M")


def get_date_range(days: int = 30) -> Tuple[date, date]:
    """
    Lấy khoảng thời gian từ N ngày trước đến hôm nay
    Returns: (from_date, to_date)
    """
    to_date = date.today()
    from_date = to_date - timedelta(days=days)
    return from_date, to_date


def get_current_datetime() -> datetime:
    """Lấy datetime hiện tại (UTC)"""
    return datetime.utcnow()


def is_expiring_soon(expiry_date: datetime, days: int = 7) -> bool:
    """Kiểm tra xem ngày hết hạn có sắp đến trong N ngày không"""
    now = datetime.utcnow()
    return now < expiry_date <= now + timedelta(days=days)


def is_expired(expiry_date: datetime) -> bool:
    """Kiểm tra xem đã hết hạn chưa"""
    return datetime.utcnow() > expiry_date


# =========================================================
# Number & Currency Utilities
# =========================================================

def format_currency(amount: Decimal, currency: str = "VNĐ") -> str:
    """Format số tiền thành chuỗi với dấu phẩy phân cách"""
    return f"{amount:,.0f} {currency}"


def calculate_percentage(value: Decimal, total: Decimal) -> float:
    """Tính phần trăm (0-100)"""
    if total == 0:
        return 0.0
    return float((value / total) * 100)


def calculate_discount_amount(original: Decimal, discount_percent: Decimal) -> Decimal:
    """Tính số tiền giảm giá từ phần trăm"""
    return original * (discount_percent / 100)


def calculate_final_price(original: Decimal, discount_amount: Decimal) -> Decimal:
    """Tính giá cuối cùng sau khi giảm giá"""
    return max(Decimal(0), original - discount_amount)


def round_decimal(value: Decimal, places: int = 2) -> Decimal:
    """Làm tròn số decimal"""
    return round(value, places)


# =========================================================
# String Utilities
# =========================================================

def slugify(text: str) -> str:
    """Chuyển text thành slug (URL-friendly)"""
    import unicodedata
    import re
    
    # Chuyển về Unicode NFD (Normalization Form Decomposed)
    text = unicodedata.normalize('NFD', text)
    # Loại bỏ dấu
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    # Chuyển thành chữ thường
    text = text.lower()
    # Thay khoảng trắng bằng dấu gạch ngang
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    # Loại bỏ dấu gạch ngang ở đầu và cuối
    text = text.strip('-')
    return text


def truncate_string(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """Cắt ngắn chuỗi nếu quá dài"""
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix


def sanitize_search_term(term: str) -> str:
    """Làm sạch từ khóa tìm kiếm"""
    if not term:
        return ""
    # Loại bỏ khoảng trắng thừa
    term = " ".join(term.split())
    # Escape special characters cho SQL LIKE
    term = term.replace("%", "\\%").replace("_", "\\_")
    return term


# =========================================================
# Validation Utilities
# =========================================================

def validate_email(email: str) -> bool:
    """Validate email format"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_phone(phone: str) -> bool:
    """Validate số điện thoại Việt Nam"""
    import re
    # Chấp nhận: 10 hoặc 11 số, có thể có +84, 0 ở đầu
    pattern = r'^(\+84|0)?[1-9]\d{8,9}$'
    phone_clean = phone.replace(" ", "").replace("-", "")
    return bool(re.match(pattern, phone_clean))


def validate_sku(sku: str) -> bool:
    """Validate SKU format (chỉ cho phép chữ, số, dấu gạch ngang, dấu gạch dưới)"""
    import re
    pattern = r'^[A-Za-z0-9_-]+$'
    return bool(re.match(pattern, sku))


def is_valid_uuid(uuid_string: str) -> bool:
    """Kiểm tra xem chuỗi có phải UUID hợp lệ không"""
    import re
    pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    return bool(re.match(pattern, uuid_string, re.I))


# =========================================================
# Pagination Utilities
# =========================================================

def paginate_query(query, skip: int = 0, limit: int = 50):
    """Apply pagination cho SQLAlchemy query"""
    return query.offset(skip).limit(limit)


def get_pagination_info(total: int, skip: int = 0, limit: int = 50) -> Dict[str, Any]:
    """Tính toán thông tin pagination"""
    page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = (total // limit) + (1 if total % limit > 0 else 0) if limit > 0 else 1
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "page": page,
        "total_pages": total_pages,
        "has_next": (skip + limit) < total,
        "has_prev": skip > 0
    }


# =========================================================
# Status & State Utilities
# =========================================================

def get_status_color(status: str) -> str:
    """Trả về màu CSS tương ứng với trạng thái"""
    status_colors = {
        # Đơn hàng
        "cho": "yellow",
        "thanh_toan": "blue",
        "da_nhan": "green",
        "huy": "red",
        "dang_xu_ly": "orange",  # shared by order + payment status, same color either way
        "thanh_cong": "green",
        "that_bai": "red",
        # Đổi trả
        "yeu_cau": "yellow",
        "dong_y": "blue",
        "tu_choi": "red",
        "hoan_thanh": "green",
        # Lô hàng
        "hoatdong": "green",
        "hethan": "red",
        # Cảnh báo
        "thap": "yellow",
        "binh_thuong": "gray",
        "cao": "red",
    }
    return status_colors.get(status.lower(), "gray")


def format_status_vietnam(status: str) -> str:
    """Format trạng thái sang tiếng Việt"""
    status_map = {
        "cho": "Chờ xử lý",
        "thanh_toan": "Đã thanh toán",
        "da_nhan": "Đã nhận",
        "huy": "Đã hủy",
        "dang_xu_ly": "Đang xử lý",  # shared by order + payment status
        "thanh_cong": "Thành công",
        "that_bai": "Thất bại",
        "yeu_cau": "Yêu cầu",
        "dong_y": "Đồng ý",
        "tu_choi": "Từ chối",
        "hoan_thanh": "Hoàn thành",
        "hoatdong": "Hoạt động",
        "hethan": "Hết hạn",
        "thap": "Thấp",
        "binh_thuong": "Bình thường",
        "cao": "Cao",
    }
    return status_map.get(status.lower(), status)


# =========================================================
# Query Utilities
# =========================================================

def apply_search_filter(query, search_term: Optional[str], search_fields: List[str]):
    """
    Áp dụng tìm kiếm vào query với nhiều trường
    search_fields: List tên các cột cần tìm kiếm (dùng string, không phải model attribute)
    
    Note: Hàm này yêu cầu query phải có model entity. 
    Sử dụng với: query.filter(Model.column.ilike(...)) thay vì hàm này nếu có thể.
    """
    if not search_term:
        return query
    
    search_term = sanitize_search_term(search_term)
    if not search_term:
        return query
    
    # Tạo điều kiện OR cho tất cả các trường
    # Lưu ý: Hàm này đơn giản hóa - trong thực tế nên dùng trực tiếp trong query
    conditions = []
    try:
        entity = query.column_descriptions[0]['entity'] if query.column_descriptions else None
        if entity:
            for field_name in search_fields:
                field = getattr(entity, field_name, None)
                if field:
                    conditions.append(func.cast(field, String).ilike(f"%{search_term}%"))
        
        if conditions:
            query = query.filter(or_(*conditions))
    except (IndexError, AttributeError):
        # Nếu không thể áp dụng, trả về query gốc
        pass
    
    return query


def apply_date_range_filter(query, date_field, from_date: Optional[date] = None, to_date: Optional[date] = None):
    """Áp dụng filter theo khoảng ngày"""
    if from_date:
        query = query.filter(func.date(date_field) >= from_date)
    if to_date:
        query = query.filter(func.date(date_field) <= to_date)
    return query


# =========================================================
# Data Transformation Utilities
# =========================================================

def dict_to_camel_case(data: Dict[str, Any]) -> Dict[str, Any]:
    """Chuyển dict keys từ snake_case sang camelCase"""
    result = {}
    for key, value in data.items():
        parts = key.split('_')
        camel_key = parts[0] + ''.join(word.capitalize() for word in parts[1:])
        result[camel_key] = value
    return result


def dict_to_snake_case(data: Dict[str, Any]) -> Dict[str, Any]:
    """Chuyển dict keys từ camelCase sang snake_case"""
    import re
    result = {}
    for key, value in data.items():
        snake_key = re.sub(r'(?<!^)(?=[A-Z])', '_', key).lower()
        result[snake_key] = value
    return result


def remove_none_values(data: Dict[str, Any]) -> Dict[str, Any]:
    """Loại bỏ các key có giá trị None khỏi dict"""
    return {k: v for k, v in data.items() if v is not None}


def flatten_dict(data: Dict[str, Any], prefix: str = "") -> Dict[str, Any]:
    """Làm phẳng nested dict"""
    result = {}
    for key, value in data.items():
        new_key = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            result.update(flatten_dict(value, new_key))
        else:
            result[new_key] = value
    return result


# =========================================================
# File & Media Utilities
# =========================================================

def validate_file_extension(filename: str, allowed_extensions: List[str]) -> bool:
    """Kiểm tra extension của file"""
    if not filename:
        return False
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    return ext in [ext.lower() for ext in allowed_extensions]


def get_file_size_mb(file_size: int) -> float:
    """Chuyển đổi bytes sang MB"""
    return file_size / (1024 * 1024)


def generate_unique_filename(original_filename: str) -> str:
    """Tạo tên file unique bằng timestamp"""
    import os
    from datetime import datetime
    name, ext = os.path.splitext(original_filename)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
    return f"{name}_{timestamp}{ext}"


# =========================================================
# Error Handling Utilities
# =========================================================

def safe_int(value: Any, default: int = 0) -> int:
    """Chuyển đổi an toàn sang int"""
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def safe_float(value: Any, default: float = 0.0) -> float:
    """Chuyển đổi an toàn sang float"""
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def safe_decimal(value: Any, default: Decimal = Decimal(0)) -> Decimal:
    """Chuyển đổi an toàn sang Decimal"""
    try:
        return Decimal(str(value))
    except (ValueError, TypeError):
        return default


# =========================================================
# Code Generation Utilities
# =========================================================

def generate_order_code(loai_don: str, sequence: Optional[int] = None) -> str:
    """
    Generate mã đơn hàng
    Format: POS-YYYYMMDD-XXXX hoặc ONLINE-YYYYMMDD-XXXX hoặc DATTRUOC-YYYYMMDD-XXXX
    """
    now = datetime.utcnow()
    date_str = now.strftime("%Y%m%d")
    
    # Prefix theo loại đơn
    prefix_map = {
        "pos": "POS",
        "online": "ONLINE",
        "dattruoc": "DATTRUOC"
    }
    prefix = prefix_map.get(loai_don.lower(), "ORDER")
    
    # Sequence number (4 digits)
    if sequence is None:
        # Nếu không có sequence, dùng timestamp milliseconds
        seq = int(now.timestamp() * 1000) % 10000
    else:
        seq = sequence % 10000
    
    return f"{prefix}-{date_str}-{seq:04d}"


def generate_batch_code(prefix: str = "LO", sequence: Optional[int] = None) -> str:
    """
    Generate mã lô hàng
    Format: LO-YYYYMMDD-XXXX
    """
    now = datetime.utcnow()
    date_str = now.strftime("%Y%m%d")
    
    if sequence is None:
        seq = int(now.timestamp() * 1000) % 10000
    else:
        seq = sequence % 10000
    
    return f"{prefix}-{date_str}-{seq:04d}"


def generate_unique_code(prefix: str, length: int = 12, include_date: bool = True) -> str:
    """
    Generate mã unique chung
    Format: PREFIX-YYYYMMDD-XXXXX (hoặc PREFIX-XXXXX nếu không có date)
    """
    import random
    import string
    
    if include_date:
        date_str = datetime.utcnow().strftime("%Y%m%d")
        random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
        return f"{prefix}-{date_str}-{random_part}"
    else:
        random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
        return f"{prefix}-{random_part}"


def generate_voucher_code(length: int = 8) -> str:
    """Generate mã voucher code"""
    import random
    import string
    
    # Tránh các ký tự dễ nhầm lẫn: 0, O, I, L
    chars = string.ascii_uppercase.replace('O', '').replace('I', '') + string.digits.replace('0', '')
    return ''.join(random.choices(chars, k=length))


def generate_sku(prefix: str, variant: Optional[str] = None, sequence: Optional[int] = None) -> str:
    """
    Generate SKU code
    Format: PREFIX-VARIANT-XXXX hoặc PREFIX-XXXX
    """
    if sequence is None:
        now = datetime.utcnow()
        seq = int(now.timestamp() * 1000) % 10000
    else:
        seq = sequence % 10000
    
    if variant:
        variant_clean = variant.upper().replace(" ", "-")[:10]
        return f"{prefix}-{variant_clean}-{seq:04d}"
    else:
        return f"{prefix}-{seq:04d}"


# =========================================================
# Business Logic Utilities - Orders
# =========================================================

def calculate_order_totals(
    items: List[Dict[str, Any]],
    vouchers_discount: Decimal = Decimal(0)
) -> Dict[str, Decimal]:
    """
    Tính toán tổng tiền đơn hàng
    Returns: {tong_tien, tien_giam_gia, tien_thanh_toan}
    """
    tong_tien = Decimal(0)
    
    for item in items:
        so_luong = safe_decimal(item.get("so_luong", 0))
        gia_don_vi = safe_decimal(item.get("gia_don_vi", 0))
        tong_tien += so_luong * gia_don_vi
    
    tien_giam_gia = min(vouchers_discount, tong_tien)  # Không giảm quá tổng tiền
    tien_thanh_toan = max(Decimal(0), tong_tien - tien_giam_gia)
    
    return {
        "tong_tien": tong_tien,
        "tien_giam_gia": tien_giam_gia,
        "tien_thanh_toan": tien_thanh_toan
    }


def calculate_item_total(so_luong: int, gia_don_vi: Decimal) -> Decimal:
    """Tính tổng tiền cho 1 item"""
    return Decimal(so_luong) * gia_don_vi


def validate_order_status_transition(current_status: str, new_status: str) -> bool:
    """
    Validate việc chuyển trạng thái đơn hàng có hợp lệ không
    """
    valid_transitions = {
        "cho": ["dang_xu_ly", "huy"],
        "dang_xu_ly": ["thanh_toan", "huy"],
        "thanh_toan": ["da_nhan", "huy"],
        "da_nhan": [],  # Không thể chuyển từ đã nhận
        "huy": []  # Không thể chuyển từ đã hủy
    }
    
    allowed = valid_transitions.get(current_status.lower(), [])
    return new_status.lower() in allowed


def can_cancel_order(status: str) -> bool:
    """Kiểm tra xem đơn hàng có thể hủy không"""
    cancellable_statuses = ["cho", "dang_xu_ly", "thanh_toan"]
    return status.lower() in cancellable_statuses


def can_return_order(status: str) -> bool:
    """Kiểm tra xem đơn hàng có thể đổi trả không"""
    return status.lower() == "da_nhan"


# =========================================================
# Business Logic Utilities - Inventory
# =========================================================

def calculate_available_stock(current_stock: int, reserved: int = 0) -> int:
    """Tính số lượng tồn kho khả dụng (trừ đi số đã reserve)"""
    return max(0, current_stock - reserved)


def is_low_stock(current_stock: int, threshold: int = 10) -> bool:
    """Kiểm tra xem tồn kho có thấp không"""
    return current_stock <= threshold


def calculate_stock_value(quantity: int, unit_price: Decimal) -> Decimal:
    """Tính giá trị tồn kho"""
    return Decimal(quantity) * unit_price


def get_stock_status(current_stock: int, min_stock: int = 10, max_stock: int = 1000) -> str:
    """Trả về trạng thái tồn kho"""
    if current_stock == 0:
        return "het_hang"
    elif current_stock < min_stock:
        return "ton_kho_thap"
    elif current_stock > max_stock:
        return "ton_kho_cao"
    else:
        return "binh_thuong"


# =========================================================
# Business Logic Utilities - Vouchers
# =========================================================

def calculate_voucher_discount(
    voucher_type: str,
    discount_value: Decimal,
    order_total: Decimal,
    order_items: Optional[List[Dict[str, Any]]] = None
) -> Decimal:
    """
    Tính số tiền giảm từ voucher
    voucher_type: "phan_tram" hoặc "so_tien"
    """
    if voucher_type.lower() == "phan_tram":
        discount_amount = order_total * (discount_value / 100)
        return min(discount_amount, order_total)  # Không giảm quá tổng tiền
    else:  # so_tien
        return min(discount_value, order_total)  # Không giảm quá tổng tiền


def is_voucher_valid(
    start_date: datetime,
    end_date: datetime,
    current_usage: int,
    max_usage: int
) -> bool:
    """Kiểm tra voucher có còn hiệu lực không"""
    now = datetime.utcnow()
    return (
        now >= start_date and
        now <= end_date and
        current_usage < max_usage
    )


# =========================================================
# Business Logic Utilities - Payments
# =========================================================

def calculate_payment_status(
    paid_amount: Decimal,
    total_amount: Decimal
) -> str:
    """Tính trạng thái thanh toán"""
    if paid_amount >= total_amount:
        return "thanh_cong"
    elif paid_amount > 0:
        return "dang_xu_ly"  # Đã trả một phần
    else:
        return "chua_thanh_toan"


def calculate_remaining_amount(total: Decimal, paid: Decimal) -> Decimal:
    """Tính số tiền còn lại cần thanh toán"""
    return max(Decimal(0), total - paid)


def calculate_refund_amount(paid: Decimal, order_total: Decimal, refund_percent: Optional[Decimal] = None) -> Decimal:
    """Tính số tiền hoàn lại"""
    if refund_percent:
        return paid * (refund_percent / 100)
    else:
        return paid  # Hoàn toàn bộ


# =========================================================
# Data Formatting Utilities - Business
# =========================================================

def format_order_status(status: str) -> str:
    """Format trạng thái đơn hàng sang tiếng Việt"""
    status_map = {
        "cho": "Chờ xử lý",
        "dang_xu_ly": "Đang xử lý",
        "thanh_toan": "Đã thanh toán",
        "da_nhan": "Đã nhận hàng",
        "huy": "Đã hủy"
    }
    return status_map.get(status.lower(), status)


def format_payment_method(method: str) -> str:
    """Format phương thức thanh toán"""
    method_map = {
        "tien_mat": "Tiền mặt",
        "chuyen_khoan": "Chuyển khoản",
        "the": "Thẻ",
        "vi_dien_tu": "Ví điện tử"
    }
    return method_map.get(method.lower(), method)


def format_order_type(loai: str) -> str:
    """Format loại đơn hàng"""
    type_map = {
        "pos": "Tại cửa hàng",
        "online": "Online",
        "dattruoc": "Đặt trước"
    }
    return type_map.get(loai.lower(), loai)


# =========================================================
# Validation Utilities - Business
# =========================================================

def validate_order_items(items: List[Dict[str, Any]]) -> Tuple[bool, Optional[str]]:
    """Validate danh sách items trong đơn hàng"""
    if not items or len(items) == 0:
        return False, "Đơn hàng phải có ít nhất 1 sản phẩm"
    
    for item in items:
        so_luong = item.get("so_luong", 0)
        if not isinstance(so_luong, int) or so_luong <= 0:
            return False, f"Số lượng không hợp lệ: {so_luong}"
        
        # Phải có ít nhất 1 trong: bienthe_id hoặc hop_qua_id
        if not item.get("bienthe_id") and not item.get("hop_qua_id"):
            return False, "Item phải có bienthe_id hoặc hop_qua_id"
    
    return True, None


def validate_stock_availability(current_stock: int, requested_qty: int) -> Tuple[bool, Optional[str]]:
    """Validate xem có đủ hàng không"""
    if current_stock < requested_qty:
        return False, f"Không đủ hàng. Hiện có: {current_stock}, yêu cầu: {requested_qty}"
    return True, None


def validate_expiry_date(expiry_date: datetime, min_days: int = 0) -> Tuple[bool, Optional[str]]:
    """Validate ngày hết hạn"""
    now = datetime.utcnow()
    
    if expiry_date <= now:
        return False, "Ngày hết hạn phải sau ngày hiện tại"
    
    if min_days > 0:
        min_date = now + timedelta(days=min_days)
        if expiry_date < min_date:
            return False, f"Ngày hết hạn phải cách ít nhất {min_days} ngày"
    
    return True, None


# =========================================================
# Statistics & Aggregation Utilities
# =========================================================

def calculate_growth_rate(current: Decimal, previous: Decimal) -> float:
    """Tính tỷ lệ tăng trưởng (%)"""
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return float(((current - previous) / previous) * 100)


def calculate_average(values: List[Decimal]) -> Decimal:
    """Tính trung bình"""
    if not values:
        return Decimal(0)
    total = sum(values)
    return Decimal(total) / Decimal(len(values))


def calculate_total(items: List[Dict[str, Any]], field: str) -> Decimal:
    """Tính tổng giá trị của một field trong list items"""
    total = sum(safe_decimal(item.get(field, 0)) for item in items)
    return Decimal(total)


def calculate_percentage_change(old_value: Decimal, new_value: Decimal) -> float:
    """Tính phần trăm thay đổi"""
    if old_value == 0:
        return 100.0 if new_value > 0 else 0.0
    return float(((new_value - old_value) / old_value) * 100)

