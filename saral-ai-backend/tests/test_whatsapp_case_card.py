import asyncio
import os
import sys
import logging

# Configure basic logging to see service outputs
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

# Ensure backend app is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from app.services.whatsapp import send_case_card

sample_case_data = {
    "caller_name": "Rohan Sharma",
    "language": "Hindi",
    "patient_type": "new",
    "complaint": "Severe toothache and swelling on the left side of the jaw since yesterday.",
    "urgency_level": "urgent",
    "requested_slot": "tomorrow 10 AM",
    "recommended_action": "callback_now"
}

import pytest

@pytest.mark.asyncio
async def test_case_card():
    # Check Twilio credentials, skip if not set
    sid = os.getenv("TWILIO_ACCOUNT_SID")
    token = os.getenv("TWILIO_AUTH_TOKEN")
    if not sid or not token or sid == "placeholder-twilio-sid" or token == "placeholder-twilio-auth-token" or sid == "placeholder" or token == "placeholder":
        pytest.skip("Twilio credentials not configured in environment")

    # Allow specifying destination via environment variable, fallback to default for placeholder simulation
    to_number = os.getenv("TEST_WHATSAPP_TO")
    if not to_number:
        to_number = "+919867664047"
        print(f"TEST_WHATSAPP_TO not set in environment. Using default target: {to_number}")
    else:
        print(f"Using target WhatsApp number: {to_number}")
        
    print("\n--- Mock Stage 2 Case Data ---")
    for k, v in sample_case_data.items():
        print(f"{k}: {v}")
        
    print("\n--- Sending Case Card ---")
    success = await send_case_card(to_number, sample_case_data)
    print(f"\nResult: {'SUCCESS' if success else 'FAILED'}")

if __name__ == "__main__":
    asyncio.run(test_case_card())
