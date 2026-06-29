"""
Groq LLM Service.
Handles interaction with Groq API for generating receptionist responses,
including strict tool execution for database-level slot locking.
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import httpx
from groq import Groq, GroqError, APITimeoutError, APIStatusError
from app.api.bookings import create_booking_slot

# Load environment variables from .env if present
load_dotenv()

logger = logging.getLogger(__name__)

BOOKING_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "book_appointment",
            "description": "Book an appointment time slot for the caller.",
            "parameters": {
                "type": "object",
                "properties": {
                    "slot_datetime": {
                        "type": "string",
                        "description": "ISO formatted date and time for the appointment slot (e.g. 2026-06-30T10:00:00Z)."
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
    user_id: Optional[str] = None
) -> str:
    """
    Sends the full conversation history plus the new user message to Groq and returns the assistant's reply.
    Supports tool calling for appointment booking with database-level slot locking.

    Args:
        user_message (str): The latest message from the user.
        conversation_history (list): A list of dicts representing the conversation history.
        system_prompt (str): Optional system prompt overrides/extensions.
        user_id (str): Optional UUID string of the business user for database booking.

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
    default_sys = "You are a helpful receptionist AI assistant for Saral AI. If the caller wants to book or reserve an appointment, call the book_appointment tool with their requested slot."
    sys_content = system_prompt or default_sys
    if user_id and "book_appointment" not in sys_content:
        sys_content += "\nIf the caller requests an appointment booking, use the book_appointment tool to check and reserve the slot."
    
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
                if tool_call.function.name == "book_appointment":
                    try:
                        args = json.loads(tool_call.function.arguments)
                        slot_dt = args.get("slot_datetime")
                    except Exception:
                        slot_dt = None

                    logger.info(f"LLM requested booking tool call for slot: {slot_dt}")

                    # Step 3 Execution: Perform DB write FIRST before verbal confirmation!
                    if slot_dt and user_id:
                        db_result = create_booking_slot(user_id=user_id, slot_datetime=slot_dt)
                    else:
                        db_result = {"success": False, "error": "INVALID_SLOT", "message": "Missing slot datetime"}

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
                        tool_output = json.dumps({
                            "status": "success",
                            "message": f"Appointment successfully booked for {slot_dt}."
                        })
                    elif db_result.get("error") == "SLOT_TAKEN":
                        tool_output = json.dumps({
                            "status": "error",
                            "reason": "SLOT_TAKEN",
                            "message": "The requested slot is already taken by another booking."
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
