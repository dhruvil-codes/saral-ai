"""
WhatsApp Service.
Placeholder for Meta Cloud API / Twilio Sandbox triggers.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)


async def send_post_call_summary(
    phone: str,
    summary: str,
    user_id: Optional[str] = None,
) -> bool:
    """
 sending a post-call lead summary via Meta Cloud API (WhatsApp)
    or Twilio WhatsApp Sandbox.

    TODO: 
        1. Integrate with Meta Cloud API (graph.facebook.com/v18.0/.../messages)
        2. OR integrate with Twilio WhatsApp API using Twilio client.
        3. Handle errors and retries.

    Args:
 phone: E.164 formatted phone number (e.g., "+919876543210")
        summary: The lead summary / call notes to send.
        user_id: Optional owner user ID for routing / logging.

    Returns:
        True if the message was accepted for delivery, False otherwise.
    """
    logger.info(
        f"[WHATSAPP PLACEHOLDER] Send summary to {phone} "
        f"(user_id={user_id}): {summary[:80]}..."
    )
    return True
