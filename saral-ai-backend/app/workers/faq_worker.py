import asyncio
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter
from app.db.supabase_client import get_supabase
from app.services.whatsapp import send_whatsapp_message

logger = logging.getLogger(__name__)
router = APIRouter()

async def audit_knowledge_base():
    """
    Audits the faqs table for entries older than 30 days that have not
    yet been verified. Triggers WhatsApp message alerts to business owners.
    """
    logger.info("FAQ Worker: Starting knowledge base audit...")
    supabase = get_supabase()
    
    # 30 days ago cutoff
    cutoff_time = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    
    try:
        # Fetch FAQs older than 30 days where needs_verification is false
        # We also select the owner's whatsapp_number from the users relation
        response = supabase.table("faqs")\
            .select("id, question, answer, user_id, last_updated, needs_verification, users(whatsapp_number)")\
            .lt("last_updated", cutoff_time)\
            .eq("needs_verification", False)\
            .execute()
            
        faqs_to_verify = response.data or []
        logger.info(f"FAQ Worker: Found {len(faqs_to_verify)} stale FAQs requiring verification.")
        
        for faq in faqs_to_verify:
            faq_id = faq["id"]
            question = faq["question"]
            answer = faq["answer"]
            
            # Retrieve owner phone number from joined users data
            users_data = faq.get("users")
            owner_phone = None
            if isinstance(users_data, dict):
                owner_phone = users_data.get("whatsapp_number")
            elif isinstance(users_data, list) and len(users_data) > 0:
                owner_phone = users_data[0].get("whatsapp_number")
                
            if not owner_phone:
                logger.warning(f"FAQ Worker: No whatsapp_number configured for user {faq['user_id']} of FAQ {faq_id}")
                continue
                
            # Construct standard WhatsApp notification
            message_body = (
                f"Hi! Saral AI noticed this FAQ is over 30 days old: "
                f"'{question}' -> '{answer}'. "
                f"Is this still accurate? Reply YES to confirm, or log into your dashboard to update it."
            )
            
            # Dispatch Twilio notification
            success = await send_whatsapp_message(owner_phone, message_body)
            if success:
                # Mark needs_verification to true to avoid duplicate spamming
                update_resp = supabase.table("faqs")\
                    .update({"needs_verification": True})\
                    .eq("id", faq_id)\
                    .execute()
                logger.info(f"FAQ Worker: Flagged needs_verification=True for FAQ {faq_id}. DB Update: {bool(update_resp.data)}")
            else:
                logger.error(f"FAQ Worker: Failed to send WhatsApp notification for FAQ {faq_id}")
                
    except Exception as e:
        logger.error(f"FAQ Worker: Error during knowledge base audit: {e}", exc_info=True)


async def faq_scheduler_loop():
    """
    Infinite loop running in the background to trigger audit check daily.
    """
    logger.info("FAQ Worker: Starting daily scheduler loop...")
    while True:
        try:
            await audit_knowledge_base()
        except Exception as e:
            logger.error(f"FAQ Worker: Error in scheduler loop iteration: {e}", exc_info=True)
        # Sleep for 24 hours (86400 seconds)
        await asyncio.sleep(86400)


@router.post("/jobs/faq-verify")
async def trigger_faq_verify_job():
    """
    API endpoint to manually trigger verification audit on-demand.
    """
    logger.info("FAQ Worker: Manual trigger received via API.")
    asyncio.create_task(audit_knowledge_base())
    return {"status": "Job triggered in background"}
