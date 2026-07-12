import os
import sys
import asyncio
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.INFO)

from app.services.fireworks_llm import get_response_stream_async

async def main():
    user_message = "I want to book an appointment for July 15, 2026 at 3 p.m."
    conversation_history = []
    system_prompt = None
    user_id = "cce9f5d0-d207-4ab7-a38e-21ce8302a8a6"
    call_id = "test-call-12345"

    print("Running get_response_stream_async...")
    try:
        async for chunk in get_response_stream_async(
            user_message=user_message,
            conversation_history=conversation_history,
            system_prompt=system_prompt,
            user_id=user_id,
            call_id=call_id
        ):
            print("YIELDED CHUNK:", repr(chunk))
    except Exception as e:
        print("ERROR OCCURRED:", e, exc_info=True)

if __name__ == "__main__":
    asyncio.run(main())
