"""
Check GLM-5.1 tool choice on Turn 2.
"""
import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("FIREWORKS_API_KEY")
model = "accounts/fireworks/models/glm-5p1"

BOOKING_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "hold_appointment_slot",
            "description": "Temporarily hold/reserve an appointment slot for the caller in pending status for 10 minutes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "slot_datetime": {
                        "type": "string",
                        "description": "ISO formatted date and time for the appointment slot (e.g. 2026-06-30T10:00:00Z)."
                    }
                },
                "required": ["slot_datetime"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "confirm_appointment",
            "description": "Confirm a previously held/pending appointment slot.",
            "parameters": {
                "type": "object",
                "properties": {
                    "slot_datetime": {
                        "type": "string",
                        "description": "ISO formatted date and time for the appointment slot to confirm."
                    }
                },
                "required": ["slot_datetime"],
            },
        },
    },
]

# Construct Turn 2 messages list
messages = [
    {
        "role": "system",
        "content": (
            "You are Shruti, a helpful female receptionist AI assistant for Saral AI. "
            "If the caller wants to book or reserve an appointment, you must first call the hold_appointment_slot tool. "
            "After calling hold_appointment_slot, you MUST explicitly read back the details and ask for confirmation. "
            "Only call the confirm_appointment tool if the user explicitly agrees. "
            "Once a slot is successfully held, you must NEVER call hold_appointment_slot again for that same slot; you must call confirm_appointment to finalize it."
        )
    },
    {
        "role": "user",
        "content": "I want to book an appointment for September 22, 2026 at 2 PM"
    },
    {
        "role": "assistant",
        "content": "",
        "tool_calls": [
            {
                "id": "call_123456",
                "type": "function",
                "function": {
                    "name": "hold_appointment_slot",
                    "arguments": json.dumps({"slot_datetime": "2026-09-22T14:00:00Z"})
                }
            }
        ]
    },
    {
        "role": "tool",
        "tool_call_id": "call_123456",
        "content": json.dumps({"status": "success", "message": "Appointment slot 2026-09-22T14:00:00Z is now held as pending for 10 minutes."})
    },
    {
        "role": "assistant",
        "content": "Just to confirm - September 22, 2026 at 2 PM - is that correct?"
    },
    {
        "role": "user",
        "content": "Yes, that is correct."
    }
]

print("Sending messages payload:")
print(json.dumps(messages, indent=2))

payload = {
    "model": model,
    "messages": messages,
    "tools": BOOKING_TOOLS,
    "tool_choice": "auto",
    "stream": False
}

r = httpx.post(
    "https://api.fireworks.ai/inference/v1/chat/completions",
    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
    json=payload,
    timeout=10.0
)

print("\nResponse Status:", r.status_code)
print(json.dumps(r.json(), indent=2))
