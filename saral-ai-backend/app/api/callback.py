"""
Callback router.
Handles webhook callbacks from Twilio for call status updates and XML responses.
"""

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Request, Response, Form
from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/callback/whatsapp")
async def whatsapp_webhook(
    request: Request,
    From: str = Form(...),
    Body: str = Form(...)
):
    """
    Webhook callback from Twilio for WhatsApp messages.
    If the user replies YES, updates the pending booking to confirmed.
    """
    logger.info(f"WhatsApp webhook received: From={From}, Body={Body}")
    
    # Check if the user replied YES (case-insensitive)
    cleaned_body = Body.strip().upper()
    if cleaned_body == "YES":
        # Extract sender phone number from "whatsapp:+919820123456" -> "+919820123456"
        sender_phone = From.replace("whatsapp:", "").strip()
        logger.info(f"User confirmed booking via WhatsApp. Phone: {sender_phone}")
        
        try:
            supabase = get_supabase()
            
            # Find any bookings that are still status = 'pending' and expires_at > now()
            now_iso = datetime.now(timezone.utc).isoformat()
            
            # Fetch all pending bookings
            bookings_res = supabase.table("bookings")\
                .select("id, slot_datetime, user_id, call_id, status, expires_at")\
                .eq("status", "pending")\
                .gt("expires_at", now_iso)\
                .execute()
            
            confirmed_any = False
            if bookings_res.data:
                for booking in bookings_res.data:
                    call_id = booking.get("call_id")
                    if call_id:
                        # Query call log to check if caller number matches
                        call_res = supabase.table("call_logs").select("caller_number").eq("id", call_id).execute()
                        if call_res.data:
                            db_phone = call_res.data[0].get("caller_number", "").strip()
                            # Perform direct match or trailing 10 digit match
                            if db_phone == sender_phone or db_phone.endswith(sender_phone[-10:]) or sender_phone.endswith(db_phone[-10:]):
                                # Update booking to confirmed and clear expires_at
                                update_res = supabase.table("bookings")\
                                    .update({"status": "confirmed", "expires_at": None})\
                                    .eq("id", booking["id"])\
                                    .execute()
                                
                                if update_res.data:
                                    logger.info(f"Successfully confirmed booking {booking['id']} via WhatsApp YES reply.")
                                    confirmed_any = True
                                    
            if confirmed_any:
                # Return a TwiML response to reply back to the user
                twiml_reply = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>Thank you! Your booking has been successfully confirmed.</Message>
</Response>"""
                return Response(content=twiml_reply, media_type="application/xml")
            else:
                logger.warning(f"No pending booking found for phone {sender_phone} to confirm.")
                twiml_reply = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>Sorry, we could not find any active pending booking slot for you. It might have expired.</Message>
</Response>"""
                return Response(content=twiml_reply, media_type="application/xml")
                
        except Exception as e:
            logger.error(f"Error handling WhatsApp YES reply: {e}", exc_info=True)
            return Response(status_code=500, content="Internal Server Error")
            
    # Default response for other messages
    return Response(content="""<?xml version="1.0" encoding="UTF-8"?>
<Response/>""", media_type="application/xml")
