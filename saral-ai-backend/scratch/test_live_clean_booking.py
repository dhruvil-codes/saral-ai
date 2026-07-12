"""
Self-contained script to verify a clean, non-colliding booking flow end-to-end.
"""
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

from test_voice_agent_local import trigger_incoming_call, generate_synthetic_audio

async def run_file_turn(ws, file_path: str):
    with open(file_path, "rb") as f:
        audio_bytes = f.read()
    
    send_time = time.perf_counter()
    await ws.send(audio_bytes)

    transcript = None
    total_audio_bytes = 0
    server_text_responses = []
    
    async for message in ws:
        if isinstance(message, str):
            data = json.loads(message)
            status = data.get("status")
            if status == "transcribed":
                transcript = data.get("text")
                stt_latency = (time.perf_counter() - send_time) * 1000
                print(f"    <- [Server] Transcribed: '{transcript}' (turn latency: {stt_latency:.1f}ms)")
            elif status == "tts_start":
                pass
            elif status == "tts_end":
                break
            elif "text" in data:
                server_text_responses.append(data["text"])
            elif "error" in data:
                print(f"    <- [Server] Error: {data['error']}")
                break
        elif isinstance(message, bytes):
            total_audio_bytes += len(message)
            
    return {
        "transcript": transcript,
        "audio_bytes": total_audio_bytes,
        "text_responses": server_text_responses
    }

async def run():
    server_url = "http://127.0.0.1:8001"
    user_id = "cce9f5d0-d207-4ab7-a38e-21ce8302a8a6"
    caller_number = "+919876543299"
    slot_str_display = "December 17, 2026 at 2 PM"



    
    print("Generating synthetic speech files using Sarvam TTS...")
    # Generate Turn 1 WAV
    turn1_audio = await generate_synthetic_audio(f"I want to book an appointment for {slot_str_display}.")
    turn1_file = "scratch/precise_december17_2pm.wav"





    with open(turn1_file, "wb") as f:
        f.write(turn1_audio)
    print(f"Saved synthetic audio to {turn1_file}")

    # Generate Turn 2 WAV (Yes, that is correct)
    turn2_audio = await generate_synthetic_audio("Yes, that is correct.")
    turn2_file = "scratch/confirm_yes.wav"
    with open(turn2_file, "wb") as f:
        f.write(turn2_audio)
    print(f"Saved synthetic audio to {turn2_file}")

    print("\nTriggering incoming call...")
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
        print(f"\n--- Sending Turn 1: 'I want to book an appointment for {slot_str_display}' ---")
        res1 = await run_file_turn(ws, turn1_file)
        print(f"Turn 1 completed. Transcribed: '{res1['transcript']}'")
        
        # Turn 2: confirm booking
        print("\n--- Sending Turn 2: 'Yes, that is correct.' ---")
        res2 = await run_file_turn(ws, turn2_file)
        print(f"Turn 2 completed. Transcribed: '{res2['transcript']}'")
        await asyncio.sleep(2.0)

    print("\nWebSocket session finished.")
    print("Call ID to search for: ", call_id)

    # Immediately query database and print
    print("\nQuerying bookings from Supabase...")
    from app.db.supabase_client import get_supabase
    s = get_supabase()
    db_res = s.table("bookings").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(5).execute()
    print("Last 5 Bookings in DB:")
    for row in db_res.data:
        print(f"ID: {row['id']} | Slot: {row['slot_datetime']} | Status: {row['status']} | Call ID: {row['call_id']} | Created: {row['created_at']}")

if __name__ == "__main__":
    asyncio.run(run())
