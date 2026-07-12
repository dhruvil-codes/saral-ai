#!/usr/bin/env python
"""
Measurement run for 3 calls of different utterance lengths.
Uses locally generated synthetic PCM audio (sine wave) to simulate speech of known durations.

Usage:
    cd d:\\saral-ai\\saral-ai-backend
    $env:PYTHONIOENCODING="utf-8"
    .venv\\Scripts\\python.exe scratch\\measure_utterances.py
"""

import os, sys, time, json, asyncio, math, struct
import httpx
import websockets
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
load_dotenv(env_path)

SERVER_URL = "http://localhost:8000"

def generate_speech_pcm(duration_ms: int, sample_rate: int = 16000) -> bytes:
    # 440Hz sine wave, amplitude 10000 (RMS = 7071, well above VAD threshold)
    num_samples = int(sample_rate * (duration_ms / 1000.0))
    frequency = 440.0
    amplitude = 10000.0
    samples = []
    for i in range(num_samples):
        val = int(amplitude * math.sin(2 * math.pi * frequency * i / sample_rate))
        samples.append(val)
    return struct.pack(f"<{num_samples}h", *samples)

async def run_call(name: str, speech_duration_ms: int):
    print("\n" + "=" * 60)
    print(f"RUNNING {name}: simulating {speech_duration_ms} ms of speech")
    print("=" * 60)

    ws_url = f"ws://localhost:8000/ws/call?language=en-IN"
    print(f"[WS] Connecting to {ws_url}")

    pcm = generate_speech_pcm(speech_duration_ms)
    audio_duration_ms = int(len(pcm) / 32)
    print(f"[LOCAL] Generated {audio_duration_ms} ms of synthetic audio")

    CHUNK = 640
    chunks = [pcm[i:i+CHUNK] for i in range(0, len(pcm), CHUNK)]

    tts_start_wall = None
    sent_at = None

    async with websockets.connect(ws_url, max_size=None) as ws:
        # Drain welcome
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
        print("[WS] Query sent. Listening...")

        deadline = time.perf_counter() + 60
        async for msg in ws:
            if isinstance(msg, str):
                d = json.loads(msg)
                status = d.get("status")
                if status == "transcribed":
                    print(f"  [<-] transcribed: '{d.get('text')}'")
                elif status == "tts_start":
                    tts_start_wall = time.perf_counter()
                    print(f"  [<-] tts_start  client_ttfa={int((tts_start_wall - sent_at)*1000)} ms")
                elif status == "tts_end":
                    break
            if time.perf_counter() > deadline:
                break

    print(f"[OK] {name} completed.")
    if sent_at and tts_start_wall:
        return {
            "client_time_to_first_audio_ms": int((tts_start_wall - sent_at) * 1000)
        }
    return None

async def main():
    try:
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{SERVER_URL}/health")
            assert r.status_code == 200
    except Exception as e:
        print(f"Server not running: {e}")
        sys.exit(1)

    await run_call("CALL A (1s)", 1000)
    await asyncio.sleep(2.0)
    await run_call("CALL B (3s)", 3000)
    await asyncio.sleep(2.0)
    await run_call("CALL C (5s)", 5000)

if __name__ == "__main__":
    asyncio.run(main())
