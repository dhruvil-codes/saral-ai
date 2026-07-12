import os
import sys
import asyncio
import wave
import io
import json
import time
import websockets

SERVER_URL = "ws://localhost:8001/ws/call?language=en-IN"
LOG_FILE = "uvicorn_8001.log"

def read_wav_pcm(path, max_duration_s=None):
    with wave.open(path, "rb") as w:
        params = w.getparams()
        n_frames = w.getnframes()
        if max_duration_s is not None:
            n_frames = min(n_frames, int(max_duration_s * w.getframerate()))
        pcm_bytes = w.readframes(n_frames)
        return pcm_bytes, int(len(pcm_bytes) / 32)  # 32 bytes/ms at 16kHz 16-bit mono

async def run_call(pcm_bytes, name):
    print(f"\n--- Running test call for: {name} ({len(pcm_bytes)} bytes) ---")
    chunk_size = 640  # 20ms chunks
    chunks = [pcm_bytes[i:i+chunk_size] for i in range(0, len(pcm_bytes), chunk_size)]
    
    async with websockets.connect(SERVER_URL) as ws:
        # Drain welcome message
        print("Waiting for welcome greeting...")
        async for msg in ws:
            if isinstance(msg, str) and json.loads(msg).get("status") == "tts_end":
                break
        print("Welcome greeting done. Streaming audio...")
        
        # Stream chunks
        for chunk in chunks:
            if len(chunk) < chunk_size:
                chunk = chunk + b'\x00' * (chunk_size - len(chunk))
            await ws.send(chunk)
            await asyncio.sleep(0.02)
            
        # Send trailing silence (600ms = 30 chunks)
        print("Sending 600ms trailing silence...")
        for _ in range(30):
            await ws.send(b'\x00' * chunk_size)
            await asyncio.sleep(0.02)
            
        print("Audio streamed. Waiting for response...")
        async for msg in ws:
            if isinstance(msg, str):
                data = json.loads(msg)
                status = data.get("status")
                if status == "transcribed":
                    print(f"  [<-] transcribed: '{data.get('text')}'")
                elif status == "tts_end":
                    print("  [<-] tts_end (turn completed)")
                    break
                elif "error" in data:
                    print(f"  [<-] ERROR: {data['error']}")
                    break

async def main():
    # 1. Read audio assets
    # Short ~1s
    short_pcm, short_len_ms = read_wav_pcm("tests/fixtures/sample_audio.wav", max_duration_s=1.0)
    # Medium ~2.7s
    med_pcm, med_len_ms = read_wav_pcm("tests/fixtures/sample_audio.wav")
    # Long ~5s
    long_pcm, long_len_ms = read_wav_pcm("../assets/real_voice.wav", max_duration_s=5.0)
    
    print(f"Audio assets loaded:")
    print(f"  Short:  {short_len_ms} ms")
    print(f"  Medium: {med_len_ms} ms")
    print(f"  Long:   {long_len_ms} ms")
    
    # 2. Run test calls
    # Get current log size to parse only new logs
    start_pos = 0
    if os.path.exists(LOG_FILE):
        with open(LOG_FILE, "r", encoding="utf-16", errors="ignore") as f:
            f.seek(0, 2)
            start_pos = f.tell()
            
    await run_call(short_pcm, "Short (~1s)")
    await asyncio.sleep(2)
    
    await run_call(med_pcm, "Medium (~2.7s)")
    await asyncio.sleep(2)
    
    await run_call(long_pcm, "Long (~5s)")
    await asyncio.sleep(2)
    
    # 3. Read and print VAD diagnostics from log file
    print("\n" + "=" * 60)
    print("PARSED VAD DIAGNOSTICS FROM LOGS:")
    print("=" * 60)
    
    with open(LOG_FILE, "r", encoding="utf-16", errors="ignore") as f:
        f.seek(start_pos)
        lines = f.readlines()
        
    found_any = False
    for line in lines:
        if "[VAD_DIAGNOSTICS]" in line:
            print(line.strip())
            found_any = True
            
    if not found_any:
        print("No [VAD_DIAGNOSTICS] logs found. Please check uvicorn_8001.log manually.")

if __name__ == "__main__":
    asyncio.run(main())
