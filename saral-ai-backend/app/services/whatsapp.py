"""
WhatsApp Service.
Integrates with Twilio WhatsApp API / Twilio Sandbox.
"""

import logging
from typing import Optional
from twilio.rest import Client
from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_post_call_summary(
    phone: str,
    summary: str,
    user_id: Optional[str] = None,
) -> bool:
    """
    Sends a post-call lead summary via Twilio WhatsApp API / Twilio Sandbox.

    Args:
        phone: E.164 formatted phone number (e.g., "+919876543210")
        summary: The lead summary / call notes to send.
        user_id: Optional owner user ID for routing / logging.

    Returns:
        True if the message was accepted for delivery, False otherwise.
    """
    logger.info(
        f"[WHATSAPP] Sending summary to {phone} (user_id={user_id}): {summary[:80]}..."
    )
    
    # Check if we have valid Twilio credentials configured
    if settings.TWILIO_ACCOUNT_SID and not settings.TWILIO_ACCOUNT_SID.startswith("ACplaceholder"):
        try:
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            
            # Format numbers for Twilio WhatsApp (prefixed with 'whatsapp:')
            from_number = settings.TWILIO_WHATSAPP_FROM
            if not from_number.startswith("whatsapp:"):
                from_number = f"whatsapp:{from_number}"
                
            to_number = phone
            if not to_number.startswith("whatsapp:"):
                to_number = f"whatsapp:{to_number}"
                
            # Send message asynchronously using threadpool to prevent blocking the event loop
            from fastapi.concurrency import run_in_threadpool
            
            def _send():
                return client.messages.create(
                    body=f"Saral AI Lead Summary:\n\n{summary}",
                    from_=from_number,
                    to=to_number
                )
                
            message = await run_in_threadpool(_send)
            logger.info(f"Twilio WhatsApp message sent successfully: SID {message.sid}")
            return True
        except Exception as e:
            logger.error(f"Failed to send Twilio WhatsApp message: {e}", exc_info=True)
            return False
            
    logger.info("[WHATSAPP PLACEHOLDER] Twilio credentials not configured. Message delivery simulated.")
    return True
