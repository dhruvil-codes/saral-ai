"""
Stage 2 post-call clinic triage service.
Extracts structured patient intake data and classifies case urgency from call transcripts.
"""

import os
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from dotenv import load_dotenv
import httpx

# Load environment variables from .env if present
load_dotenv()

logger = logging.getLogger(__name__)

# Constants
FIREWORKS_API_BASE = "https://api.fireworks.ai/inference/v1"
STAGE2_MODEL = "accounts/fireworks/models/minimax-m3"

# Safe default response in case of parsing failures
SAFE_DEFAULT_TRIAGE = {
    "caller_name": None,
    "language": "mixed",
    "patient_type": "new",
    "complaint": "Could not extract complaint details",
    "urgency_level": "routine",
    "requested_slot": None,
    "recommended_action": "callback_now"
}

SYSTEM_PROMPT = """You are an expert clinic receptionist assistant. Your task is to analyze the following post-call transcript (which is speaker-labeled, with "User" as the patient and "Assistant" as the receptionist) and extract structured patient intake data.

You must respond with a single, valid JSON object containing exactly the following keys, with no extra formatting, markdown wraps (like ```json), or text outside the JSON:

{
  "caller_name": "string or null if not captured",
  "language": "one of: Hindi / Marathi / English / mixed",
  "patient_type": "one of: new / existing",
  "complaint": "short string describing the symptom/issue",
  "urgency_level": "one of: urgent / same_day / routine / faq_only",
  "requested_slot": "string or null (e.g. ISO datetime or text like 'tomorrow 10 AM')",
  "recommended_action": "one of: callback_now / book_appointment / send_info / no_action"
}

Strict classification rules:
1. Urgency Level ("urgency_level"):
   - "urgent": Severe pain, bleeding, breathing difficulty, chest pain, or acute onset of debilitating symptoms.
   - "same_day": Moderate pain or symptoms that started today/yesterday (e.g. "since yesterday", "started this morning") but are not immediately life-threatening.
   - "routine": General appointment requests, follow-ups, minor long-standing issues, or general non-acute health inquiries.
   - "faq_only": Purely informational questions about fees, timings, clinic address, doctors, or general services with no patient symptom mentioned.

2. Recommended Action ("recommended_action"):
   - "callback_now": Use for "urgent" or "same_day" cases to prompt immediate staff follow-up.
   - "book_appointment": Use for "routine" cases where a slot was requested or an appointment is appropriate.
   - "send_info": Use for "faq_only" or when the user asked for info.
   - "no_action": Use if the call was cut off, a mistake, or no request was made.

Be conservative: lean towards "urgent" or "same_day" if there are signs of pain, bleeding, or acute/sudden onset.
"""

def extract_case_summary(transcript: str) -> Dict[str, Any]:
    """
    Calls Fireworks AI using minimax-m3 model to extract structured triage details from call transcript.
    Returns a dict with caller_name, language, patient_type, complaint, urgency_level, requested_slot, recommended_action.
    Guarantees returning all fields, defaulting to urgency_level: "routine" if parsing/inference fails.
    """
    api_key = os.getenv("FIREWORKS_API_KEY")
    if not api_key:
        logger.error("FIREWORKS_API_KEY is not set in environment.")
        return SAFE_DEFAULT_TRIAGE.copy()

    # Get current date and format it as YYYY-MM-DD, Day of week (e.g. 2026-07-08, Wednesday)
    current_date = datetime.now()
    current_date_str = current_date.strftime("%Y-%m-%d, %A")
    
    # Construct dynamic system prompt with the anchor date
    dynamic_system_prompt = (
        f"{SYSTEM_PROMPT}\n"
        f"Today's date is {current_date_str}. "
        "Use this as the anchor for resolving any relative dates mentioned in the transcript (today, tomorrow, next Monday, etc.)."
    )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    payload = {
        "model": STAGE2_MODEL,
        "messages": [
            {"role": "system", "content": dynamic_system_prompt},
            {"role": "user", "content": f"Here is the transcript to analyze:\n\n{transcript}"}
        ],
        "response_format": {"type": "json_object"},
        "max_tokens": 500,
        "temperature": 0.0
    }

    raw_response_text = ""
    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.post(
                f"{FIREWORKS_API_BASE}/chat/completions",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            
            response_json = response.json()
            raw_response_text = response_json["choices"][0]["message"]["content"]
            
            # Parse model output
            parsed_data = json.loads(raw_response_text.strip())
            
            # Validate output is a dictionary
            if not isinstance(parsed_data, dict):
                raise ValueError("Model output is not a JSON object/dict")
                
            # Verify and sanitize all required fields
            required_keys = [
                "caller_name", "language", "patient_type", "complaint", 
                "urgency_level", "requested_slot", "recommended_action"
            ]
            
            sanitized_data = {}
            for key in required_keys:
                if key not in parsed_data:
                    logger.warning(f"Required field '{key}' missing from model output. Using fallback.")
                    # If urgency_level is missing, default to routine
                    if key == "urgency_level":
                        sanitized_data[key] = "routine"
                    elif key == "patient_type":
                        sanitized_data[key] = "new"
                    elif key == "recommended_action":
                        sanitized_data[key] = "callback_now"
                    else:
                        sanitized_data[key] = None
                else:
                    sanitized_data[key] = parsed_data[key]
            
            # Enforce enum values constraints
            if sanitized_data["urgency_level"] not in ["urgent", "same_day", "routine", "faq_only"]:
                logger.warning(f"Invalid urgency_level '{sanitized_data['urgency_level']}' returned. Defaulting to 'routine'.")
                sanitized_data["urgency_level"] = "routine"
                
            if sanitized_data["recommended_action"] not in ["callback_now", "book_appointment", "send_info", "no_action"]:
                logger.warning(f"Invalid recommended_action '{sanitized_data['recommended_action']}' returned. Defaulting to 'callback_now'.")
                sanitized_data["recommended_action"] = "callback_now"

            if sanitized_data["patient_type"] not in ["new", "existing"]:
                sanitized_data["patient_type"] = "new"
                
            return sanitized_data

    except Exception as e:
        logger.error(
            f"Stage 2 Triage Extraction failed: {e}. "
            f"Raw model response: {raw_response_text!r}", 
            exc_info=True
        )
        return SAFE_DEFAULT_TRIAGE.copy()
