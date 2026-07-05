import asyncio
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter
from app.db.supabase_client import get_supabase
from app.services.whatsapp import send_whatsapp_message

logger = logging.getLogger(__name__)
router = APIRouter()

# IST timezone (UTC + 5:30)
IST = timezone(timedelta(hours=5, minutes=30))

def get_seconds_until_8pm_ist() -> float:
    """
    Calculates the number of seconds from the current time until the next 8:00 PM IST.
    """
    now = datetime.now(timezone.utc).astimezone(IST)
    target = now.replace(hour=20, minute=0, second=0, microsecond=0)
    if now >= target:
        target += timedelta(days=1)
    return (target - now).total_seconds()

async def run_daily_digest():
    """
    Queries all successful bookings and standard calls for the day
    for users who have 'urgent_only' or 'digest' notification preferences.
    Formats and sends a consolidated WhatsApp message via Twilio.
    """
    logger.info("Daily Digest Job: Starting daily digest run...")
    supabase = get_supabase()
    
    # Calculate start of current day in IST (12:00 AM IST)
    now_ist = datetime.now(timezone.utc).astimezone(IST)
    start_of_day_ist = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
    start_time_iso = start_of_day_ist.astimezone(timezone.utc).isoformat()
    
    try:
        # Fetch users with notification_preference in ['urgent_only', 'digest']
        users_res = supabase.table("users")\
            .select("id, whatsapp_number, notification_preference")\
            .in_("notification_preference", ["urgent_only", "digest"])\
            .execute()
            
        users = users_res.data or []
        logger.info(f"Daily Digest Job: Found {len(users)} users with urgent_only or digest preferences.")
        
        for user in users:
            user_id = user["id"]
            whatsapp_number = user.get("whatsapp_number")
            if not whatsapp_number:
                logger.warning(f"Daily Digest Job: No whatsapp_number configured for user {user_id}")
                continue
                
            # Count successful bookings today (created_at >= start_time_iso and status = 'confirmed')
            bookings_res = supabase.table("bookings")\
                .select("id")\
                .eq("user_id", user_id)\
                .eq("status", "confirmed")\
                .gte("created_at", start_time_iso)\
                .execute()
            count = len(bookings_res.data or [])
            
            # Count call logs today (started_at >= start_time_iso)
            calls_res = supabase.table("call_logs")\
                .select("id")\
                .eq("user_id", user_id)\
                .gte("started_at", start_time_iso)\
                .execute()
            total_calls = len(calls_res.data or [])
            
            # inquiries = calls that did not result in a confirmed booking
            missed_count = max(0, total_calls - count)
            
            body = (
                f"Saral AI Daily Digest 📊: You had {count} successful bookings today and {missed_count} inquiries. "
                f"Log into your dashboard to view the full details."
            )
            
            logger.info(f"Daily Digest Job: Sending digest to {whatsapp_number} for user {user_id}. Bookings: {count}, Inquiries: {missed_count}")
            await send_whatsapp_message(whatsapp_number, body)
            
    except Exception as e:
        logger.error(f"Daily Digest Job: Error during digest execution: {e}", exc_info=True)

async def daily_digest_scheduler_loop():
    """
    Infinite loop running in the background to trigger daily digest daily at 8:00 PM IST.
    """
    logger.info("Daily Digest Scheduler: Starting daily digest loop...")
    while True:
        try:
            seconds_to_sleep = get_seconds_until_8pm_ist()
            logger.info(f"Daily Digest Scheduler: Sleeping for {seconds_to_sleep:.2f} seconds until 8:00 PM IST.")
            await asyncio.sleep(seconds_to_sleep)
            # Run the daily digest
            await run_daily_digest()
        except asyncio.CancelledError:
            logger.info("Daily Digest Scheduler: Cancelled.")
            break
        except Exception as e:
            logger.error(f"Daily Digest Scheduler: Error in loop iteration: {e}", exc_info=True)
            # Prevent rapid looping in case of immediate errors
            await asyncio.sleep(60)

@router.post("/jobs/daily-digest")
async def trigger_daily_digest_job():
    """
    API endpoint to manually trigger the daily digest audit on-demand.
    """
    logger.info("Daily Digest Job: Manual trigger received via API.")
    asyncio.create_task(run_daily_digest())
    return {"status": "Daily digest job triggered in background"}
