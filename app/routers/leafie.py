"""
Leafie router: Simple proxy endpoint for n8n webhook to avoid CORS issues
Backend chỉ làm proxy, logic AI nằm trong n8n
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import httpx
import os
import json
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path

# Ensure environment variables are loaded (fallback if main.py didn't load them)
# Try to find .env file in project root (parent of app directory)
env_path = Path(__file__).parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path, override=True)
else:
    # Fallback to default behavior (current directory)
    load_dotenv(override=True)


router = APIRouter(prefix="/leafie", tags=["leafie"])

LOG_PATH = r"c:\Leaf Crème\.cursor\debug.log"

def log_debug(location, message, data, hypothesis_id):
    """Write debug log in NDJSON format"""
    log_entry = {
        "id": f"log_{int(datetime.now().timestamp() * 1000)}",
        "timestamp": int(datetime.now().timestamp() * 1000),
        "location": location,
        "message": message,
        "data": data,
        "sessionId": "debug-session",
        "runId": "proxy-simple",
        "hypothesisId": hypothesis_id
    }
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry) + "\n")
    except Exception:
        pass


# #region agent log
env_keys_with_n8n = [k for k in os.environ.keys() if "N8N" in k.upper() or "WEBHOOK" in k.upper()]
n8n_url_value = os.getenv("N8N_WEBHOOK_URL")
log_debug("leafie.py:module_load", "Leafie router module loaded", {
    "n8n_url_env": "N8N_WEBHOOK_URL" in os.environ,
    "n8n_url_set": n8n_url_value is not None,
    "n8n_url_preview": n8n_url_value[:50] + "..." if n8n_url_value else None,
    "is_production_url": "webhook/Leafie" in (n8n_url_value or ""),
    "is_test_url": "webhook-test" in (n8n_url_value or ""),
    "all_env_keys": env_keys_with_n8n
}, "A")
# #endregion


class LeafieRequest(BaseModel):
    """Request model for Leafie chat"""
    message: str
    context: Optional[Dict[str, Any]] = None  # LeafieContext from frontend
    conversationHistory: Optional[List[Dict[str, Any]]] = None  # Conversation history


@router.post("/ask")
async def ask_leafie(payload: LeafieRequest):
    """
    Simple proxy endpoint: Backend chỉ forward request đến n8n và trả về response.
    Logic AI nằm trong n8n workflow.
    """
    # FORCE reload dotenv FIRST - this is the fix
    current_file = Path(__file__).resolve()
    project_root = current_file.parent.parent.parent
    env_path = project_root / ".env"
    
    # #region agent log
    log_debug("leafie.py:ask_leafie:FORCE_RELOAD", "FORCE RELOAD DOTENV - NEW CODE", {
        "version": "v3_force_reload",
        "env_path": str(env_path),
        "env_exists": env_path.exists(),
        "message_length": len(payload.message),
        "before_reload": "N8N_WEBHOOK_URL" in os.environ
    }, "B")
    # #endregion
    
    # ALWAYS reload dotenv FIRST - this is the fix
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=True)
    else:
        load_dotenv(override=True)
    
    # Get n8n webhook URL from environment (after reload)
    n8n_webhook_url = os.getenv("N8N_WEBHOOK_URL")
    
    # #region agent log
    log_debug("leafie.py:ask_leafie:after_reload", "After reload dotenv", {
        "env_path": str(env_path),
        "env_exists": env_path.exists(),
        "n8n_url_found": n8n_webhook_url is not None,
        "in_environ": "N8N_WEBHOOK_URL" in os.environ,
        "url_preview": n8n_webhook_url[:50] + "..." if n8n_webhook_url else None
    }, "C")
    # #endregion
    
    # #region agent log
    log_debug("leafie.py:ask_leafie:after_getenv", "After os.getenv", {
        "n8n_webhook_url": n8n_webhook_url[:60] + "..." if n8n_webhook_url and len(n8n_webhook_url) > 60 else n8n_webhook_url,
        "n8n_webhook_url_is_none": n8n_webhook_url is None,
        "in_environ": "N8N_WEBHOOK_URL" in os.environ,
        "environ_value": os.environ.get("N8N_WEBHOOK_URL", "NOT_FOUND")[:60] + "..." if os.environ.get("N8N_WEBHOOK_URL") and len(os.environ.get("N8N_WEBHOOK_URL", "")) > 60 else os.environ.get("N8N_WEBHOOK_URL", "NOT_FOUND")
    }, "C")
    # #endregion
    
    # #region agent log
    log_debug("leafie.py:ask_leafie:url_check", "Checking n8n URL after reload", {
        "has_n8n_url": n8n_webhook_url is not None,
        "has_n8n_url_in_env": "N8N_WEBHOOK_URL" in os.environ,
        "url_length": len(n8n_webhook_url) if n8n_webhook_url else 0,
        "url_preview": n8n_webhook_url[:60] + "..." if n8n_webhook_url and len(n8n_webhook_url) > 60 else n8n_webhook_url,
        "is_production": "webhook/Leafie" in (n8n_webhook_url or ""),
        "is_test": "webhook-test" in (n8n_webhook_url or ""),
        "env_path_exists": env_path.exists(),
        "env_path": str(env_path),
        "all_env_vars_after": {k: "***" for k in os.environ.keys() if "N8N" in k.upper() or "WEBHOOK" in k.upper()}
    }, "C")
    # #endregion
    
    if not n8n_webhook_url:
        # #region agent log
        log_debug("leafie.py:ask_leafie:no_url", "No n8n URL found after reload", {
            "env_keys": list(os.environ.keys()),
            "dotenv_loaded": True
        }, "C")
        # #endregion
        raise HTTPException(
            status_code=503,
            detail="n8n webhook URL not configured. Please set N8N_WEBHOOK_URL environment variable in .env file."
        )
    
    # Validate URL format (must be production URL, not test)
    n8n_webhook_url = n8n_webhook_url.strip()
    if "webhook-test" in n8n_webhook_url:
        # #region agent log
        log_debug("leafie.py:ask_leafie:test_url_warning", "Using test URL (should be production)", {
            "url": n8n_webhook_url
        }, "C")
        # #endregion
    
    if not n8n_webhook_url.startswith("https://"):
        raise HTTPException(
            status_code=503,
            detail=f"Invalid n8n webhook URL format. Must start with https://. Got: {n8n_webhook_url[:50]}..."
        )
    
    try:
        # #region agent log
        log_debug("leafie.py:ask_leafie:before_fetch", "About to call n8n webhook", {
            "url": n8n_webhook_url[:70] + "..." if len(n8n_webhook_url) > 70 else n8n_webhook_url,
            "message_length": len(payload.message),
            "url_is_production": "webhook/Leafie" in n8n_webhook_url
        }, "C")
        # #endregion
        
        # Build request body for n8n - forward ALL data
        n8n_payload: Dict[str, Any] = {
            "message": payload.message
        }
        
        # Add context if provided
        if payload.context:
            n8n_payload["context"] = payload.context
        
        # Add conversation history if provided
        if payload.conversationHistory:
            n8n_payload["conversationHistory"] = payload.conversationHistory
        
        # #region agent log
        log_debug("leafie.py:ask_leafie:payload", "Forwarding to n8n", {
            "has_message": "message" in n8n_payload,
            "has_context": "context" in n8n_payload,
            "has_history": "conversationHistory" in n8n_payload,
            "history_length": len(payload.conversationHistory) if payload.conversationHistory else 0,
            "context_has_products": "allProducts" in (payload.context or {}),
        }, "D")
        # #endregion
        
        # Simple proxy: Forward request to n8n and return response
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                n8n_webhook_url,  # Already stripped
                json=n8n_payload,
                headers={"Content-Type": "application/json"}
            )
        
        # #region agent log
        log_debug("leafie.py:ask_leafie:after_fetch", "n8n response received", {
            "status_code": response.status_code,
            "response_length": len(response.text) if response.text else 0
        }, "C")
        # #endregion
        
        if not response.is_success:
            # #region agent log
            log_debug("leafie.py:ask_leafie:error_status", "n8n returned error status", {
                "status_code": response.status_code,
                "error_text": response.text[:200] if response.text else None
            }, "C")
            # #endregion
            raise HTTPException(
                status_code=response.status_code,
                detail=f"n8n webhook error: {response.text[:200]}"
            )
        
        # Return n8n response directly (n8n handles all logic)
        try:
            data = response.json()
            # #region agent log
            log_debug("leafie.py:ask_leafie:parse_success", "Response parsed successfully", {
                "response_keys": list(data.keys()) if isinstance(data, dict) else "not_dict"
            }, "C")
            # #endregion
            return data
        except Exception as e:
            # #region agent log
            log_debug("leafie.py:ask_leafie:parse_error", "Failed to parse JSON", {
                "error": str(e),
                "response_preview": response.text[:200] if response.text else None
            }, "C")
            # #endregion
            raise HTTPException(
                status_code=500,
                detail=f"Invalid response from n8n: {str(e)}"
            )
        
    except httpx.TimeoutException:
        # #region agent log
        log_debug("leafie.py:ask_leafie:timeout", "n8n request timeout", {"timeout": 30}, "C")
        # #endregion
        raise HTTPException(
            status_code=504,
            detail="n8n webhook timeout. Please try again later."
        )
    except httpx.RequestError as e:
        # #region agent log
        log_debug("leafie.py:ask_leafie:request_error", "n8n request error", {
            "error": str(e),
            "error_type": type(e).__name__
        }, "C")
        # #endregion
        raise HTTPException(
            status_code=502,
            detail=f"Failed to connect to n8n webhook: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        # #region agent log
        log_debug("leafie.py:ask_leafie:unexpected_error", "Unexpected error", {
            "error": str(e),
            "error_type": type(e).__name__
        }, "C")
        # #endregion
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


