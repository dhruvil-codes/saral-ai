
#!/usr/bin/env python3
"""
test_fireworks_stage1.py
Standalone smoke-test for the Fireworks AI LLM integration.
Sends 3 sample conversational prompts and prints responses with timing,
so you can manually verify latency and quality before wiring into the voice pipeline.

Usage:
    cd saral-ai-backend
    python test_fireworks_stage1.py

Requires FIREWORKS_API_KEY in .env or environment.
"""

import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

api_key = os.getenv("FIREWORKS_API_KEY")
if not api_key or api_key == "placeholder-fireworks-key":
    print("ERROR: Set FIREWORKS_API_KEY in your .env file before running this test.")
    sys.exit(1)

import httpx

FIREWORKS_API_BASE = "https://api.fireworks.ai/inference/v1"
MODEL = os.getenv("FIREWORKS_MODEL", "accounts/fireworks/models/llama-v3p1-70b-instruct")

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


def call_fireworks(messages):
    with httpx.Client(timeout=TIMEOUT) as client:
        resp = client.post(
            f"{FIREWORKS_API_BASE}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            json={"model": MODEL, "messages": messages},
        )
        resp.raise_for_status()
        return resp.json()


def run_test(prompt_def):
    label = prompt_def["label"]
    history = prompt_def["history"]
    user_msg = prompt_def["user"]

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_msg})

    sep = "=" * 60
    print(f"\n{sep}")
    print(f"  {label}")
    print(f"  User: {user_msg!r}")
    print(f"  Model: {MODEL}")
    print(sep)

    t0 = time.perf_counter()
    try:
        data = call_fireworks(messages)
        elapsed_ms = int((time.perf_counter() - t0) * 1000)

        content = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})

        print(f"  Response ({elapsed_ms} ms):")
        print(f"    {content}")
        if usage:
            print(
                f"  Tokens: prompt={usage.get('prompt_tokens','?')}, "
                f"completion={usage.get('completion_tokens','?')}, "
                f"total={usage.get('total_tokens','?')}"
            )
    except httpx.TimeoutException:
        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        print(f"  TIMEOUT after {elapsed_ms} ms -- check FIREWORKS_API_KEY and network.")
    except httpx.HTTPStatusError as exc:
        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        print(
            f"  HTTP ERROR {exc.response.status_code} after {elapsed_ms} ms: "
            f"{exc.response.text[:300]}"
        )
    except Exception as exc:
        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        print(f"  ERROR after {elapsed_ms} ms: {exc}")


if __name__ == "__main__":
    masked = f"{api_key[:8]}...{api_key[-4:]}" if len(api_key) > 12 else "***"
    print("Fireworks AI Stage-1 LLM Smoke Test")
    print(f"Model  : {MODEL}")
    print(f"API    : {FIREWORKS_API_BASE}")
    print(f"Key    : {masked}")

    for prompt_def in PROMPTS:
        run_test(prompt_def)

    print(
        "\nDone. Compare response quality and latency above "
        "before wiring into the full voice pipeline."
    )

