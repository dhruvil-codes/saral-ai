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
