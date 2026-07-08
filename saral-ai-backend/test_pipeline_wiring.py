import os
import sys
import asyncio
import uuid
import json
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.supabase_client import get_supabase
from app.api.ws_call import run_stage2_triage_background

async def main():
    print("Starting Post-Call Stage 2 Triage Pipeline Integration Test...")
    supabase = get_supabase()
    
    # 1. Use existing user_id from the database
    user_id = "7326aea2-7ba1-4862-9e99-595080cbdd35"
    call_id = str(uuid.uuid4())
    caller_number = "+918238712345"
    
    transcript = """
User: Hello, my name is Amit Patel. I am a new patient. I have very severe lower back pain since yesterday evening and I cannot even sit down properly. Can you book me for tomorrow afternoon?
Assistant: Let me check the schedule for tomorrow. Yes, we have a slot at 3 PM.
User: Please book that for tomorrow at 3 PM.
Assistant: Sure Amit, I've booked it for you.
"""
    
    # 2. Insert call log first so that call_log_id foreign key constraint is satisfied
    print(f"Creating mock completed call log in DB for call_id={call_id}...")
    log_data = {
        "id": call_id,
        "user_id": user_id,
        "caller_number": caller_number,
        "transcript": transcript.strip(),
        "summary": "Patient requested booking for severe back pain.",
        "status": "completed",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "ended_at": datetime.now(timezone.utc).isoformat()
    }
    
    try:
        supabase.table("call_logs").upsert(log_data).execute()
        print("Mock call log created.")
    except Exception as e:
        print("Failed to create call log in DB:", e)
        return

    # 3. Trigger Stage 2 triage background task function directly
    print("Triggering Stage 2 triage background worker...")
    await run_stage2_triage_background(
        call_id=call_id,
        user_id=user_id,
        caller_number=caller_number,
        transcript=transcript.strip()
    )
    
    # 4. Query the leads table to verify insertion
    print("Fetching inserted lead from database...")
    try:
        res = supabase.table("leads").select("*").eq("call_log_id", call_id).execute()
        if res.data:
            lead = res.data[0]
            print("\nSUCCESS! Lead record captured in database:")
            print(json.dumps(lead, indent=2))
            
            # --- Assertions: mapped columns (unchanged) ---
            assert lead["name"] == "Amit Patel", \
                f"Expected 'Amit Patel', got {lead['name']}"
            assert lead["urgency"] == "same_day", \
                f"Expected 'same_day' urgency shorthand, got {lead['urgency']}"
            assert "back pain" in lead["interest"].lower(), \
                f"Expected complaint to contain 'back pain', got {lead['interest']}"
            
            # --- Assertions: dedicated triage schema columns (new, replacing budget hack) ---
            assert lead["urgency_level"] == "same_day", \
                f"Expected urgency_level='same_day', got {lead['urgency_level']}"
            assert lead["patient_type"] == "new", \
                f"Expected patient_type='new', got {lead['patient_type']}"
            assert lead["recommended_action"] in ["callback_now", "book_appointment"], \
                f"Unexpected recommended_action: {lead['recommended_action']}"
            assert lead["language"] is not None, \
                "Expected language to be populated"
            # requested_slot may be None (if not mentioned) or a string — just confirm it exists as a key
            assert "requested_slot" in lead, \
                "Expected 'requested_slot' key to exist in lead record"

            # --- Confirm budget is NO LONGER written (was the JSON blob hack) ---
            assert lead.get("budget") is None, \
                f"Expected 'budget' to be NULL (was JSON blob hack), got: {lead.get('budget')}"
            
            print("\nAll assertions passed!")
            print(f"\nNew dedicated columns:")
            print(f"  urgency_level     = {lead['urgency_level']}")
            print(f"  patient_type      = {lead['patient_type']}")
            print(f"  requested_slot    = {lead['requested_slot']}")
            print(f"  recommended_action= {lead['recommended_action']}")
            print(f"  language          = {lead['language']}")
        else:
            print("\nFAILURE: No lead record found for call_log_id =", call_id)
    except Exception as e:
        print("Error fetching lead from DB:", e)

if __name__ == "__main__":
    asyncio.run(main())
