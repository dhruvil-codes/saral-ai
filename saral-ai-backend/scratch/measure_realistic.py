#!/usr/bin/env python
"""
Measurement run 2: realistic VAD threshold (no user fixture / user_id=None).
- Calls the WS endpoint without a user_id so VAD falls back to
  settings.SILENCE_THRESHOLD_MS = 300 ms (from .env).
- Reads [STEP_TIMING] lines from the uvicorn log after the call.

Usage:
    cd d:\\saral-ai\\saral-ai-backend
    .venv\\Scripts\\python.exe scratch\\measure_realistic.py
"""

import os, sys, time, json, asyncio, uuid, wave, io, re
from datetime import datetime, timezone

import httpx
import websockets
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
load_dotenv(env_path)

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SERVER_URL = "http://localhost:8000"

# â”€â”€ TTS helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async def generate_sarvam_audio(text: str, lang: str = "en-IN") -> bytes:
    url = "https://api.sarvam.ai/text-to-speech"
    headers = {"api-subscription-key": SARVAM_API_KEY, "Content-Type": "application/json"}
    payload = {
        "text": text, "model": "bulbul:v3", "speaker": "shruti",
        "target_language_code": lang, "pace": 1.0,
        "speech_sample_rate": 16000, "output_format": "wav",
    }
    async with httpx.AsyncClient(timeout=30.0) as c:
        r = await c.post(url, headers=headers, json=payload)
    if r.status_code != 200:
        raise RuntimeError(f"Sarvam TTS: {r.status_code} {r.text}")
    import base64
    return base64.b64decode(r.json()["audios"][0])

def pcm_from_wav(wav_bytes: bytes) -> bytes:
    with wave.open(io.BytesIO(wav_bytes), "rb") as w:
        return w.readframes(w.getnframes())


# â”€â”€ Direct WS call (no /api/call/incoming, no user_id) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async def run_measurement():
    print("\n" + "=" * 62)
    print("MEASUREMENT RUN 2 â€” realistic VAD (no user fixture)")
    print("Query: \"Tell me what things you can do for me\"")
    print("user_id: None  ->  VAD threshold = settings.SILENCE_THRESHOLD_MS")
    print("=" * 62)

    # Health check
    try:
        async with httpx.AsyncClient(timeout=5.0) as c:
            r = await c.get(f"{SERVER_URL}/health")
            assert r.status_code == 200 and r.json().get("status") == "ok"
        print("[OK] Server healthy")
    except Exception as e:
        print(f"[FAIL] Server not reachable: {e}")
        print("Start with: uvicorn app.main:app --reload")
        sys.exit(1)

    # Connect directly to /ws/call with NO user_id parameter
    ws_url = f"ws://localhost:8000/ws/call?language=en-IN"
    print(f"[WS] Connecting to {ws_url}")

    QUERY = "Tell me what things you can do for me"
    print(f"\n[TTS] Generating audio for: \"{QUERY}\"")
    wav_bytes = await generate_sarvam_audio(QUERY, "en-IN")
    pcm = pcm_from_wav(wav_bytes)
    audio_duration_ms = int(len(pcm) / 32)  # 32 bytes/ms at 16kHz 16-bit mono
    print(f"[TTS] {len(pcm)} PCM bytes  â†’  {audio_duration_ms} ms of audio")

    CHUNK = 640   # 20 ms chunks
    chunks = [pcm[i:i+CHUNK] for i in range(0, len(pcm), CHUNK)]

    # 300 ms silence = 15 chunks â€” that's what VAD should fire on with SILENCE_THRESHOLD_MS=300
    # We send 400 ms (20 chunks) to be safe, then stop
    TRAILING_SILENCE_MS = 400
    silence_chunks = TRAILING_SILENCE_MS // 20

    tts_start_wall = None
    tts_end_wall = None
    sent_at = None
    total_audio_bytes = 0

    print(f"[WS] Streaming {len(chunks)} audio chunks + {silence_chunks} silence chunks ({TRAILING_SILENCE_MS}ms)...")

    async with websockets.connect(ws_url, max_size=None) as ws:
        # Drain welcome message
        welcome_t = time.perf_counter() + 20
        async for msg in ws:
            if isinstance(msg, str) and json.loads(msg).get("status") == "tts_end":
                break
            if time.perf_counter() > welcome_t:
                print("[WARN] Welcome timeout")
                break
        print("[WS] Welcome done. Streaming query...")

        for chunk in chunks:
            if len(chunk) < CHUNK:
                chunk = chunk + b'\x00' * (CHUNK - len(chunk))
            await ws.send(chunk)
            await asyncio.sleep(0.02)

        print(f"[WS] Sending {TRAILING_SILENCE_MS}ms trailing silence to trigger VAD...")
        for _ in range(silence_chunks):
            await ws.send(b'\x00' * CHUNK)
            await asyncio.sleep(0.02)

        sent_at = time.perf_counter()
        print(f"[WS] Audio+silence sent at {datetime.now(timezone.utc).isoformat()}")
        print("[WS] Listening for response...")

        deadline = time.perf_counter() + 60
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
                    print(f"  [<-] tts_start  client_ttfa={int((tts_start_wall - sent_at)*1000)} ms")
                elif status == "tts_end":
                    tts_end_wall = time.perf_counter()
                    print(f"  [<-] tts_end    total={int((tts_end_wall - sent_at)*1000)} ms  bytes={total_audio_bytes}")
                    break
                elif "error" in d:
                    print(f"  [<-] ERROR: {d['error']}")
                    break
            if time.perf_counter() > deadline:
                print("[WARN] 60s timeout")
                break

    print()
    print("=" * 62)
    print("CLIENT-SIDE RESULTS")
    print("=" * 62)
    print(f"  audio_duration_ms (PCM content)  : {audio_duration_ms} ms")
    print(f"  trailing_silence_sent_ms          : {TRAILING_SILENCE_MS} ms")
    if sent_at and tts_start_wall:
        client_ttfa = int((tts_start_wall - sent_at) * 1000)
        print(f"  client_time_to_first_audio_ms    : {client_ttfa} ms")
        print(f"    (measured from last audio chunk sent â†’ tts_start received)")
    if sent_at and tts_end_wall:
        print(f"  client_total_round_trip_ms       : {int((tts_end_wall - sent_at)*1000)} ms")
    print(f"  total_audio_bytes_received        : {total_audio_bytes}")
    print()
    print("Now check the uvicorn terminal for these log lines:")
    print("  [STEP_TIMING] cache_lookup: ...")
    print("  [STEP_TIMING] stt_to_llm_gap: {...}")
    print("  INFO  ...  {\"call_id\": ..., \"time_to_first_audio_ms\": ..., \"stt_silence_wait_ms\": ...}")
    print("=" * 62)


if __name__ == "__main__":
    asyncio.run(run_measurement())
