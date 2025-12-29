"""
Configuration settings cho application
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # JWT Settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production-minimum-32-characters")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    FRONTEND_BASE_URL: str = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
    BACKEND_BASE_URL: str = os.getenv("BACKEND_BASE_URL", "http://localhost:8000")

    VNPAY_TMN_CODE: str = os.getenv("VNPAY_TMN_CODE", "")
    VNPAY_HASH_SECRET: str = os.getenv("VNPAY_HASH_SECRET", "")
    VNPAY_PAYMENT_URL: str = os.getenv("VNPAY_PAYMENT_URL", "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html")
    VNPAY_VERSION: str = os.getenv("VNPAY_VERSION", "2.1.0")
    VNPAY_COMMAND: str = os.getenv("VNPAY_COMMAND", "pay")
    VNPAY_LOCALE: str = os.getenv("VNPAY_LOCALE", "vn")
    VNPAY_CURR_CODE: str = os.getenv("VNPAY_CURR_CODE", "VND")
    VNPAY_ORDER_TYPE: str = os.getenv("VNPAY_ORDER_TYPE", "other")

    # MoMo Settings
    MOMO_PARTNER_CODE: str = os.getenv("MOMO_PARTNER_CODE", "")
    MOMO_ACCESS_KEY: str = os.getenv("MOMO_ACCESS_KEY", "")
    MOMO_SECRET_KEY: str = os.getenv("MOMO_SECRET_KEY", "")
    MOMO_PAYMENT_URL: str = os.getenv("MOMO_PAYMENT_URL", "https://test-payment.momo.vn/v2/gateway/api/create")
    MOMO_REQUEST_TYPE: str = os.getenv("MOMO_REQUEST_TYPE", "payWithMethod")
    MOMO_LANG: str = os.getenv("MOMO_LANG", "vi")

    # MoMo Simple QR Payment (không cần Business API)
    MOMO_QR_PHONE: str = os.getenv("MOMO_QR_PHONE", "")
    MOMO_QR_ACCOUNT_NAME: str = os.getenv("MOMO_QR_ACCOUNT_NAME", "")
    MOMO_QR_IMAGE_PATH: str = os.getenv("MOMO_QR_IMAGE_PATH", "")


settings = Settings()

