#!/usr/bin/env python3
import os
import sys
import time
import json
import httpx
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("FIREWORKS_API_KEY")
if not api_key or api_key == "placeholder-fireworks-key":
    print("ERROR: Set FIREWORKS_API_KEY in your .env file.")
    sys.exit(1)

FIREWORKS_API_BASE = "https://api.fireworks.ai/inference/v1"
MODEL = os.getenv("FIREWORKS_MODEL", "accounts/fireworks/models/glm-5p1")

SYSTEM_PROMPT = (
    "You are a friendly receptionist AI assistant for a clinic. "
    "Answer briefly and naturally. "
    "You support Hinglish (mix of Hindi and English) conversations."
)

PROMPTS = [
    {
        "label": "[1] Basic greeting",
        "history": [],
        "user": "Hi, I want to book an appointment.",
    },
    {
        "label": "[2] Hinglish mid-conversation",
        "history": [
            {"role": "user", "content": "Hi, I want to book an appointment."},
            {"role": "assistant", "content": "Of course! What date and time works for you?"},
        ],
        "user": "Kal subah ka koi slot hai kya?",
    },
    {
        "label": "[3] Vague time -- model should ask for clarification",
        "history": [
            {"role": "user", "content": "Hi, I want to book an appointment."},
            {"role": "assistant", "content": "Of course! What date and time works for you?"},
            {"role": "user", "content": "Morning please."},
        ],
        "user": "Morning.",
    },
]

TIMEOUT = httpx.Timeout(connect=5.0, read=15.0, write=5.0, pool=2.0)

def test_prompt_streaming(prompt_def):
    label = prompt_def["label"]
    history = prompt_def["history"]
    user_msg = prompt_def["user"]

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_msg})

    payload = {
        "model": MODEL,
        "messages": messages,
        "stream": True
    }

    t0 = time.perf_counter()
    ttft = None
    total_dur = None
    response_text = []

    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            with client.stream(
                "POST",
                f"{FIREWORKS_API_BASE}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "Accept": "text/event-stream",
                },
                json=payload
            ) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if not line.strip():
                        continue
                    if line.startswith("data:"):
                        data_str = line[len("data:"):].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data_str)
                            choices_list = chunk.get("choices") or []
                            if not choices_list:
                                continue
                            delta = choices_list[0].get("delta") or {}
                            
                            # Measure TTFT on first chunk with content
                            if ttft is None and (delta.get("content") or delta.get("tool_calls")):
                                ttft = time.perf_counter() - t0
                            
                            content = delta.get("content")
                            if content:
                                response_text.append(content)
                        except Exception:
                            pass
                total_dur = time.perf_counter() - t0
    except Exception as e:
        print(f"    Request failed: {e}")
        return None

    full_text = "".join(response_text)
    return {
        "ttft_ms": int(ttft * 1000) if ttft is not None else None,
        "total_ms": int(total_dur * 1000) if total_dur is not None else None,
        "text": full_text
    }

def main():
    print(f"Running 5x Streaming Latency Smoke Test for model: {MODEL}")
    print("=" * 60)
    
    results = {p["label"]: [] for p in PROMPTS}
    
    for run in range(1, 6):
        print(f"\n--- RUN {run}/5 ---")
        for prompt_def in PROMPTS:
            label = prompt_def["label"]
            print(f"  Testing: {label} ... ", end="", flush=True)
            res = test_prompt_streaming(prompt_def)
            if res:
                results[label].append(res)
                print(f"Success! TTFT={res['ttft_ms']}ms, Total={res['total_ms']}ms")
                print(f"    Reply: {res['text'].strip()}")
            else:
                print("Failed!")
            time.sleep(1.0) # short rest between calls

    print("\n" + "=" * 60)
    print("LATENCY SUMMARY REPORT")
    print("=" * 60)
    for label, run_list in results.items():
        print(f"\nPrompt: {label}")
        if not run_list:
            print("  No successful runs.")
            continue
        ttfts = [r["ttft_ms"] for r in run_list if r["ttft_ms"] is not None]
        totals = [r["total_ms"] for r in run_list if r["total_ms"] is not None]
        
        for idx, r in enumerate(run_list):
            print(f"  Run {idx+1}: TTFT = {r['ttft_ms']} ms | Total = {r['total_ms']} ms")
        
        avg_ttft = sum(ttfts) / len(ttfts) if ttfts else 0
        avg_total = sum(totals) / len(totals) if totals else 0
        print(f"  --> Average TTFT: {avg_ttft:.1f} ms | Average Total: {avg_total:.1f} ms")

if __name__ == "__main__":
    main()
