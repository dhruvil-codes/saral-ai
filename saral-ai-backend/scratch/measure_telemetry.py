#!/usr/bin/env python
"""
Measurement-only script: captures sentence_telemetry fields for a single call
using the "Tell me what things you can do for me" query.

Usage:
    cd d:\\saral-ai\\saral-ai-backend
    .venv\\Scripts\\python.exe scratch\\measure_telemetry.py
"""

import os
import sys
import time
import json
import asyncio
import uuid
import wave
import io
import re
from datetime import datetime, timezone

import httpx
import websockets
from dotenv import load_dotenv

# ── Load env ──────────────────────────────────────────────────────────────────
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SERVER_URL = "http://localhost:8000"

from supabase import create_client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── TTS helpers ───────────────────────────────────────────────────────────────
async def generate_sarvam_audio(text: str, lang: str = "en-IN") -> bytes:
    url = "https://api.sarvam.ai/text-to-speech"
    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "text": text,
        "model": "bulbul:v3",
        "speaker": "shruti",
        "target_language_code": lang,
        "pace": 1.0,
        "speech_sample_rate": 16000,
        "output_format": "wav",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, headers=headers, json=payload)
    if resp.status_code != 200:
        raise RuntimeError(f"Sarvam TTS: {resp.status_code} {resp.text}")
    import base64
    return base64.b64decode(resp.json()["audios"][0])


def pcm_from_wav(wav_bytes: bytes) -> bytes:
    with wave.open(io.BytesIO(wav_bytes), "rb") as w:
        return w.readframes(w.getnframes())


# ── DB helpers ────────────────────────────────────────────────────────────────
def setup_user(user_id: str):
    email = f"telemetry-{user_id}@test.local"
    res = supabase.table("users").select("id").eq("id", user_id).execute()
    if res.data:
        supabase.table("users").update({"vad_threshold_ms": 1000}).eq("id", user_id).execute()
    else:
        supabase.table("users").insert({
            "id": user_id,
            "email": email,
            "password_hash": "placeholder_hash",
            "business_name": "Telemetry Test Biz",
            "whatsapp_number": "+919999999999",
            "vad_threshold_ms": 1000,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    print(f"[DB] User {user_id} ready")


def cleanup_user(user_id: str):
    for table, col in [("bookings", "user_id"), ("faqs", "user_id"),
                        ("call_logs", "user_id"), ("users", "id")]:
        try:
            supabase.table(table).delete().eq(col, user_id).execute()
        except Exception:
            pass
    print(f"[DB] Cleaned up user {user_id}")


async def trigger_call(user_id: str) -> dict:
    call_sid = str(uuid.uuid4())
    url = f"{SERVER_URL}/api/call/incoming?user_id={user_id}&language=en-IN"
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, data={
            "From": "+919876540000",
            "CallSid": call_sid,
            "CallStatus": "ringing",
        })
    if resp.status_code != 200:
        raise RuntimeError(f"incoming call webhook failed: {resp.status_code} {resp.text}")
    twiml = resp.text
    match = re.search(r'<Stream url="([^"]+)"', twiml)
    if not match:
        raise RuntimeError(f"No WS URL in TwiML: {twiml}")
    ws_url = match.group(1)
    if ("localhost" in ws_url or "127.0.0.1" in ws_url) and ws_url.startswith("wss://"):
        ws_url = ws_url.replace("wss://", "ws://")
    return {"ws_url": ws_url, "call_sid": call_sid}


# ── Main measurement run ──────────────────────────────────────────────────────
async def run_measurement():
    print("\n" + "=" * 60)
    print("TELEMETRY MEASUREMENT RUN")
    print(f"Query: \"Tell me what things you can do for me\"")
    print("=" * 60)

    # 1. Health check
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{SERVER_URL}/health")
            assert r.status_code == 200 and r.json().get("status") == "ok"
        print("[OK] Server is healthy at", SERVER_URL)
    except Exception as e:
        print(f"[FAIL] Server not reachable at {SERVER_URL}: {e}")
        print("Start it with: uvicorn app.main:app --reload")
        sys.exit(1)

    user_id = str(uuid.uuid4())
    setup_user(user_id)

    try:
        call_info = await trigger_call(user_id)
        ws_url = call_info["ws_url"]
        print(f"[OK] Call triggered. WebSocket: {ws_url}")

        QUERY = "Tell me what things you can do for me"
        language = "en-IN"

        # Generate PCM audio for the query
        print(f"\n[TTS] Generating synthetic audio for: \"{QUERY}\"")
        wav_bytes = await generate_sarvam_audio(QUERY, language)
        pcm = pcm_from_wav(wav_bytes)
        print(f"[TTS] Got {len(pcm)} PCM bytes ({len(pcm) / 32000:.2f}s of audio)")

        CHUNK = 640  # 20 ms of 16kHz 16-bit mono
        chunks = [pcm[i:i+CHUNK] for i in range(0, len(pcm), CHUNK)]

        tts_start_wall = None
        tts_end_wall = None
        sent_at = None
        total_audio_bytes = 0

        async with websockets.connect(ws_url, max_size=None) as ws:
            print("[WS] Connected. Draining welcome message...")

            # Drain welcome message
            welcome_timeout = time.perf_counter() + 20
            async for msg in ws:
                if isinstance(msg, str):
                    d = json.loads(msg)
                    if d.get("status") == "tts_end":
                        break
                if time.perf_counter() > welcome_timeout:
                    print("[WARN] Welcome message timed out — proceeding anyway")
                    break

            print(f"[WS] Welcome done. Streaming {len(chunks)} query audio chunks...")

            for i, chunk in enumerate(chunks):
                if len(chunk) < CHUNK:
                    chunk = chunk + b'\x00' * (CHUNK - len(chunk))
                await ws.send(chunk)
                await asyncio.sleep(0.02)

            # Trailing silence (1.2s) to trigger VAD
            print("[WS] Sending trailing silence (1.2s) to trigger VAD end...")
            for _ in range(60):
                await ws.send(b'\x00' * CHUNK)
                await asyncio.sleep(0.02)

            sent_at = time.perf_counter()
            print(f"[WS] Audio fully sent at {datetime.now(timezone.utc).isoformat()}")
            print("[WS] Listening for server response events...")

            # Listen and capture
            response_timeout = time.perf_counter() + 60
            async for msg in ws:
                if isinstance(msg, bytes):
                    total_audio_bytes += len(msg)
                elif isinstance(msg, str):
                    d = json.loads(msg)
                    status = d.get("status")
                    if status == "transcribed":
                        print(f"  [<-] transcribed: '{d.get('text')}'")
                    elif status == "tts_start":
                        tts_start_wall = time.perf_counter()
                        ms = int((tts_start_wall - sent_at) * 1000)
                        print(f"  [<-] tts_start   client_ttfa={ms} ms")
                    elif status == "tts_end":
                        tts_end_wall = time.perf_counter()
                        ms_total = int((tts_end_wall - sent_at) * 1000)
                        print(f"  [<-] tts_end     client_total={ms_total} ms  audio_bytes={total_audio_bytes}")
                        break
                    elif "error" in d:
                        print(f"  [<-] ERROR: {d['error']}")
                        break
                if time.perf_counter() > response_timeout:
                    print("[WARN] 60s response timeout reached")
                    break

    finally:
        cleanup_user(user_id)

    # ── Report ────────────────────────────────────────────────────────────────
    print()
    print("=" * 60)
    print("CLIENT-SIDE MEASUREMENT RESULTS")
    print("=" * 60)
    if sent_at and tts_start_wall:
        print(f"  client_time_to_first_audio_ms : {int((tts_start_wall - sent_at)*1000)} ms")
    if sent_at and tts_end_wall:
        print(f"  client_total_round_trip_ms    : {int((tts_end_wall - sent_at)*1000)} ms")
    print(f"  total_audio_bytes_received    : {total_audio_bytes}")
    print()
    print("SERVER-SIDE TELEMETRY (from uvicorn stdout)")
    print("-" * 60)
    print("After this script finishes, search the uvicorn terminal for a")
    print("JSON log line containing:  \"sentence_telemetry\"")
    print()
    print("Key fields to read from that JSON:")
    print("  sentence_telemetry[0].first_audio_sent_iso       -> sentence_1.first_audio_sent_iso")
    print("  sentence_telemetry[0].audio_drain_end_iso        -> sentence_1.audio_drain_end_iso")
    print("  sentence_telemetry[1].tts_synthesis_start_iso    -> sentence_2.tts_synthesis_start_iso")
    print("  time_to_first_audio_ms                           -> time_to_first_audio_ms")
    print()
    print("Also look for [TELEMETRY] prefixed lines in the log for individual events:")
    print("  [TELEMETRY] sentence_1_tts_synthesis_start ...")
    print("  [TELEMETRY] sentence_1_first_audio_byte_sent ...")
    print("  [TELEMETRY] sentence_1_audio_drain_end ...")
    print("  [TELEMETRY] sentence_2_tts_synthesis_start ...")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_measurement())
