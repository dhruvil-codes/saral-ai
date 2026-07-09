#!/usr/bin/env python
"""
Local Testing Suite for Saral Voice AI Agent.
Directly connects to local FastAPI WebSocket to simulate user conversations and test features.
"""

import os
import sys
# Override print for Windows console encoding compatibility
_orig_print = print
def print(*args, **kwargs):
    try:
        _orig_print(*args, **kwargs)
    except UnicodeEncodeError:
        new_args = []
        for arg in args:
            if isinstance(arg, str):
                new_args.append(arg.encode(sys.stdout.encoding or 'cp1252', errors='replace').decode(sys.stdout.encoding or 'cp1252'))
            else:
                new_args.append(arg)
        _orig_print(*new_args, **kwargs)

import time
import json
import asyncio
import argparse
import uuid
import wave
import io
import re
from datetime import datetime, timezone, timedelta
import httpx
import websockets
from dotenv import load_dotenv

# Ensure we can load supabase client
try:
    from supabase import create_client, Client
except ImportError:
    print("Error: 'supabase' package is not installed. Please install it using pip.")
    sys.exit(1)

# Check if sentence-transformers is available
try:
    from sentence_transformers import SentenceTransformer
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False

# Load environment variables
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_KEY must be set in .env")
    sys.exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Lazy embedding model loader
_embedding_model = None

def get_embedding(text: str):
    global _embedding_model
    if not HAS_SENTENCE_TRANSFORMERS:
        raise RuntimeError("sentence-transformers is not installed, cannot generate embeddings.")
    if _embedding_model is None:
        print("Loading local SentenceTransformer model (all-MiniLM-L6-v2)...")
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    emb = _embedding_model.encode(text, convert_to_tensor=False, convert_to_numpy=True)
    import numpy as np
    norm = np.linalg.norm(emb)
    if norm > 0:
        emb = emb / norm
    return emb.tolist()


# ---------------------------------------------------------------------------
# TTS Audio Generation & PCM Extraction
# ---------------------------------------------------------------------------

async def generate_synthetic_audio(text: str, language_code: str = "en-IN") -> bytes:
    """Calls Sarvam TTS API to get audio bytes in WAV format."""
    if not SARVAM_API_KEY or SARVAM_API_KEY == "placeholder-sarvam-key":
        raise ValueError("SARVAM_API_KEY is not set or contains a placeholder. Cannot generate synthetic speech.")

    url = "https://api.sarvam.ai/text-to-speech"
    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json"
    }
    
    normalized_lang = "en-IN"
    if language_code.lower().startswith("hi"):
        normalized_lang = "hi-IN"
    elif language_code.lower().startswith("ta"):
        normalized_lang = "ta-IN"
    elif language_code.lower().startswith("te"):
        normalized_lang = "te-IN"
        
    payload = {
        "text": text,
        "model": "bulbul:v3",
        "speaker": "shruti",
        "target_language_code": normalized_lang,
        "pace": 1.0,
        "speech_sample_rate": 16000,
        "output_format": "wav"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        
    if response.status_code != 200:
        raise RuntimeError(f"Sarvam TTS failed: {response.status_code} - {response.text}")
        
    result = response.json()
    if "audios" not in result or not result["audios"]:
        raise RuntimeError("Sarvam TTS returned no audio data")
        
    import base64
    return base64.b64decode(result["audios"][0])


def extract_pcm_from_wav(wav_bytes: bytes) -> bytes:
    """Extracts raw PCM data from WAV bytes by stripping the header."""
    with wave.open(io.BytesIO(wav_bytes), "rb") as wav:
        return wav.readframes(wav.getnframes())


# ---------------------------------------------------------------------------
# HTTP Webhook & WebSocket Handlers
# ---------------------------------------------------------------------------

async def trigger_incoming_call(server_url: str, user_id: str, caller_number: str, language: str) -> dict:
    """Hits the incoming call webhook to register the call SID and retrieve the WS connection URL."""
    url = f"{server_url.rstrip('/')}/api/call/incoming?user_id={user_id}&language={language}"
    call_sid = str(uuid.uuid4())
    data = {
        "From": caller_number,
        "CallSid": call_sid,
        "CallStatus": "ringing"
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(url, data=data)
        
    if response.status_code != 200:
        raise RuntimeError(f"Incoming call webhook failed: {response.status_code} - {response.text}")
        
    twiml = response.text
    # Parse stream url (e.g. <Stream url="ws://localhost:8000/ws/call?language=..." />)
    match = re.search(r'<Stream url="([^"]+)"', twiml)
    if not match:
        raise RuntimeError(f"WebSocket URL not found in TwiML: {twiml}")
        
    ws_url = match.group(1)
    if ("localhost" in ws_url or "127.0.0.1" in ws_url) and ws_url.startswith("wss://"):
        ws_url = ws_url.replace("wss://", "ws://")
        
    return {"ws_url": ws_url, "call_id": call_sid}


async def run_turn(ws, text: str, language: str, stream_mode: bool = True, pause_duration_ms: int = 0, text_after_pause: str = ""):
    """
    Sends speech (streamed PCM or WAV container) and monitors response events.
    """
    if not stream_mode:
        audio_bytes = await generate_synthetic_audio(text, language)
        print(f"  [Client] Sending container WAV ({len(audio_bytes)} bytes) all at once...")
        send_time = time.perf_counter()
        await ws.send(audio_bytes)
    else:
        # Stream first utterance
        audio_bytes1 = await generate_synthetic_audio(text, language)
        pcm_bytes1 = extract_pcm_from_wav(audio_bytes1)
        
        chunk_size = 640  # 20ms of 16kHz 16-bit mono PCM (16000 * 2 * 0.02)
        pcm_chunks = [pcm_bytes1[i:i+chunk_size] for i in range(0, len(pcm_bytes1), chunk_size)]
        
        print(f"  [Client] Streaming speech: '{text}' ({len(pcm_chunks)} chunks)...")
        for chunk in pcm_chunks:
            if len(chunk) < chunk_size:
                chunk = chunk + b'\x00' * (chunk_size - len(chunk))
            await ws.send(chunk)
            await asyncio.sleep(0.02)
            
        # Pause simulation (send silence)
        if pause_duration_ms > 0 and text_after_pause:
            silence_chunks = pause_duration_ms // 20
            print(f"  [Client] Pausing for {pause_duration_ms}ms (sending {silence_chunks} silence chunks)...")
            for _ in range(silence_chunks):
                await ws.send(b'\x00' * chunk_size)
                await asyncio.sleep(0.02)
                
            # Stream second utterance after pause
            audio_bytes2 = await generate_synthetic_audio(text_after_pause, language)
            pcm_bytes2 = extract_pcm_from_wav(audio_bytes2)
            pcm_chunks2 = [pcm_bytes2[i:i+chunk_size] for i in range(0, len(pcm_bytes2), chunk_size)]
            
            print(f"  [Client] Streaming speech: '{text_after_pause}' ({len(pcm_chunks2)} chunks)...")
            for chunk in pcm_chunks2:
                if len(chunk) < chunk_size:
                    chunk = chunk + b'\x00' * (chunk_size - len(chunk))
                await ws.send(chunk)
                await asyncio.sleep(0.02)
                
        # Send trailing silence to trigger VAD on the server (VAD threshold is set to 2000ms in test user)
        # We send 2.2 seconds of silence to be safe
        print("  [Client] Sending trailing silence (2.2s) to trigger VAD...")
        for _ in range(110):
            await ws.send(b'\x00' * chunk_size)
            await asyncio.sleep(0.02)
            
        send_time = time.perf_counter()
        
    # Listen for response
    transcript = None
    tts_started = None
    tts_ended = None
    total_audio_bytes = 0
    
    print("  [Client] Waiting for response...")
    async for message in ws:
        if isinstance(message, str):
            data = json.loads(message)
            status = data.get("status")
            if status == "transcribed":
                transcript = data.get("text")
                stt_latency = (time.perf_counter() - send_time) * 1000
                print(f"    <- [Server] Transcribed: '{transcript}' (latency: {stt_latency:.1f}ms)")
            elif status == "tts_start":
                tts_started = time.perf_counter()
                ttfa = (tts_started - send_time) * 1000
                print(f"    <- [Server] TTS Stream Started (Time to First Audio - TTFA: {ttfa:.1f}ms)")
            elif status == "tts_end":
                tts_ended = time.perf_counter()
                total_latency = (tts_ended - send_time) * 1000
                print(f"    <- [Server] TTS Stream Finished. (Total latency: {total_latency:.1f}ms)")
                break
            elif "error" in data:
                print(f"    <- [Server] Error: {data['error']}")
                break
        elif isinstance(message, bytes):
            total_audio_bytes += len(message)
            
    return {
        "transcript": transcript,
        "audio_bytes": total_audio_bytes,
        "ttfa_ms": (tts_started - send_time) * 1000 if tts_started else None,
        "total_ms": (tts_ended - send_time) * 1000 if tts_ended else None
    }


# ---------------------------------------------------------------------------
# Supabase Fixtures Setup & Cleanup
# ---------------------------------------------------------------------------

async def db_setup_user(user_id: str, email: str, vad_threshold_ms: int = 1000):
    user_data = {
        "id": user_id,
        "email": email,
        "password_hash": "placeholder_hash",
        "business_name": "Local Test Business",
        "whatsapp_number": "+919999999999",
        "vad_threshold_ms": vad_threshold_ms,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    res = supabase.table("users").select("id").eq("id", user_id).execute()
    if res.data:
        supabase.table("users").update({"vad_threshold_ms": vad_threshold_ms}).eq("id", user_id).execute()
    else:
        supabase.table("users").insert(user_data).execute()


async def setup_faq_fixture(user_id: str, question: str, answer: str, age_days: int):
    """Inserts an FAQ record with an embedding and specified age."""
    print(f"Setting up FAQ fixture: '{question}' -> '{answer}' (age={age_days} days)...")
    if not HAS_SENTENCE_TRANSFORMERS:
        print("Warning: sentence-transformers not available. Cannot insert FAQ with embedding.")
        return None
        
    embedding = get_embedding(question)
    last_updated = (datetime.now(timezone.utc) - timedelta(days=age_days)).isoformat()
    
    faq_data = {
        "user_id": user_id,
        "question": question,
        "answer": answer,
        "embedding": embedding,
        "last_updated": last_updated,
        "needs_verification": False,
        "created_at": last_updated
    }
    res = supabase.table("faqs").insert(faq_data).execute()
    return res.data[0]["id"] if res.data else None


async def db_cleanup_user(user_id: str):
    print(f"Cleaning database fixtures for user {user_id}...")
    try:
        supabase.table("bookings").delete().eq("user_id", user_id).execute()
    except Exception as e:
        print(f"  Warning: Bookings deletion failed: {e}")
    try:
        supabase.table("faqs").delete().eq("user_id", user_id).execute()
    except Exception as e:
        print(f"  Warning: FAQs deletion failed: {e}")
    try:
        supabase.table("call_logs").delete().eq("user_id", user_id).execute()
    except Exception as e:
        print(f"  Warning: Call logs deletion failed: {e}")
    try:
        supabase.table("users").delete().eq("id", user_id).execute()
    except Exception as e:
        print(f"  Warning: Users deletion failed: {e}")


# ---------------------------------------------------------------------------
# Test Scenarios
# ---------------------------------------------------------------------------

async def test_hinglish_vad(server_url: str):
    """
    Scenario 1: The Hinglish VAD Test
    Verify that a 1.5-second silence pause in Hinglish speech is not cut off early
    when the VAD threshold is set to 2.0s (2000ms).
    """
    print("\n=== RUNNING: Scenario 1 - The Hinglish VAD Test ===")
    user_id = str(uuid.uuid4())
    caller_number = "+919876543210"
    
    try:
        # Create test user with VAD threshold 2000ms (2s)
        await db_setup_user(user_id, f"vad-{user_id}@test.com", vad_threshold_ms=2000)
        
        # Trigger call webhook to get WebSocket URL
        call_details = await trigger_incoming_call(server_url, user_id, caller_number, "hi-IN")
        
        # Connect to WebSocket
        async with websockets.connect(call_details["ws_url"]) as ws:
            # Stream: "Hi, mera appointment tha" -> 1.5s silence -> "kal subah 10 baje ka"
            result = await run_turn(
                ws, 
                text="Hi, mera appointment tha", 
                language="hi-IN",
                stream_mode=True, 
                pause_duration_ms=1500, 
                text_after_pause="kal subah 10 baje ka"
            )
            
            transcript = result.get("transcript", "")
            print(f"\nFinal Transcript returned: '{transcript}'")
            
            # Verify transcript has the components from both sentences (supports English and Devanagari)
            has_part1 = any(w in transcript.lower() for w in ["appointment", "appointment tha", "mera", "अपॉइंटमेंट", "अपोइंटमेंट", "मेरा"])
            has_part2 = any(w in transcript.lower() for w in ["kal", "subah", "10", "baje", "कल", "सुबह", "बजे"])
            
            if has_part1 and has_part2:
                print("✅ Hinglish VAD Test PASSED: Combined speech transcribed correctly without early cut-off!")
            else:
                print("❌ Hinglish VAD Test FAILED: Speech was cut off or not fully understood.")
                
    finally:
        await db_cleanup_user(user_id)


async def test_two_step_booking(server_url: str):
    """
    Scenario 2: The 2-Step Booking Test (Hallucination check)
    Verify that booking is held in pending, and only confirmed after explicit user verification.
    """
    print("\n=== RUNNING: Scenario 2 - The 2-Step Booking Test (Hallucination Check) ===")
    user_id = str(uuid.uuid4())
    caller_number = "+919876543211"
    
    try:
        await db_setup_user(user_id, f"booking-{user_id}@test.com")
        call_details = await trigger_incoming_call(server_url, user_id, caller_number, "en-IN")
        call_id = call_details["call_id"]
        
        async with websockets.connect(call_details["ws_url"]) as ws:
            # Turn 1: request booking
            res1 = await run_turn(ws, "I want to book an appointment for Tuesday at 9 AM.", "en-IN", stream_mode=False)
            print(f"AI response turn 1 details: audio={res1.get('audio_bytes')} bytes")
            
            # Check Supabase: slot must be held in 'pending' status
            bookings_res = supabase.table("bookings").select("*").eq("call_id", call_id).execute()
            if not bookings_res.data:
                print("❌ 2-Step Booking Test FAILED: Slot was not held in the database.")
                return
            
            booking = bookings_res.data[0]
            print(f"Database Check: Slot status is '{booking['status']}' (expected: 'pending')")
            if booking["status"] != "pending":
                print(f"❌ 2-Step Booking Test FAILED: Booking was confirmed immediately or status was '{booking['status']}'")
                return
                
            # Turn 2: confirm booking
            res2 = await run_turn(ws, "Yes, that's correct.", "en-IN", stream_mode=False)
            
            # Check Supabase: slot must now be 'confirmed'
            bookings_res2 = supabase.table("bookings").select("*").eq("call_id", call_id).execute()
            booking2 = bookings_res2.data[0]
            print(f"Database Check: Slot status is '{booking2['status']}' (expected: 'confirmed')")
            
            if booking2["status"] == "confirmed":
                print("✅ 2-Step Booking Test PASSED: Booking successfully verified and confirmed in database!")
            else:
                print(f"❌ 2-Step Booking Test FAILED: Booking status is '{booking2['status']}' after confirmation.")
                
    finally:
        await db_cleanup_user(user_id)


async def test_stale_faq(server_url: str):
    """
    Scenario 3: The Stale FAQ Test (RAG Freshness)
    Verify that when the RAG returns an FAQ older than 30 days containing pricing info,
    the AI appends a warning to verify it.
    """
    print("\n=== RUNNING: Scenario 3 - The Stale FAQ Test (RAG Freshness) ===")
    
    if not HAS_SENTENCE_TRANSFORMERS:
        print("❌ Cannot run Scenario 3: sentence-transformers is not installed.")
        print("Please install sentence-transformers in the virtual environment to enable FAQ embedding.")
        return

    user_id = str(uuid.uuid4())
    caller_number = "+919876543212"
    
    try:
        await db_setup_user(user_id, f"faq-{user_id}@test.com")
        
        # Setup stale FAQ fixture (40 days old)
        # Note: Must include pricing keywords (e.g. "₹500" or "price") to trigger warning
        await setup_faq_fixture(
            user_id=user_id,
            question="What is your consultation fee?",
            answer="The consultation fee is ₹500.",
            age_days=40
        )
        
        call_details = await trigger_incoming_call(server_url, user_id, caller_number, "en-IN")
        
        async with websockets.connect(call_details["ws_url"]) as ws:
            res = await run_turn(ws, "What is your consultation fee?", "en-IN", stream_mode=False)
            transcript = res.get("transcript", "")
            print(f"\nFinal AI Response: '{transcript}'")
            
            # Check for decay warning
            warning_words = ["verify", "owner", "might have changed", "listed as"]
            warning_triggered = any(word in transcript.lower() for word in warning_words)
            
            if warning_triggered:
                print("✅ Stale FAQ Test PASSED: AI correctly appended the verified-with-owner warning!")
            else:
                print("❌ Stale FAQ Test FAILED: AI did not include the RAG freshness warning.")
                
    finally:
        await db_cleanup_user(user_id)


async def test_mid_booking_drop(server_url: str):
    """
    Scenario 4: The Mid-Booking Drop Test
    Verify that forcefully closing the WebSocket with a pending booking triggers
    the recovery worker task.
    """
    print("\n=== RUNNING: Scenario 4 - The Mid-Booking Drop Test ===")
    user_id = str(uuid.uuid4())
    caller_number = "+919876543213"
    
    try:
        await db_setup_user(user_id, f"drop-{user_id}@test.com")
        call_details = await trigger_incoming_call(server_url, user_id, caller_number, "en-IN")
        call_id = call_details["call_id"]
        
        # Open WebSocket connection
        ws = await websockets.connect(call_details["ws_url"])
        
        # Send slot hold request
        res = await run_turn(ws, "Book a slot for Friday 2 PM.", "en-IN", stream_mode=False)
        print(f"AI response details: audio={res.get('audio_bytes')} bytes")
        
        # Verify slot is pending in Supabase
        bookings_res = supabase.table("bookings").select("*").eq("call_id", call_id).execute()
        if not bookings_res.data:
            print("❌ Mid-Booking Drop Test FAILED: Slot was not held.")
            await ws.close()
            return
            
        booking = bookings_res.data[0]
        print(f"Database Check: Held booking status is '{booking['status']}'")
        
        # Forcefully close connection (disconnect mid-flow)
        print("Forcefully closing WebSocket connection to simulate call drop...")
        await ws.close()
        
        # Wait for the backend background recovery task to execute
        print("Waiting 3 seconds for backend cleanup and recovery worker task...")
        await asyncio.sleep(3.0)
        
        # Re-check database booking to ensure it remains 'pending' (and hasn't expired or been deleted)
        bookings_res2 = supabase.table("bookings").select("*").eq("call_id", call_id).execute()
        if bookings_res2.data and bookings_res2.data[0]["status"] == "pending":
            print("Database Check: Slot remains 'pending'.")
            print("✅ Mid-Booking Drop Test PASSED: WebSocket closed gracefully, holding slot in pending status.")
            print("Note: Check the backend server terminal console logs to verify that send_dropped_call_recovery_whatsapp was triggered.")
        else:
            print("❌ Mid-Booking Drop Test FAILED: Slot status was modified or booking was deleted.")
            
    finally:
        await db_cleanup_user(user_id)


# ---------------------------------------------------------------------------
# Main Execution
# ---------------------------------------------------------------------------

async def main():
    parser = argparse.ArgumentParser(description="Local Voice AI Agent Test Bench.")
    parser.add_argument(
        "--test", 
        choices=["hinglish_vad", "booking", "faq", "drop", "all"], 
        default="all",
        help="Specify the test scenario to run."
    )
    parser.add_argument(
        "--server", 
        default="http://localhost:8000",
        help="URL of the local FastAPI backend (default: http://localhost:8000)."
    )
    args = parser.parse_args()

    # Perform health check on server
    print(f"Performing health check on local backend at {args.server}...")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{args.server}/health")
            if resp.status_code != 200 or resp.json().get("status") != "ok":
                print(f"Error: Server health check failed. Response: {resp.status_code} - {resp.text}")
                sys.exit(1)
            print("Health check successful. Server is healthy.")
    except Exception as e:
        print(f"Error: Cannot connect to server at {args.server}. Make sure the FastAPI app is running.")
        print("You can start it using: uvicorn app.main:app --reload")
        sys.exit(1)

    # Execute tests
    if args.test == "hinglish_vad":
        await test_hinglish_vad(args.server)
    elif args.test == "booking":
        await test_two_step_booking(args.server)
    elif args.test == "faq":
        await test_stale_faq(args.server)
    elif args.test == "drop":
        await test_mid_booking_drop(args.server)
    elif args.test == "all":
        print("\n==================================================")
        print("RUNNING ALL TEST SCENARIOS")
        print("==================================================")
        await test_hinglish_vad(args.server)
        await test_two_step_booking(args.server)
        await test_stale_faq(args.server)
        await test_mid_booking_drop(args.server)
        print("\n==================================================")
        print("TEST RUN COMPLETED")
        print("==================================================")

if __name__ == "__main__":
    asyncio.run(main())
