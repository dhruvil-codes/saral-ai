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


async def send_whatsapp_message(phone: str, body: str) -> bool:
    """
    Sends a generic text message via Twilio WhatsApp API / Twilio Sandbox.

    Args:
        phone: E.164 formatted phone number (e.g., "+919876543210")
        body: The text content of the message.

    Returns:
        True if the message was accepted for delivery, False otherwise.
    """
    logger.info(f"[WHATSAPP] Sending message to {phone}: {body[:80]}...")
    
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
                    body=body,
                    from_=from_number,
                    to=to_number
                )
                
            message = await run_in_threadpool(_send)
            logger.info(f"Twilio WhatsApp message sent successfully: SID {message.sid}")
            return True
        except Exception as e:
            logger.error(f"Failed to send Twilio WhatsApp message: {e}", exc_info=True)
            return False
            
    logger.info(f"[WHATSAPP PLACEHOLDER] Twilio credentials not configured. Simulated body:\n{body}")
    return True


async def send_case_card(to_number: str, case_data: dict) -> bool:
    """
    Formats the Stage 2 structured output into a clean, readable WhatsApp message
    and sends it via Twilio's WhatsApp API.

    Args:
        to_number: E.164 formatted phone number (e.g., "+919876543210")
        case_data: Dict containing structured triage data:
            caller_name, language, patient_type, complaint, urgency_level,
            requested_slot, recommended_action

    Returns:
        True if the message was accepted for delivery, False otherwise.
    """
    caller_name = case_data.get("caller_name") or "Unknown Patient"
    language = case_data.get("language") or "mixed"
    patient_type = case_data.get("patient_type") or "new"
    complaint = case_data.get("complaint") or "No complaint captured"
    urgency_level = case_data.get("urgency_level") or "routine"
    requested_slot = case_data.get("requested_slot") or "None requested"
    recommended_action = case_data.get("recommended_action") or "no_action"

    body = (
        "🏥 New Patient Case — Saral AI\n\n"
        f"Patient: {caller_name}\n"
        f"Language: {language}\n"
        f"Type: {patient_type}\n\n"
        f"Complaint: {complaint}\n"
        f"Urgency: {urgency_level}\n"
        f"Requested Slot: {requested_slot}\n\n"
        f"Recommended Action: {recommended_action}"
    )

    return await send_whatsapp_message(to_number, body)


