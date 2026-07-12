import os
import time
import httpx
from dotenv import load_dotenv

load_dotenv()
groq_api_key = os.getenv("GROQ_API_KEY")
if not groq_api_key or groq_api_key == "placeholder-groq-key":
    print("Error: GROQ_API_KEY is not set or is placeholder")
    exit(1)

url = "https://api.groq.com/openai/v1/audio/transcriptions"
headers = {"Authorization": f"Bearer {groq_api_key}"}

# Load test file
wav_path = "scratch/appointment.wav"
if not os.path.exists(wav_path):
    # Try parent directory if run from within scratch
    wav_path = "../scratch/appointment.wav"
if not os.path.exists(wav_path):
    print("Error: scratch/appointment.wav not found. Run command to generate it first.")
    exit(1)

with open(wav_path, "rb") as f:
    audio_bytes = f.read()

print("--- BENCHMARK 1: Fresh httpx.Client() for each request (Current Implementation) ---")
for i in range(3):
    t0 = time.perf_counter()
    try:
        files = {"file": ("audio.wav", audio_bytes, "audio/wav")}
        data = {"model": "whisper-large-v3", "language": "en"}
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, headers=headers, files=files, data=data)
        dur = (time.perf_counter() - t0) * 1000
        if resp.status_code == 200:
            print(f"Request {i+1}: Success, duration = {dur:.1f}ms, text = {resp.json().get('text')}")
        else:
            print(f"Request {i+1}: Failed with status {resp.status_code}, response = {resp.text}")
    except Exception as e:
        print(f"Request {i+1}: Exception = {e}")

print("\n--- BENCHMARK 2: Reused httpx.Client() session ---")
with httpx.Client(timeout=10.0) as client:
    for i in range(3):
        t0 = time.perf_counter()
        try:
            files = {"file": ("audio.wav", audio_bytes, "audio/wav")}
            data = {"model": "whisper-large-v3", "language": "en"}
            resp = client.post(url, headers=headers, files=files, data=data)
            dur = (time.perf_counter() - t0) * 1000
            if resp.status_code == 200:
                print(f"Request {i+1}: Success, duration = {dur:.1f}ms, text = {resp.json().get('text')}")
            else:
                print(f"Request {i+1}: Failed with status {resp.status_code}, response = {resp.text}")
        except Exception as e:
            print(f"Request {i+1}: Exception = {e}")
