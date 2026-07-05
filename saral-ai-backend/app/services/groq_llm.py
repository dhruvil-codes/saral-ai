"""
Groq LLM Service.
Handles interaction with Groq API for generating receptionist responses,
including strict tool execution for database-level slot locking.
"""

import os
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import httpx
from groq import Groq, GroqError, APITimeoutError, APIStatusError
from app.api.bookings import hold_booking_slot, confirm_booking_slot

# Load environment variables from .env if present
load_dotenv()

logger = logging.getLogger(__name__)

def is_valid_iso_datetime(val: Any) -> bool:
    """
    Validates if the provided slot value is a precise, non-vague ISO-8601 datetime string.
    Vague descriptors (e.g. morning, afternoon, kal, subah, tomorrow) are rejected.
    """
    if not isinstance(val, str):
        return False
    vague_keywords = ["morning", "afternoon", "evening", "night", "today", "tomorrow", "kal", "subah", "shaam", "dopahar"]
    if any(kw in val.lower() for kw in vague_keywords):
        return False
    try:
        # replace Z with +00:00 for python 3.10 and below compatibility if needed
        s = val.replace('Z', '+00:00')
        dt = datetime.fromisoformat(s)
        # Ensure it has a time component (contains 'T' or a space separating date and time)
        if 'T' not in val and ' ' not in val:
            return False
        return True
    except Exception:
        return False

BOOKING_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "hold_appointment_slot",
            "description": "Temporarily hold/reserve an appointment slot for the caller in pending status for 10 minutes. Requires a valid, precise ISO-8601 datetime string. Do not accept vague descriptions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "slot_datetime": {
                        "type": "string",
                        "description": "ISO formatted date and time for the appointment slot (e.g. 2026-06-30T10:00:00Z). Must be a valid, precise ISO-8601 datetime string containing both a date and a time. Vague descriptions like 'morning', 'afternoon', 'evening', 'tomorrow', or 'kal subah' are strictly forbidden."
                    }
                },
                "required": ["slot_datetime"]
            }
        }
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
                        "description": "ISO formatted date and time for the appointment slot to confirm (e.g. 2026-06-30T10:00:00Z)."
                    }
                },
                "required": ["slot_datetime"]
            }
        }
    }
]

def get_response(
    user_message: str,
    conversation_history: List[Dict[str, Any]],
    system_prompt: str = None,
    user_id: Optional[str] = None,
    call_id: Optional[str] = None
) -> str:
    """
    Sends the full conversation history plus the new user message to Groq and returns the assistant's reply.
    Supports tool calling for appointment booking with database-level slot locking.

    Args:
        user_message (str): The latest message from the user.
        conversation_history (list): A list of dicts representing the conversation history.
        system_prompt (str): Optional system prompt overrides/extensions.
        user_id (str): Optional UUID string of the business user for database booking.
        call_id (str): Optional UUID string of the call log session.

    Returns:
        str: The response text from the assistant.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key == "placeholder-groq-key":
        raise ValueError("GROQ_API_KEY environment variable is not set or contains a placeholder value.")

    model = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
    
    try:
        client = Groq(api_key=api_key)
    except Exception as e:
        raise RuntimeError(f"Failed to initialize Groq client: {str(e)}") from e

    # Format and validate conversation history
    messages = []
    for msg in conversation_history:
        if isinstance(msg, dict) and "role" in msg and "content" in msg:
            role = str(msg["role"]).strip().lower()
            if role not in ["system", "user", "assistant", "tool"]:
                role = "user"
            messages.append({
                "role": role,
                "content": str(msg["content"])
            })

    # Ensure system prompt accurately directs booking behavior
    default_sys = (
        "You are a helpful receptionist AI assistant for Saral AI. "
        "If the caller wants to book or reserve an appointment, you must first call the hold_appointment_slot tool to check and temporarily hold the slot. "
        "After calling hold_appointment_slot, you MUST explicitly read back the critical information (date, time, and caller phone number if known) and ask for confirmation. "
        "Only call the confirm_appointment tool if the user explicitly agrees (e.g., says 'yes', 'correct', 'haan', or confirms) after you read back the details. "
        "You must NEVER accept vague times like 'morning', 'afternoon', 'evening', or 'kal subah'. If a user provides a vague time, you must immediately ask them to clarify by offering specific options (e.g., 'What exact time works for you? I have slots at 10 AM, 11 AM, or 12 PM.')."
    )
    sys_content = system_prompt or default_sys
    
    # Append Hinglish language guideline instruction
    hinglish_instruction = (
        "\n\n[LANGUAGE GUIDELINE: The user will frequently speak in \"Hinglish\" (a mix of Hindi and English). "
        "You must perfectly understand this mix. Always reply in the same natural, conversational language the user is speaking. "
        "Do not use overly formal Hindi; use natural, everyday Hinglish.]"
    )
    if "[LANGUAGE GUIDELINE:" not in sys_content:
        sys_content += hinglish_instruction
    
    booking_instructions = (
        "\n\n[CRITICAL APPOINTMENT BOOKING RULES]:\n"
        "1. If the caller wants to book or reserve an appointment, you must first call the hold_appointment_slot tool with the requested slot.\n"
        "2. After calling hold_appointment_slot, you MUST explicitly read back the critical information (date, time, and caller phone number if known) to confirm with the caller. E.g., 'Just to confirm — Tuesday 15th at 10am, phone number 9820XXXXXX — is that correct?'\n"
        "3. Only call the confirm_appointment tool if the user explicitly agrees (e.g., says 'yes', 'correct', 'haan', or confirms) after you read back the details.\n"
        "4. You must NEVER accept vague times like 'morning', 'afternoon', 'evening', or 'kal subah'. If a user provides a vague time, you must immediately ask them to clarify by offering specific options (e.g., 'What exact time works for you? I have slots at 10 AM, 11 AM, or 12 PM.')."
    )
    if user_id and "[CRITICAL APPOINTMENT BOOKING RULES]" not in sys_content:
        sys_content += booking_instructions

    strict_datetime_instructions = (
        "\n\n[STRICT DATETIME RESOLUTION RULE]:\n"
        "You must NEVER accept vague times like 'morning', 'afternoon', 'evening', or 'kal subah'. "
        "If a user provides a vague time, you must immediately ask them to clarify by offering specific options (e.g., 'What exact time works for you? I have slots at 10 AM, 11 AM, or 12 PM.')."
    )
    if "[STRICT DATETIME RESOLUTION RULE]" not in sys_content:
        sys_content += strict_datetime_instructions
    
    system_index = -1
    for i, m in enumerate(messages):
        if m["role"] == "system":
            system_index = i
            break
            
    if system_index != -1:
        messages[system_index]["content"] = sys_content
    else:
        messages.insert(0, {
            "role": "system",
            "content": sys_content
        })

    messages.append({
        "role": "user",
        "content": user_message
    })

    try:
        kwargs = {
            "messages": messages,
            "model": model,
        }
        if user_id:
            kwargs["tools"] = BOOKING_TOOLS
            kwargs["tool_choice"] = "auto"

        chat_completion = client.chat.completions.create(**kwargs)
        if not chat_completion.choices or not chat_completion.choices[0].message:
            raise RuntimeError("Received an empty response from Groq LLM API.")
            
        choice_msg = chat_completion.choices[0].message

        # Check if the model triggered a tool call
        if getattr(choice_msg, "tool_calls", None):
            for tool_call in choice_msg.tool_calls:
                tool_name = tool_call.function.name
                if tool_name in ["hold_appointment_slot", "confirm_appointment"]:
                    try:
                        args = json.loads(tool_call.function.arguments)
                        slot_dt = args.get("slot_datetime")
                    except Exception:
                        slot_dt = None

                    logger.info(f"LLM requested booking tool call '{tool_name}' for slot: {slot_dt}")

                    if slot_dt and user_id:
                        if tool_name == "hold_appointment_slot":
                            if not is_valid_iso_datetime(slot_dt):
                                logger.warning(f"Validation failed for hold_appointment_slot. Vague slot_datetime: {slot_dt}")
                                db_result = {
                                    "success": False,
                                    "error": "INVALID_DATETIME_FORMAT",
                                    "message": "Validation Error: The slot_datetime must be a precise, valid ISO-8601 datetime string. Vague inputs like 'morning', 'afternoon', or 'kal subah' are not allowed. You must immediately ask the user to clarify and offer specific slots (e.g., 10 AM, 11 AM, or 12 PM)."
                                }
                            else:
                                db_result = hold_booking_slot(user_id=user_id, slot_datetime=slot_dt, call_id=call_id)
                        else:
                            db_result = confirm_booking_slot(user_id=user_id, slot_datetime=slot_dt)
                    else:
                        db_result = {"success": False, "error": "INVALID_SLOT", "message": "Missing slot datetime or user ID"}

                    # Append assistant tool call message to history
                    messages.append({
                        "role": "assistant",
                        "content": choice_msg.content or "",
                        "tool_calls": [
                            {
                                "id": tool_call.id,
                                "type": "function",
                                "function": {
                                    "name": tool_call.function.name,
                                    "arguments": tool_call.function.arguments
                                }
                            }
                        ]
                    })

                    # Construct tool outcome message
                    if db_result["success"]:
                        if tool_name == "hold_appointment_slot":
                            tool_output = json.dumps({
                                "status": "success",
                                "message": f"Appointment slot {slot_dt} is now held as pending for 10 minutes."
                            })
                        else:
                            tool_output = json.dumps({
                                "status": "success",
                                "message": f"Appointment slot {slot_dt} has been successfully confirmed."
                            })
                    elif db_result.get("error") == "SLOT_TAKEN":
                        tool_output = json.dumps({
                            "status": "error",
                            "reason": "SLOT_TAKEN",
                            "message": "The requested slot is already taken or held by another booking."
                        })
                    elif db_result.get("error") == "NO_PENDING_SLOT":
                        tool_output = json.dumps({
                            "status": "error",
                            "reason": "NO_PENDING_SLOT",
                            "message": "No pending reservation was found for this time slot. It may have expired."
                        })
                    else:
                        tool_output = json.dumps({
                            "status": "error",
                            "reason": db_result.get("error"),
                            "message": db_result.get("message")
                        })

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": tool_output
                    })

                    # Follow up completion with tool execution output
                    followup_completion = client.chat.completions.create(
                        messages=messages,
                        model=model
                    )
                    if followup_completion.choices and followup_completion.choices[0].message:
                        return followup_completion.choices[0].message.content

        return choice_msg.content or ""

    except APITimeoutError as te:
        raise httpx.TimeoutException(f"Groq LLM timeout: {str(te)}") from te
    except APIStatusError as se:
        raise httpx.HTTPStatusError(
            f"Groq LLM status error {se.status_code}: {str(se)}",
            request=se.request,
            response=se.response
        ) from se
    except GroqError as ge:
        raise RuntimeError(f"Groq API error occurred: {str(ge)}") from ge
    except Exception as e:
        logger.error(f"Error during Groq LLM completion: {e}", exc_info=True)
        raise RuntimeError(f"An unexpected error occurred while calling Groq: {str(e)}") from e
