import os
import sys
import time
import json
import asyncio
import websockets
import statistics
import wave

# Ensure backend root is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Fixture file path
FIXTURE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")
FIXTURE_PATH = os.path.join(FIXTURE_DIR, "sample_audio.wav")

def generate_sample_audio_if_needed(file_path):
    """
    Generates a ~3-second WAV file using the real Sarvam TTS service if it doesn't exist.
    This guarantees a high-quality audio file containing real speech that transcribes perfectly.
    """
    if os.path.exists(file_path):
        print(f"Sample audio fixture already exists at: {file_path}")
        return

    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    print("Generating real speech WAV file via Sarvam TTS for load testing...")
    
    from app.services.sarvam import text_to_speech
    try:
        # Generate a standard English prompt of about 3 seconds
        audio_bytes = text_to_speech(
            text="Hello receptionist, I would like to book a quick consultation please.",
            language_code="en-IN",
            output_format="wav"
        )
        with open(file_path, "wb") as f:
            f.write(audio_bytes)
        print(f"Successfully generated and saved sample audio fixture to {file_path} ({len(audio_bytes)} bytes)")
    except Exception as e:
        print(f"Failed to generate real WAV file via Sarvam: {e}")
        print("Falling back to generating a synthetic WAV file...")
        # Synthetic fallback
        import math
        import struct
        sample_rate = 16000
        duration = 3.0
        num_samples = int(sample_rate * duration)
        with wave.open(file_path, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            frames = []
            for i in range(num_samples):
                t = i / sample_rate
                if t < 2.2:
                    freq = 300 + 100 * math.sin(2 * math.pi * 3.0 * t)
                    val = int(15000 * math.sin(2 * math.pi * freq * t))
                    frames.append(struct.pack("<h", val))
                else:
                    frames.append(struct.pack("<h", 0))
            wav_file.writeframes(b"".join(frames))
        print(f"Generated synthetic WAV file at: {file_path}")

async def run_connection(client_id, url, audio_bytes):
    """
    Simulates a single client connection that:
    1. Connects to `/ws/call`
    2. Sends the entire WAV file as a single binary message
    3. Listens for server replies (transcription and real-time TTS stream)
    4. Measures TTFA and Total Turn Latency.
    """
    metrics = {
        "client_id": client_id,
        "success": False,
        "ttfa": None,
        "turn_latency": None,
        "transcript": None,
        "error_msg": None,
        "close_code": None,
        "close_reason": None
    }
    
    try:
        async with websockets.connect(url) as ws:
            tts_start_time = None
            tts_end_time = None
            
            # Send the entire audio container in one message
            send_time = time.perf_counter()
            await ws.send(audio_bytes)
            
            # Read messages
            try:
                async for message in ws:
                    if isinstance(message, str):
                        data = json.loads(message)
                        if data.get("status") == "transcribed":
                            metrics["transcript"] = data.get("text")
                            print(f"[Client {client_id}] Transcribed: '{metrics['transcript']}'")
                        elif data.get("status") == "tts_start":
                            tts_start_time = time.perf_counter()
                            print(f"[Client {client_id}] TTS Stream started")
                        elif data.get("status") == "tts_end":
                            tts_end_time = time.perf_counter()
                            print(f"[Client {client_id}] TTS Stream finished")
                            break
                        elif "error" in data:
                            metrics["error_msg"] = f"Server returned error: {data['error']}"
                            break
                    elif isinstance(message, bytes):
                        # Synthesized audio chunk received
                        pass
            except websockets.exceptions.ConnectionClosed as e:
                metrics["error_msg"] = f"Connection closed: code={e.code}, reason={e.reason}"
            except Exception as e:
                metrics["error_msg"] = f"Receiver error: {e}"
            
            # Record final close status
            metrics["close_code"] = ws.close_code
            metrics["close_reason"] = ws.close_reason
            
            if not tts_end_time and not metrics["error_msg"]:
                metrics["error_msg"] = f"Connection ended early: code={ws.close_code}, reason='{ws.close_reason}'"
            
            # Calculate metrics
            if tts_start_time:
                metrics["ttfa"] = (tts_start_time - send_time) * 1000
            
            if tts_end_time:
                metrics["turn_latency"] = (tts_end_time - send_time) * 1000
                metrics["success"] = True
                
    except Exception as e:
        metrics["error_msg"] = f"Connection failed: {e}"
        
    return metrics

async def run_load_test(concurrency_level, url, audio_bytes):
    print(f"\n==================================================")
    print(f"Starting load test with Concurrency Level: {concurrency_level}")
    print(f"==================================================")
    
    tasks = [run_connection(i, url, audio_bytes) for i in range(concurrency_level)]
    results = await asyncio.gather(*tasks)
    
    latencies = []
    ttfas = []
    failures = 0
    errors = []
    
    for r in results:
        is_fallback = (r["transcript"] is None)
        
        if r["success"] and not is_fallback:
            latencies.append(r["turn_latency"])
            if r["ttfa"] is not None:
                ttfas.append(r["ttfa"])
        else:
            failures += 1
            if r["error_msg"]:
                errors.append(r["error_msg"])
            elif is_fallback:
                errors.append("STT/LLM failed (fell back to pre-recorded audio)")
            else:
                errors.append("Unknown connection failure")
                
    avg_latency = statistics.mean(latencies) if latencies else 0.0
    sorted_latencies = sorted(latencies)
    p95_latency = sorted_latencies[min(int(len(sorted_latencies) * 0.95), len(sorted_latencies)-1)] if sorted_latencies else 0.0
    
    avg_ttfa = statistics.mean(ttfas) if ttfas else 0.0
    sorted_ttfas = sorted(ttfas)
    p95_ttfa = sorted_ttfas[min(int(len(sorted_ttfas) * 0.95), len(sorted_ttfas)-1)] if sorted_ttfas else 0.0
    
    unique_errors = list(set(errors))
    errors_str = "; ".join(unique_errors) if unique_errors else "None"
    
    return {
        "concurrency": concurrency_level,
        "avg_latency": avg_latency,
        "p95_latency": p95_latency,
        "avg_ttfa": avg_ttfa,
        "p95_ttfa": p95_ttfa,
        "failures": failures,
        "errors": errors_str
    }

def main():
    generate_sample_audio_if_needed(FIXTURE_PATH)
    
    # Read the audio clip
    with open(FIXTURE_PATH, "rb") as f:
        audio_bytes = f.read()
    
    url = "ws://localhost:8000/ws/call?language=en-IN"
    
    concurrencies = [3, 5, 10]
    summaries = []
    
    for n in concurrencies:
        summary = asyncio.run(run_load_test(n, url, audio_bytes))
        summaries.append(summary)
        time.sleep(3)
        
    print("\n" + "="*96)
    print("                               LOAD TEST VOICE PIPELINE SUMMARY")
    print("="*96)
    print(f"{'Concurrency':<12} | {'Avg TTFA (ms)':<14} | {'p95 TTFA (ms)':<14} | {'Avg Turn (ms)':<14} | {'p95 Turn (ms)':<14} | {'Failures':<8} | {'Errors'}")
    print("-"*96)
    for s in summaries:
        print(f"{s['concurrency']:<12} | {s['avg_ttfa']:<14.1f} | {s['p95_ttfa']:<14.1f} | {s['avg_latency']:<14.1f} | {s['p95_latency']:<14.1f} | {s['failures']:<8} | {s['errors']}")
    print("="*96)

if __name__ == "__main__":
    main()
