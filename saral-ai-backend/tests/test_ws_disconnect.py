"""
test_ws_disconnect.py — Real WebSocket disconnect integration test.

PURPOSE:
    This test verifies that the Stage 2 triage background task still completes
    and writes to the DB correctly even under a real WebSocket disconnect.
    It is NOT a simulation (unlike test_pipeline_wiring.py which calls
    run_stage2_triage_background directly).

HOW IT WORKS:
    1. Creates a call log in the DB with a unique call_id.
    2. Connects a real WebSocket client to the running backend server.
    3. Sends a small dummy audio chunk to trigger a turn (the server's STT/LLM
       pipeline will likely fail or return a fast response - that's fine).
    4. Abruptly closes the WebSocket connection (simulating client disconnect).
    5. Waits a few seconds for the background triage task to complete.
    6. Queries the DB and asserts the new dedicated columns are populated.

PREREQUISITES:
    - Backend server must be running: uvicorn app.main:app --port 8000
    - The migration 05_add_triage_columns_to_leads.sql must have been applied.

USAGE:
    python test_ws_disconnect.py
"""

import os
import sys
import asyncio
import uuid
import json
import time
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

try:
    import websockets
except ImportError:
    print("ERROR: 'websockets' package not found. Run: pip install websockets")
    sys.exit(1)

from app.db.supabase_client import get_supabase

BACKEND_URL = os.getenv("TEST_WS_URL", "ws://localhost:8000")
USER_ID = "7326aea2-7ba1-4862-9e99-595080cbdd35"


import pytest

@pytest.mark.asyncio
async def test_ws_disconnect():
    # Check Supabase credentials, skip if not set
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key or url == "placeholder-supabase-url" or key == "placeholder-supabase-key" or url == "placeholder" or key == "placeholder":
        pytest.skip("Supabase credentials not configured in environment")

    # Check if backend server is running, skip if not
    import httpx
    http_url = BACKEND_URL.replace("ws://", "http://").replace("wss://", "https://")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{http_url}/health", timeout=1.0)
            if resp.status_code != 200 or resp.json().get("status") != "ok":
                pytest.skip("Backend server not running or unhealthy. Skipping live test.")
    except Exception:
        pytest.skip("Backend server not running or unhealthy. Skipping live test.")

    print("=" * 60)
    print("Stage 2 Triage — Real WebSocket Disconnect Integration Test")
    print("=" * 60)

    supabase = get_supabase()
    call_id = str(uuid.uuid4())
    caller_number = "+918238712345"

    # 1. Pre-seed a call log with a known transcript so Stage 2 has content
    #    (The WS call handler picks up the transcript from conversation_history,
    #    but we seed the DB record first to satisfy FK constraints and so
    #    the finally-block upsert has something to update.)
    transcript = (
        "User: Hi, my name is Priya. I'm an existing patient. "
        "I have sharp chest pain since this morning and I'm very worried. "
        "Can I get an urgent slot today?\n"
        "Assistant: I understand, Priya. Let me check for an urgent slot. "
        "Yes, we have an opening at 11 AM today.\n"
        "User: Please book it.\n"
        "Assistant: Done, Priya. You're booked for 11 AM today."
    )

    print(f"\n[1] Inserting call log with call_id={call_id}...")
    supabase.table("call_logs").upsert({
        "id": call_id,
        "user_id": USER_ID,
        "caller_number": caller_number,
        "transcript": transcript,
        "summary": "Urgent chest pain patient requested same-day slot.",
        "status": "completed",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "ended_at": datetime.now(timezone.utc).isoformat(),
    }).execute()
    print("    Call log inserted.")

    # 2. Connect to WebSocket
    ws_url = f"{BACKEND_URL}/ws/call?language=en-IN&call_id={call_id}&user_id={USER_ID}"
    print(f"\n[2] Connecting WebSocket: {ws_url}")

    t0 = time.perf_counter()
    try:
        async with websockets.connect(ws_url, open_timeout=10) as ws:
            print("    Connected.")

            # 3. Send a tiny dummy audio chunk (< 100 bytes → triggers immediate STT path)
            dummy_audio = b"\x00" * 40
            await ws.send(dummy_audio)
            print("    Sent dummy audio chunk (40 bytes).")

            # Give the server ~300ms to accept the chunk, then disconnect abruptly
            await asyncio.sleep(0.3)
            print("    Closing connection abruptly (simulating client disconnect)...")
            # Close without waiting for server's close frame
            await ws.close()

    except Exception as e:
        print(f"    WebSocket error (may be expected after abrupt close): {e}")

    disconnect_time_ms = int((time.perf_counter() - t0) * 1000)
    print(f"    Disconnected after {disconnect_time_ms}ms.")

    # 4. Wait for background triage task to complete
    #    Stage 2 uses minimax-m3 via Fireworks AI (sync httpx, 15s timeout).
    #    We poll for up to 30 seconds.
    print("\n[3] Waiting for background triage task to write to DB (polling up to 30s)...")
    lead = None
    for attempt in range(30):
        await asyncio.sleep(1)
        res = supabase.table("leads").select("*").eq("call_log_id", call_id).execute()
        if res.data:
            lead = res.data[0]
            print(f"    Lead record found after {attempt + 1}s.")
            break
        if attempt % 5 == 4:
            print(f"    Still waiting... ({attempt + 1}s elapsed)")

    if not lead:
        print("\nFAILURE: Background task did NOT write a lead record within 30 seconds.")
        print("This indicates the task was garbage-collected or failed silently.")
        sys.exit(1)

    # 5. Assert dedicated triage columns are written
    print("\n[4] Asserting dedicated triage schema columns...")
    print(json.dumps(lead, indent=2))

    failures = []

    if not lead.get("urgency_level"):
        failures.append(f"urgency_level is NULL or empty: {lead.get('urgency_level')}")
    if not lead.get("patient_type"):
        failures.append(f"patient_type is NULL or empty: {lead.get('patient_type')}")
    if not lead.get("recommended_action"):
        failures.append(f"recommended_action is NULL or empty: {lead.get('recommended_action')}")
    if not lead.get("language"):
        failures.append(f"language is NULL or empty: {lead.get('language')}")
    if lead.get("budget") is not None:
        failures.append(f"budget should be NULL (was JSON blob hack), got: {lead.get('budget')!r}")
    if not lead.get("name"):
        failures.append(f"name is NULL or empty: {lead.get('name')}")
    if not lead.get("interest"):
        failures.append(f"interest/complaint is NULL or empty: {lead.get('interest')}")

    if failures:
        print("\nFAILURE -- The following assertions failed:")
        for f in failures:
            print(f"  [x] {f}")
        sys.exit(1)
    else:
        print("\nSUCCESS -- All assertions passed!")
        print(f"  [+] urgency_level      = {lead['urgency_level']}")
        print(f"  [+] patient_type       = {lead['patient_type']}")
        print(f"  [+] requested_slot     = {lead['requested_slot']}")
        print(f"  [+] recommended_action = {lead['recommended_action']}")
        print(f"  [+] language           = {lead['language']}")
        print(f"  [+] name               = {lead['name']}")
        print(f"  [+] budget             = {lead['budget']} (NULL, correctly omitted)")
        print("\nBackground task survived real WebSocket disconnect. [+]")


if __name__ == "__main__":
    asyncio.run(test_ws_disconnect())
