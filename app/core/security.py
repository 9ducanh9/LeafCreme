"""
Security utilities: Password hashing và JWT tokens
"""

from datetime import timedelta
from functools import lru_cache
import logging
from typing import Optional, Dict
from jose import JWTError, jwt
import bcrypt
import requests
from app.core.config import settings
from app.core.time import utc_now


logger = logging.getLogger("bakeryonl.api")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password với hash (bcrypt)"""
    try:
        password_bytes = plain_password.encode("utf-8")
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(password_bytes, hash_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Hash password bằng bcrypt"""
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hash_bytes = bcrypt.hashpw(password_bytes, salt)
    return hash_bytes.decode("utf-8")


def create_access_token(data: Dict, expires_delta: Optional[timedelta] = None) -> str:
    """Tạo JWT access token"""
    to_encode = data.copy()

    # Convert 'sub' to string if it's an integer (jose requires string)
    if "sub" in to_encode and isinstance(to_encode["sub"], int):
        to_encode["sub"] = str(to_encode["sub"])

    if expires_delta:
        expire = utc_now() + expires_delta
    else:
        expire = utc_now() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: Dict) -> str:
    """Tạo JWT refresh token"""
    to_encode = data.copy()

    # Convert 'sub' to string if it's an integer (jose requires string)
    if "sub" in to_encode and isinstance(to_encode["sub"], int):
        to_encode["sub"] = str(to_encode["sub"])

    expire = utc_now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[Dict]:
    """Decode và verify JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as e:
        logger.warning(f"JWT decode error: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error decoding token: {str(e)}")
        return None


def _cognito_issuer() -> str:
    return f"https://cognito-idp.{settings.COGNITO_REGION}.amazonaws.com/{settings.COGNITO_USER_POOL_ID}"


def _reject_cognito_token(reason: str) -> None:
    """Record a safe rejection reason without ever logging a bearer token."""
    logger.info("Cognito token verification rejected: %s", reason)


@lru_cache(maxsize=1)
def _cognito_jwks() -> dict:
    """Fetch Cognito public keys once per process, never trusting token keys."""
    response = requests.get(f"{_cognito_issuer()}/.well-known/jwks.json", timeout=5)
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload.get("keys"), list):
        raise ValueError("Invalid Cognito JWKS response")
    return payload


def decode_cognito_token(token: str, expected_token_use: str) -> Optional[Dict]:
    """Verify a Cognito RS256 token against the configured pool and client.

    Access and ID tokens have different audience claims, so callers must state
    which type they accept. Returning ``None`` intentionally matches the
    legacy decoder contract used by request dependencies.
    """
    if settings.AUTH_PROVIDER != "cognito":
        return None

    try:
        header = jwt.get_unverified_header(token)
        key_id = header.get("kid")
        if header.get("alg") != "RS256" or not key_id:
            _reject_cognito_token("missing_kid_or_non_rs256_algorithm")
            return None

        key_data = next((key for key in _cognito_jwks()["keys"] if key.get("kid") == key_id), None)
        if key_data is None:
            _cognito_jwks.cache_clear()
            key_data = next((key for key in _cognito_jwks()["keys"] if key.get("kid") == key_id), None)
        if key_data is None:
            _reject_cognito_token("signing_key_not_found_in_pool_jwks")
            return None

        # Use the library verifier for the JWK signature and registered claims.
        # verify_at_hash is disabled: Cognito ID tokens carry an at_hash claim
        # (a hash of the paired access token), and python-jose refuses to
        # verify it without that access token being passed in separately. We
        # never receive the access token here (frontend only forwards the ID
        # token), and at_hash is a supplementary cross-check on top of the
        # signature/issuer/audience/expiry verification already enforced
        # below — not required for trusting the ID token itself.
        claims = jwt.decode(
            token,
            key_data,
            algorithms=["RS256"],
            issuer=_cognito_issuer(),
            audience=settings.COGNITO_APP_CLIENT_ID if expected_token_use == "id" else None,
            options={"verify_aud": expected_token_use == "id", "verify_at_hash": False},
        )
        if claims.get("token_use") != expected_token_use:
            _reject_cognito_token("unexpected_token_use")
            return None

        client_claim = "client_id" if expected_token_use == "access" else "aud"
        if claims.get(client_claim) != settings.COGNITO_APP_CLIENT_ID:
            _reject_cognito_token("cognito_client_claim_mismatch")
            return None
        if not claims.get("sub"):
            _reject_cognito_token("missing_subject_claim")
            return None
        return claims
    except (JWTError, ValueError, requests.RequestException, TypeError) as exc:
        logger.info("Cognito token verification failed: %s", exc)
        return None
