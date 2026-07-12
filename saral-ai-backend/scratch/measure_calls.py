#!/usr/bin/env python
"""
Measurement run for Call A and Call B.
- Triggers Call A.
- Triggers Call B immediately after.
- Cleans up.

Usage:
    cd d:\\saral-ai\\saral-ai-backend
    $env:PYTHONIOENCODING="utf-8"
    .venv\\Scripts\\python.exe scratch\\measure_calls.py
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

async def run_call(name: str):
    print("\n" + "=" * 60)
    print(f"RUNNING {name}")
    print("=" * 60)

    ws_url = f"ws://localhost:8000/ws/call?language=en-IN"
    print(f"[WS] Connecting to {ws_url}")

    QUERY = "Tell me what things you can do for me"
    wav_bytes = await generate_sarvam_audio(QUERY, "en-IN")
    pcm = pcm_from_wav(wav_bytes)
    audio_duration_ms = int(len(pcm) / 32)
    print(f"[TTS] Generated {audio_duration_ms} ms of audio")

    CHUNK = 640
    chunks = [pcm[i:i+CHUNK] for i in range(0, len(pcm), CHUNK)]

    tts_start_wall = None
    tts_end_wall = None
    sent_at = None
    total_audio_bytes = 0

    async with websockets.connect(ws_url, max_size=None) as ws:
        # Drain welcome message
        welcome_t = time.perf_counter() + 20
        async for msg in ws:
            if isinstance(msg, str) and json.loads(msg).get("status") == "tts_end":
                break
            if time.perf_counter() > welcome_t:
                break

        print("[WS] Welcome done. Streaming query...")
        for chunk in chunks:
            if len(chunk) < CHUNK:
                chunk = chunk + b'\x00' * (CHUNK - len(chunk))
            await ws.send(chunk)
            await asyncio.sleep(0.02)

        # 400ms silence to trigger VAD
        print("[WS] Sending 400ms trailing silence...")
        for _ in range(20):
            await ws.send(b'\x00' * CHUNK)
            await asyncio.sleep(0.02)

        sent_at = time.perf_counter()
        print(f"[WS] Query sent. Listening for response...")

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
                break

    print(f"[OK] {name} completed.")
    if sent_at and tts_start_wall:
        return {
            "client_time_to_first_audio_ms": int((tts_start_wall - sent_at) * 1000),
            "client_total_round_trip_ms": int((tts_end_wall - sent_at) * 1000) if tts_end_wall else None
        }
    return None

async def main():
    try:
        # Check health
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{SERVER_URL}/health")
            assert r.status_code == 200
    except Exception as e:
        print(f"Server not running: {e}")
        sys.exit(1)

    res_a = await run_call("CALL A")
    await asyncio.sleep(2.0)
    res_b = await run_call("CALL B")

    print("\n" + "=" * 60)
    print("CLIENT-SIDE Telemetry Summary")
    print("=" * 60)
    print(f"Call A client-measured TTFA: {res_a['client_time_to_first_audio_ms'] if res_a else 'N/A'} ms")
    print(f"Call B client-measured TTFA: {res_b['client_time_to_first_audio_ms'] if res_b else 'N/A'} ms")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
