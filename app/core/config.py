"""
Configuration settings cho application
"""
import os
from typing import List
from dotenv import load_dotenv

load_dotenv()


def _parse_csv(value: str) -> List[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


class Settings:
    APP_ENV: str = os.getenv("APP_ENV", os.getenv("ENV", "development")).lower()
    IS_DEVELOPMENT: bool = APP_ENV in {"dev", "development", "local"}

    # JWT Settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    if not SECRET_KEY:
        if IS_DEVELOPMENT:
            SECRET_KEY = "dev-only-insecure-secret-key-change-before-production"
        else:
            raise RuntimeError("Missing required SECRET_KEY environment variable.")

    if not IS_DEVELOPMENT and len(SECRET_KEY) < 32:
        raise RuntimeError("SECRET_KEY must be at least 32 characters outside development.")

    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    # Authentication provider. Keep the legacy provider as the default so a
    # deployment cannot accidentally lock every existing user out while the
    # Cognito variables are being configured.
    AUTH_PROVIDER: str = os.getenv("AUTH_PROVIDER", "local").lower()
    if AUTH_PROVIDER not in {"local", "cognito"}:
        raise RuntimeError("AUTH_PROVIDER must be either 'local' or 'cognito'.")

    COGNITO_REGION: str = os.getenv("COGNITO_REGION", "")
    COGNITO_USER_POOL_ID: str = os.getenv("COGNITO_USER_POOL_ID", "")
    COGNITO_APP_CLIENT_ID: str = os.getenv("COGNITO_APP_CLIENT_ID", "")
    if AUTH_PROVIDER == "cognito" and not all(
        (COGNITO_REGION, COGNITO_USER_POOL_ID, COGNITO_APP_CLIENT_ID)
    ):
        raise RuntimeError(
            "COGNITO_REGION, COGNITO_USER_POOL_ID, and COGNITO_APP_CLIENT_ID "
            "are required when AUTH_PROVIDER=cognito."
        )

    FRONTEND_BASE_URL: str = os.getenv(
        "FRONTEND_BASE_URL",
        "http://localhost:5173" if IS_DEVELOPMENT else ""
    )
    BACKEND_BASE_URL: str = os.getenv(
        "BACKEND_BASE_URL",
        "http://localhost:8000" if IS_DEVELOPMENT else ""
    )

    _default_dev_origins = (
        "http://localhost:3000,"
        "http://127.0.0.1:3000,"
        "http://localhost:5173,"
        "http://127.0.0.1:5173"
    )
    CORS_ORIGINS_RAW: str = os.getenv("CORS_ORIGINS", _default_dev_origins if IS_DEVELOPMENT else "")
    CORS_ORIGINS: List[str] = _parse_csv(CORS_ORIGINS_RAW)

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
