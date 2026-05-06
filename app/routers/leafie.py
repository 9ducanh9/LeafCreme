"""
Leafie router: Simple proxy endpoint for n8n webhook to avoid CORS issues
Backend chỉ làm proxy, logic AI nằm trong n8n
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import httpx
import os
from dotenv import load_dotenv
from pathlib import Path

# Ensure environment variables are loaded (fallback if main.py didn't load them)
# Try to find .env file in project root (parent of app directory)
env_path = Path(__file__).parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path, override=False)
else:
    # Fallback to default behavior (current directory)
    load_dotenv(override=False)


router = APIRouter(prefix="/leafie", tags=["leafie"])


class LeafieRequest(BaseModel):
    """Request model for Leafie chat"""
    message: str
    context: Optional[Dict[str, Any]] = None  # LeafieContext from frontend
    conversationHistory: Optional[List[Dict[str, Any]]] = None  # Conversation history
    sessionId: Optional[str] = None  # Session ID cho n8n memory (ưu tiên cao nhất)


@router.post("/ask")
async def ask_leafie(payload: LeafieRequest):
    """
    Simple proxy endpoint: Backend chỉ forward request đến n8n và trả về response.
    Logic AI nằm trong n8n workflow.
    """
    # Get n8n webhook URL from environment
    n8n_webhook_url = os.getenv("N8N_WEBHOOK_URL")
    
    if not n8n_webhook_url:
        raise HTTPException(
            status_code=503,
            detail="n8n webhook URL not configured. Please set N8N_WEBHOOK_URL environment variable in .env file."
        )
    
    # Validate URL format (must be production URL, not test)
    n8n_webhook_url = n8n_webhook_url.strip()
    if "webhook-test" in n8n_webhook_url:
        # Cho phép dùng URL test trong dev, nhưng không khuyến nghị ở production
        pass
    
    if not n8n_webhook_url.startswith("https://"):
        raise HTTPException(
            status_code=503,
            detail=f"Invalid n8n webhook URL format. Must start with https://. Got: {n8n_webhook_url[:50]}..."
        )
    
    try:
        # Build request body for n8n - forward ALL data
        n8n_payload: Dict[str, Any] = {
            "message": payload.message
        }
        
        # 🔑 Add sessionId for n8n memory (priority: sessionId > context.sessionId > 'leafie-default')
        # n8n sẽ dùng: $json.sessionId || $json.session_id || $json.user_id || 'leafie-default'
        if payload.sessionId:
            n8n_payload["sessionId"] = payload.sessionId
            n8n_payload["session_id"] = payload.sessionId  # Alternative key for n8n
        
        # Add context if provided
        if payload.context:
            n8n_payload["context"] = payload.context
        
        # Add conversation history if provided
        if payload.conversationHistory:
            n8n_payload["conversationHistory"] = payload.conversationHistory
        
        # Simple proxy: Forward request to n8n and return response
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                n8n_webhook_url,  # Already stripped
                json=n8n_payload,
                headers={"Content-Type": "application/json"}
            )
        
        if not response.is_success:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"n8n webhook error: {response.text[:200]}"
            )
        
        # Return n8n response directly (n8n handles all logic)
        try:
            data = response.json()
            return data
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Invalid response from n8n: {str(e)}"
            )
        
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="n8n webhook timeout. Please try again later."
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to connect to n8n webhook: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


