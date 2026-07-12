import os
import sys
import asyncio
import uuid
import json
import time
import httpx
import websockets
from dotenv import load_dotenv

sys.path.insert(0, 'd:/saral-ai/saral-ai-backend')
os.chdir('d:/saral-ai/saral-ai-backend')
load_dotenv('.env')

from test_voice_agent_local import trigger_incoming_call

async def run_file_turn(ws, file_path: str):
    with open(file_path, "rb") as f:
        audio_bytes = f.read()
    
    send_time = time.perf_counter()
    await ws.send(audio_bytes)

    transcript = None
    total_audio_bytes = 0
    
    async for message in ws:
        if isinstance(message, str):
            data = json.loads(message)
            status = data.get("status")
            if status == "transcribed":
                transcript = data.get("text")
                stt_latency = (time.perf_counter() - send_time) * 1000
                print(f"    <- [Server] Transcribed: '{transcript}' (client-side turn latency: {stt_latency:.1f}ms)")
            elif status == "tts_start":
                pass
            elif status == "tts_end":
                break
            elif "error" in data:
                print(f"    <- [Server] Error: {data['error']}")
                break
        elif isinstance(message, bytes):
            total_audio_bytes += len(message)
            
    return {
        "transcript": transcript,
        "audio_bytes": total_audio_bytes
    }

async def run():
    server_url = "http://127.0.0.1:8001"

    user_id = "cce9f5d0-d207-4ab7-a38e-21ce8302a8a6"
    caller_number = "+919876543299"
    
    print("Triggering incoming call...")
    call_details = await trigger_incoming_call(server_url, user_id, caller_number, "en-IN")
    call_id = call_details["call_id"]
    ws_url = call_details["ws_url"]
    print(f"Call ID: {call_id}")
    
    async with websockets.connect(ws_url) as ws:
        # 1. Consume welcome greeting
        print("Consuming welcome greeting...")
        async for message in ws:
            if isinstance(message, str):
                data = json.loads(message)
                if data.get("status") == "tts_end":
                    print("Welcome greeting consumed.")
                    break

        # Turn 1: request booking
        print("\n--- Sending Turn 1: 'I want to book an appointment for July 15, 2026 at 3 PM.' ---")
        res1 = await run_file_turn(ws, "scratch/precise_appointment.wav")
        print(f"Turn 1 completed. Transcribed: '{res1['transcript']}'")
        await asyncio.sleep(2.0)
        
        # Turn 2: confirm booking
        print("\n--- Sending Turn 2: 'Yes, that is correct.' ---")
        res2 = await run_file_turn(ws, "scratch/confirm.wav")
        print(f"Turn 2 completed. Transcribed: '{res2['transcript']}'")
        await asyncio.sleep(2.0)

    print("\nWebSocket session finished.")
    print("Call ID to search for: ", call_id)

if __name__ == "__main__":
    asyncio.run(run())
