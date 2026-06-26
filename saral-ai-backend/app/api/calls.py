"""
Calls router.
Handles incoming call webhooks and retrieval of call history.
"""

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/call/incoming")
async def incoming_call(request: Request, user_id: str = None, language: str = "en-IN"):
    """
    Accepts incoming call webhook from Twilio or Exotel.
    Creates a new Call Log entry in Supabase and returns TwiML
    to direct the call media to our WebSocket.
    """
    logger.info(f"Incoming call webhook triggered: user_id={user_id}, language={language}")
    
    # 1. Parse incoming webhook request data (Twilio/Exotel send form-encoded data)
    try:
        form_data = await request.form()
    except Exception as e:
        logger.warning(f"Could not parse request form data: {e}. Reading JSON fallback.")
        try:
            form_data = await request.json()
        except Exception:
            form_data = {}
            
    caller_number = form_data.get("From", "unknown")
    call_sid = form_data.get("CallSid", form_data.get("call_id", f"tele-{datetime.now().timestamp()}"))
    call_status = form_data.get("CallStatus", form_data.get("status", "ringing"))
    
    # 2. Record initial call in Supabase call_logs table
    if user_id:
        try:
            supabase = get_supabase()
            call_log_data = {
                "id": call_sid,
                "user_id": user_id,
                "caller_number": caller_number,
                "status": "ongoing",
                "started_at": datetime.now(timezone.utc).isoformat()
            }
            supabase.table("call_logs").insert(call_log_data).execute()
            logger.info(f"Successfully recorded incoming call log {call_sid} for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to insert call log in Supabase: {e}", exc_info=True)
            
    # 3. Generate Twilio TwiML response to bridge call stream to our WebSocket
    host = request.headers.get("Host", "localhost:8000")
    protocol = "wss" if "localhost" not in host else "ws"
    
    # Construct the WebSockets URL, passing language, call_id (CallSid), and user_id
    ws_url = f"{protocol}://{host}/ws/call?language={language}"
    if user_id:
        ws_url += f"&user_id={user_id}"
    ws_url += f"&call_id={call_sid}"
    
    twiml_response = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="{ws_url}" />
    </Connect>
</Response>"""

    return Response(content=twiml_response, media_type="application/xml")
