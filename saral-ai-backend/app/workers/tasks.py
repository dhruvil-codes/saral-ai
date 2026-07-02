"""
Celery Workers Tasks.
Defines background tasks for asynchronous processing (e.g., lead extraction, sending notifications).
"""

import logging
from app.services.whatsapp import send_whatsapp_message

logger = logging.getLogger(__name__)

async def send_dropped_call_recovery_whatsapp(phone: str) -> bool:
    """
    Worker task to handle dropped-call recovery by sending a WhatsApp message.
    """
    logger.info(f"Worker task triggered: send_dropped_call_recovery_whatsapp for {phone}")
    body = (
        "Hi, it looks like we got cut off! Your appointment slot is held for the next 10 minutes. "
        "Reply 'YES' to confirm this booking, or let us know if you need a different time."
    )
    return await send_whatsapp_message(phone, body)


async def send_emergency_callback_whatsapp(caller_number: str) -> bool:
    """
    Worker task to alert the business owner of an emergency due to LLM failure.
    """
    logger.info(f"Worker task triggered: send_emergency_callback_whatsapp for {caller_number}")
    try:
        from app.db.supabase_client import get_supabase
        supabase = get_supabase()
        
        # Look up the latest call log for this caller to identify user_id (business owner)
        log_res = supabase.table("call_logs")\
            .select("user_id")\
            .eq("caller_number", caller_number)\
            .order("started_at", desc=True)\
            .limit(1)\
            .execute()
            
        if not log_res.data or not log_res.data[0].get("user_id"):
            logger.error(f"No call log found for caller {caller_number} to identify user_id.")
            return False
            
        user_id = log_res.data[0]["user_id"]
        
        # Look up owner's whatsapp_number from users table
        user_res = supabase.table("users").select("whatsapp_number").eq("id", user_id).execute()
        if not user_res.data or not user_res.data[0].get("whatsapp_number"):
            logger.error(f"No whatsapp_number found for owner user_id {user_id}")
            return False
            
        owner_number = user_res.data[0]["whatsapp_number"]
        
        body = (
            f"🚨 URGENT: A customer ({caller_number}) just tried calling, but our AI voice engine "
            f"is experiencing technical issues. Please call them back immediately!"
        )
        return await send_whatsapp_message(owner_number, body)
    except Exception as e:
        logger.error(f"Failed to send emergency WhatsApp alert: {e}", exc_info=True)
        return False

