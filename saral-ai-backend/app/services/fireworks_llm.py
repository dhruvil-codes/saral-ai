"""
Fireworks AI LLM Service.
Drop-in replacement for groq_llm.py -- identical public interface (get_response, is_valid_iso_datetime).
Calls the Fireworks AI OpenAI-compatible REST endpoint via httpx (already in requirements.txt).

Model note:
  Default: accounts/fireworks/models/llama-v3p1-70b-instruct
  Lower-latency alternative flagged below -- see FIREWORKS_MODEL env var docs.
"""

import os
import json
import time
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import httpx
from app.api.bookings import hold_booking_slot, confirm_booking_slot
from fastapi.concurrency import run_in_threadpool

# Load environment variables from .env if present
load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model selection note
# ---------------------------------------------------------------------------
# accounts/fireworks/models/llama-v3p1-70b-instruct  -> default, strong quality
# accounts/fireworks/models/llama-v3p1-8b-instruct   -> ~40 % lower TTFT,
#   good for pure conversational turns with no tool calls (lower quality).
# Set FIREWORKS_MODEL in your .env to override at runtime.
# ---------------------------------------------------------------------------

FIREWORKS_API_BASE = "https://api.fireworks.ai/inference/v1"
DEFAULT_MODEL = "accounts/fireworks/models/llama-v3p1-70b-instruct"

# Timeouts: 4 s connect + 10 s read (ws_call.py applies its own asyncio.wait_for)
_HTTP_TIMEOUT = httpx.Timeout(connect=4.0, read=10.0, write=5.0, pool=2.0)


def is_valid_iso_datetime(val: Any) -> bool:
    """
    Validates if the provided slot value is a precise, non-vague ISO-8601 datetime string.
    Vague descriptors (e.g. morning, afternoon, kal, subah, tomorrow) are rejected.
    Identical implementation to groq_llm.is_valid_iso_datetime.
    """
    if not isinstance(val, str):
        return False
    vague_keywords = [
        "morning", "afternoon", "evening", "night",
        "today", "tomorrow", "kal", "subah", "shaam", "dopahar"
    ]
    if any(kw in val.lower() for kw in vague_keywords):
        return False
    try:
        s = val.replace("Z", "+00:00")
        datetime.fromisoformat(s)
        if "T" not in val and " " not in val:
            return False
        return True
    except Exception:
        return False


BOOKING_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "hold_appointment_slot",
            "description": (
                "Temporarily hold/reserve an appointment slot for the caller in pending status "
                "for 10 minutes. Requires a valid, precise ISO-8601 datetime string. "
                "Do not accept vague descriptions."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "slot_datetime": {
                        "type": "string",
                        "description": (
                            "ISO formatted date and time for the appointment slot "
                            "(e.g. 2026-06-30T10:00:00Z). Must be a valid, precise ISO-8601 "
                            "datetime string containing both a date and a time. Vague descriptions "
                            "like 'morning', 'afternoon', 'evening', 'tomorrow', or 'kal subah' "
                            "are strictly forbidden."
                        ),
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
                        "description": "ISO formatted date and time for the appointment slot to confirm.",
                    }
                },
                "required": ["slot_datetime"],
            },
        },
    },
]


def _fireworks_chat(
    messages: List[Dict[str, Any]],
    model: str,
    api_key: str,
    tools: Optional[List[Dict]] = None,
    tool_choice: Optional[str] = None,
    _max_retries: int = 3,
) -> Dict[str, Any]:
    """
    Low-level synchronous POST to Fireworks /chat/completions.
    Returns the full parsed JSON response dict.
    Raises httpx.TimeoutException, httpx.HTTPStatusError, or RuntimeError on failure.

    Retries up to _max_retries times on the intermittent Fireworks
    "model output must contain either output text or tool calls" 500 error.
    """
    import time

    payload: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "stream": True,
    }
    if tools:
        payload["tools"] = tools
    if tool_choice:
        payload["tool_choice"] = tool_choice

    logger.debug(
        "[fireworks_llm] POST %s/chat/completions model=%s messages=%d (streaming enabled)",
        FIREWORKS_API_BASE,
        model,
        len(messages),
    )

    last_exc: Exception = RuntimeError("No attempts made")
    for attempt in range(1, _max_retries + 1):
        try:
            with httpx.Client(timeout=_HTTP_TIMEOUT) as client:
                with client.stream(
                    "POST",
                    f"{FIREWORKS_API_BASE}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                        "Accept": "text/event-stream",
                    },
                    json=payload,
                ) as response:
                    response.raise_for_status()
                    
                    full_content = []
                    tool_calls_builder = {}
                    ttft = None
                    t0 = time.perf_counter()
                    
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
                                
                                # First token/action timing
                                if ttft is None and (delta.get("content") or delta.get("tool_calls")):
                                    ttft = time.perf_counter() - t0
                                    logger.info("[fireworks_llm] TTFT: %.3fs", ttft)
                                
                                content = delta.get("content")
                                if content:
                                    full_content.append(content)
                                    
                                tool_calls = delta.get("tool_calls")
                                if tool_calls:
                                    for tc in tool_calls:
                                        idx = tc.get("index")
                                        if idx is None:
                                            continue
                                        if idx not in tool_calls_builder:
                                            tool_calls_builder[idx] = {
                                                "id": tc.get("id", ""),
                                                "type": tc.get("type", "function"),
                                                "function": {
                                                    "name": tc.get("function", {}).get("name", ""),
                                                    "arguments": ""
                                                }
                                            }
                                        else:
                                            if "id" in tc and tc["id"]:
                                                tool_calls_builder[idx]["id"] = tc["id"]
                                        
                                        func = tc.get("function") or {}
                                        name_delta = func.get("name", "")
                                        if name_delta:
                                            tool_calls_builder[idx]["function"]["name"] += name_delta
                                        args_delta = func.get("arguments", "")
                                        if args_delta:
                                            tool_calls_builder[idx]["function"]["arguments"] += args_delta
                            except Exception as parse_err:
                                logger.warning("[fireworks_llm] Stream chunk parse error: %s", parse_err)
                    
                    reconstructed_tool_calls = []
                    if tool_calls_builder:
                        for idx in sorted(tool_calls_builder.keys()):
                            reconstructed_tool_calls.append(tool_calls_builder[idx])
                            
                    text_response = "".join(full_content)
                    total_dur = time.perf_counter() - t0
                    logger.info("[fireworks_llm] Completed stream. TTFT: %s, Total: %.3fs", 
                                f"{ttft:.3f}s" if ttft is not None else "N/A", total_dur)
                    
                    return {
                        "choices": [
                            {
                                "message": {
                                    "role": "assistant",
                                    "content": text_response,
                                    "tool_calls": reconstructed_tool_calls or None
                                }
                            }
                        ]
                    }
        except httpx.TimeoutException:
            # Re-raise timeouts immediately — no point retrying a slow call
            raise
        except httpx.HTTPStatusError as hse:
            body = hse.response.text
            is_empty_output_error = (
                hse.response.status_code in (500, 400)
                and "model output must contain either output text" in body
            )
            if is_empty_output_error and attempt < _max_retries:
                wait = 0.5 * attempt
                logger.warning(
                    "[fireworks_llm] Empty-output error on attempt %d/%d — retrying in %.1fs",
                    attempt, _max_retries, wait,
                )
                time.sleep(wait)
                last_exc = hse
                continue
            # Non-retryable HTTP error or final attempt — log and re-raise
            logger.error(
                "[fireworks_llm] HTTP %s from Fireworks API (attempt %d/%d): %s",
                hse.response.status_code, attempt, _max_retries,
                body[:500],
            )
            raise
        except Exception as exc:
            logger.error(
                "[fireworks_llm] Unexpected error calling Fireworks API: %s",
                exc,
                exc_info=True,
            )
            raise RuntimeError(f"Unexpected error calling Fireworks AI: {exc}") from exc

    # Exhausted retries on the empty-output error — re-raise the last one
    raise last_exc



def get_response(
    user_message: str,
    conversation_history: List[Dict[str, Any]],
    system_prompt: str = None,
    user_id: Optional[str] = None,
    call_id: Optional[str] = None,
) -> str:
    """
    Sends the full conversation history plus the new user message to Fireworks AI
    and returns the assistant reply.
    Supports tool calling for appointment booking with database-level slot locking.

    Identical public signature to groq_llm.get_response -- drop-in replacement.

    Args:
        user_message (str): The latest message from the user.
        conversation_history (list): A list of dicts representing the conversation history.
        system_prompt (str): Optional system prompt overrides/extensions.
        user_id (str): Optional UUID string of the business user for database booking.
        call_id (str): Optional UUID string of the call log session.

    Returns:
        str: The response text from the assistant.

    Raises:
        ValueError: If FIREWORKS_API_KEY is missing or a placeholder.
        httpx.TimeoutException: Propagated so ws_call.py can catch and log it.
        httpx.HTTPStatusError: Propagated so ws_call.py can catch and log it.
        RuntimeError: For any other Fireworks API or parsing failure.
    """
    api_key = os.getenv("FIREWORKS_API_KEY")
    if not api_key or api_key == "placeholder-fireworks-key":
        raise ValueError(
            "FIREWORKS_API_KEY environment variable is not set or contains a placeholder value."
        )

    model = os.getenv("FIREWORKS_MODEL", DEFAULT_MODEL)

    # ------------------------------------------------------------------
    # Build message list from conversation history
    # ------------------------------------------------------------------
    messages: List[Dict[str, Any]] = []
    for msg in conversation_history:
        if isinstance(msg, dict) and "role" in msg and "content" in msg:
            role = str(msg["role"]).strip().lower()
            if role not in ["system", "user", "assistant", "tool"]:
                role = "user"
            messages.append({"role": role, "content": str(msg["content"])})

    # ------------------------------------------------------------------
    # Build / inject system prompt (identical logic to groq_llm.py)
    # ------------------------------------------------------------------
    default_sys = (
        "You are Shruti, a helpful female receptionist AI assistant for Saral AI. "
        "Because you are a female and your voice is female (Shruti), you must always refer to yourself "
        "in the female grammatical gender (e.g. use 'कर सकती हूँ', 'करूँगी', 'व्यस्त हूँ', etc. instead "
        "of male verbs/pronouns). "
        "If the caller wants to book or reserve an appointment, you must first call the "
        "hold_appointment_slot tool to check and temporarily hold the slot. "
        "After calling hold_appointment_slot, you MUST explicitly read back the critical "
        "information (date, time, and caller phone number if known) and ask for confirmation. "
        "Only call the confirm_appointment tool if the user explicitly agrees (e.g., says 'yes', "
        "'correct', 'haan', or confirms) after you read back the details. "
        "You must NEVER accept vague times like 'morning', 'afternoon', 'evening', or 'kal subah'. "
        "If a user provides a vague time, you must immediately ask them to clarify by offering "
        "specific options (e.g., 'What exact time works for you? I have slots at 10 AM, 11 AM, "
        "or 12 PM.')."
    )
    sys_content = system_prompt or default_sys

    hinglish_instruction = (
        "\n\n[LANGUAGE GUIDELINE: The user will frequently speak in \"Hinglish\" "
        "(a mix of Hindi and English). "
        "You must perfectly understand this mix. Always reply in the same natural, conversational "
        "language the user is speaking. "
        "Do not use overly formal Hindi; use natural, everyday Hinglish.]"
    )
    if "[LANGUAGE GUIDELINE:" not in sys_content:
        sys_content += hinglish_instruction

    booking_instructions = (
        "\n\n[CRITICAL APPOINTMENT BOOKING RULES]:\n"
        "1. If the caller wants to book or reserve an appointment, you must first call the "
        "hold_appointment_slot tool with the requested slot.\n"
        "2. After calling hold_appointment_slot, you MUST explicitly read back the critical "
        "information (date, time, and caller phone number if known) to confirm with the caller. "
        "E.g., 'Just to confirm - Tuesday 15th at 10am, phone number 9820XXXXXX - is that correct?'\n"
        "3. Only call the confirm_appointment tool if the user explicitly agrees (e.g., says 'yes', "
        "'correct', 'haan', or confirms) after you read back the details.\n"
        "4. You must NEVER accept vague times like 'morning', 'afternoon', 'evening', or 'kal subah'. "
        "If a user provides a vague time, you must immediately ask them to clarify by offering "
        "specific options (e.g., 'What exact time works for you? I have slots at 10 AM, 11 AM, "
        "or 12 PM.')."
    )
    if user_id and "[CRITICAL APPOINTMENT BOOKING RULES]" not in sys_content:
        sys_content += booking_instructions

    strict_datetime_instructions = (
        "\n\n[STRICT DATETIME RESOLUTION RULE]:\n"
        "You must NEVER accept vague times like 'morning', 'afternoon', 'evening', or 'kal subah'. "
        "If a user provides a vague time, you must immediately ask them to clarify by offering "
        "specific options (e.g., 'What exact time works for you? I have slots at 10 AM, 11 AM, "
        "or 12 PM.')."
    )
    if "[STRICT DATETIME RESOLUTION RULE]" not in sys_content:
        sys_content += strict_datetime_instructions

    # Insert / replace system message
    system_index = -1
    for i, m in enumerate(messages):
        if m["role"] == "system":
            system_index = i
            break

    if system_index != -1:
        messages[system_index]["content"] = sys_content
    else:
        messages.insert(0, {"role": "system", "content": sys_content})

    messages.append({"role": "user", "content": user_message})

    # ------------------------------------------------------------------
    # First API call (with tools if user_id is present)
    # ------------------------------------------------------------------
    try:
        kwargs: Dict[str, Any] = {}
        if user_id:
            kwargs["tools"] = BOOKING_TOOLS
            kwargs["tool_choice"] = "auto"

        data = _fireworks_chat(messages=messages, model=model, api_key=api_key, **kwargs)

        choices = data.get("choices") or []
        if not choices:
            raise RuntimeError(
                "[fireworks_llm] Received an empty 'choices' list from Fireworks AI -- "
                "this is unexpected during a live call."
            )

        choice_msg = choices[0].get("message", {})
        tool_calls = choice_msg.get("tool_calls") or []

        # ------------------------------------------------------------------
        # Tool-call handling (mirrors groq_llm.py exactly)
        # ------------------------------------------------------------------
        if tool_calls:
            for tool_call in tool_calls:
                tool_name = tool_call["function"]["name"]
                if tool_name not in ["hold_appointment_slot", "confirm_appointment"]:
                    continue

                try:
                    args = json.loads(tool_call["function"]["arguments"])
                    slot_dt = args.get("slot_datetime")
                except Exception:
                    slot_dt = None

                logger.info(
                    "[fireworks_llm] LLM requested booking tool call '%s' for slot: %s",
                    tool_name,
                    slot_dt,
                )

                if slot_dt and user_id:
                    if tool_name == "hold_appointment_slot":
                        if not is_valid_iso_datetime(slot_dt):
                            logger.warning(
                                "[fireworks_llm] Validation failed for hold_appointment_slot. "
                                "Vague slot_datetime: %s",
                                slot_dt,
                            )
                            db_result = {
                                "success": False,
                                "error": "INVALID_DATETIME_FORMAT",
                                "message": (
                                    "Validation Error: The slot_datetime must be a precise, "
                                    "valid ISO-8601 datetime string. Vague inputs like 'morning', "
                                    "'afternoon', or 'kal subah' are not allowed. You must "
                                    "immediately ask the user to clarify and offer specific slots "
                                    "(e.g., 10 AM, 11 AM, or 12 PM)."
                                ),
                            }
                        else:
                            db_result = hold_booking_slot(
                                user_id=user_id, slot_datetime=slot_dt, call_id=call_id
                            )
                    else:
                        db_result = confirm_booking_slot(
                            user_id=user_id, slot_datetime=slot_dt
                        )
                else:
                    db_result = {
                        "success": False,
                        "error": "INVALID_SLOT",
                        "message": "Missing slot datetime or user ID",
                    }

                # Append assistant tool-call turn to history
                messages.append(
                    {
                        "role": "assistant",
                        "content": choice_msg.get("content") or "",
                        "tool_calls": [
                            {
                                "id": tool_call["id"],
                                "type": "function",
                                "function": {
                                    "name": tool_call["function"]["name"],
                                    "arguments": tool_call["function"]["arguments"],
                                },
                            }
                        ],
                    }
                )

                # Build tool result message
                if db_result["success"]:
                    if tool_name == "hold_appointment_slot":
                        tool_output = json.dumps({
                            "status": "success",
                            "message": f"Appointment slot {slot_dt} is now held as pending for 10 minutes.",
                        })
                    else:
                        tool_output = json.dumps({
                            "status": "success",
                            "message": f"Appointment slot {slot_dt} has been successfully confirmed.",
                        })
                elif db_result.get("error") == "SLOT_TAKEN":
                    tool_output = json.dumps({
                        "status": "error",
                        "reason": "SLOT_TAKEN",
                        "message": "The requested slot is already taken or held by another booking.",
                    })
                elif db_result.get("error") == "NO_PENDING_SLOT":
                    tool_output = json.dumps({
                        "status": "error",
                        "reason": "NO_PENDING_SLOT",
                        "message": "No pending reservation was found for this time slot. It may have expired.",
                    })
                else:
                    tool_output = json.dumps({
                        "status": "error",
                        "reason": db_result.get("error"),
                        "message": db_result.get("message"),
                    })

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call["id"],
                    "content": tool_output,
                })

                # Follow-up call after tool execution
                followup_data = _fireworks_chat(messages=messages, model=model, api_key=api_key)
                followup_choices = followup_data.get("choices") or []
                if followup_choices and followup_choices[0].get("message"):
                    return followup_choices[0]["message"].get("content") or ""

        return choice_msg.get("content") or ""

    except (httpx.TimeoutException, httpx.HTTPStatusError):
        # Let these bubble up with their original type -- ws_call.py catches both
        raise
    except RuntimeError:
        raise
    except Exception as exc:
        logger.error(
            "[fireworks_llm] Unexpected error during Fireworks AI completion (live call): %s",
            exc,
            exc_info=True,
        )
        raise RuntimeError(
            f"An unexpected error occurred while calling Fireworks AI: {exc}"
        ) from exc


async def _fireworks_chat_stream_async(
    messages: List[Dict[str, Any]],
    model: str,
    api_key: str,
    tools: Optional[List[Dict]] = None,
    tool_choice: Optional[str] = None,
    _max_retries: int = 3,
):
    import asyncio
    payload: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "stream": True,
    }
    if tools:
        payload["tools"] = tools
    if tool_choice:
        payload["tool_choice"] = tool_choice

    logger.debug(
        "[fireworks_llm] Async Stream POST %s/chat/completions model=%s messages=%d",
        FIREWORKS_API_BASE,
        model,
        len(messages),
    )

    last_exc: Exception = RuntimeError("No attempts made")
    for attempt in range(1, _max_retries + 1):
        try:
            t_client_start = time.perf_counter()
            async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
                t_client_end = time.perf_counter()
                logger.info(
                    "[fireworks_llm] [TIMING] AsyncClient instantiation took: %.3f ms", 
                    (t_client_end - t_client_start) * 1000
                )
                
                t_post_start = time.perf_counter()
                async with client.stream(
                    "POST",
                    f"{FIREWORKS_API_BASE}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                        "Accept": "text/event-stream",
                    },
                    json=payload,
                ) as response:
                    t_post_end = time.perf_counter()
                    logger.info(
                        "[fireworks_llm] [TIMING] client.stream POST connection + header response took: %.3f ms", 
                        (t_post_end - t_post_start) * 1000
                    )
                    
                    response.raise_for_status()
                    
                    tool_calls_builder = {}
                    ttft = None
                    t0 = time.perf_counter()
                    
                    async for line in response.aiter_lines():
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
                                
                                # First token/action timing
                                if ttft is None and (delta.get("content") or delta.get("tool_calls")):
                                    ttft = time.perf_counter() - t0
                                    logger.info("[fireworks_llm] Async TTFT: %.3fs", ttft)
                                
                                content = delta.get("content")
                                if content:
                                    try:
                                        yield {"type": "content", "content": content}
                                    except GeneratorExit:
                                        logger.info("[fireworks_llm] GeneratorExit caught at content yield. Exiting stream cleanly.")
                                        return
                                    
                                tool_calls = delta.get("tool_calls")
                                if tool_calls:
                                    for tc in tool_calls:
                                        idx = tc.get("index")
                                        if idx is None:
                                            continue
                                        if idx not in tool_calls_builder:
                                            tool_calls_builder[idx] = {
                                                "id": tc.get("id", ""),
                                                "type": tc.get("type", "function"),
                                                "function": {
                                                    "name": tc.get("function", {}).get("name", ""),
                                                    "arguments": ""
                                                }
                                            }
                                        else:
                                            if "id" in tc and tc["id"]:
                                                tool_calls_builder[idx]["id"] = tc["id"]
                                        
                                        func = tc.get("function") or {}
                                        name_delta = func.get("name", "")
                                        if name_delta:
                                            tool_calls_builder[idx]["function"]["name"] += name_delta
                                        args_delta = func.get("arguments", "")
                                        if args_delta:
                                            tool_calls_builder[idx]["function"]["arguments"] += args_delta
                            except Exception as parse_err:
                                logger.warning("[fireworks_llm] Stream chunk parse error: %s", parse_err)
                    
                    reconstructed_tool_calls = []
                    if tool_calls_builder:
                        for idx in sorted(tool_calls_builder.keys()):
                            reconstructed_tool_calls.append(tool_calls_builder[idx])
                        try:
                            yield {"type": "tool_calls", "tool_calls": reconstructed_tool_calls}
                        except GeneratorExit:
                            logger.info("[fireworks_llm] GeneratorExit caught at tool_calls yield. Exiting stream cleanly.")
                            return
                            
                    total_dur = time.perf_counter() - t0
                    logger.info("[fireworks_llm] Async Stream finished. TTFT: %s, Total: %.3fs", 
                                f"{ttft:.3f}s" if ttft is not None else "N/A", total_dur)
                    return
        except httpx.TimeoutException:
            raise
        except httpx.HTTPStatusError as hse:
            try:
                await hse.response.aread()
                body = hse.response.text
            except Exception:
                body = ""
            is_empty_output_error = (
                hse.response.status_code in (500, 400)
                and "model output must contain either output text" in body
            )
            if is_empty_output_error and attempt < _max_retries:
                wait = 0.5 * attempt
                logger.warning(
                    "[fireworks_llm] Empty-output error on attempt %d/%d — retrying in %.1fs",
                    attempt, _max_retries, wait,
                )
                await asyncio.sleep(wait)
                last_exc = hse
                continue
            logger.error(
                "[fireworks_llm] HTTP %s from Fireworks API (attempt %d/%d): %s",
                hse.response.status_code, attempt, _max_retries,
                body[:500],
            )
            raise
        except Exception as exc:
            logger.error(
                "[fireworks_llm] Unexpected error calling Fireworks API: %s",
                exc,
                exc_info=True,
            )
            raise RuntimeError(f"Unexpected error calling Fireworks AI: {exc}") from exc

    raise last_exc


async def get_response_stream_async(
    user_message: str,
    conversation_history: List[Dict[str, Any]],
    system_prompt: str = None,
    user_id: Optional[str] = None,
    call_id: Optional[str] = None,
):
    api_key = os.getenv("FIREWORKS_API_KEY")
    if not api_key or api_key == "placeholder-fireworks-key":
        raise ValueError(
            "FIREWORKS_API_KEY environment variable is not set or contains a placeholder value."
        )

    model = os.getenv("FIREWORKS_MODEL", DEFAULT_MODEL)

    messages: List[Dict[str, Any]] = []
    for msg in conversation_history:
        if isinstance(msg, dict) and "role" in msg and "content" in msg:
            role = str(msg["role"]).strip().lower()
            if role not in ["system", "user", "assistant", "tool"]:
                role = "user"
            messages.append({"role": role, "content": str(msg["content"])})

    default_sys = (
        "You are Shruti, a helpful female receptionist AI assistant for Saral AI. "
        "Because you are a female and your voice is female (Shruti), you must always refer to yourself "
        "in the female grammatical gender (e.g. use 'कर सकती हूँ', 'करूँगी', 'व्यस्त हूँ', etc. instead "
        "of male verbs/pronouns). "
        "If the caller wants to book or reserve an appointment, you must first call the "
        "hold_appointment_slot tool to check and temporarily hold the slot. "
        "After calling hold_appointment_slot, you MUST explicitly read back the critical "
        "information (date, time, and caller phone number if known) and ask for confirmation. "
        "Only call the confirm_appointment tool if the user explicitly agrees (e.g., says 'yes', "
        "'correct', 'haan', or confirms) after you read back the details. "
        "You must NEVER accept vague times like 'morning', 'afternoon', 'evening', or 'kal subah'. "
        "If a user provides a vague time, you must immediately ask them to clarify by offering "
        "specific options (e.g., 'What exact time works for you? I have slots at 10 AM, 11 AM, "
        "or 12 PM.')."
    )
    sys_content = system_prompt or default_sys

    hinglish_instruction = (
        "\n\n[LANGUAGE GUIDELINE: The user will frequently speak in \"Hinglish\" "
        "(a mix of Hindi and English). "
        "You must perfectly understand this mix. Always reply in the same natural, conversational "
        "language the user is speaking. "
        "Do not use overly formal Hindi; use natural, everyday Hinglish.]"
    )
    if "[LANGUAGE GUIDELINE:" not in sys_content:
        sys_content += hinglish_instruction

    booking_instructions = (
        "\n\n[CRITICAL APPOINTMENT BOOKING RULES]:\n"
        "1. If the caller wants to book or reserve an appointment, you must first call the "
        "hold_appointment_slot tool with the requested slot.\n"
        "2. After calling hold_appointment_slot, you MUST explicitly read back the critical "
        "information (date, time, and caller phone number if known) to confirm with the caller. "
        "E.g., 'Just to confirm - Tuesday 15th at 10am, phone number 9820XXXXXX - is that correct?'\n"
        "3. Only call the confirm_appointment tool if the user explicitly agrees (e.g., says 'yes', "
        "'correct', 'haan', or confirms) after you read back the details.\n"
        "4. You must NEVER accept vague times like 'morning', 'afternoon', 'evening', or 'kal subah'. "
        "If a user provides a vague time, you must immediately ask them to clarify by offering "
        "specific options (e.g., 'What exact time works for you? I have slots at 10 AM, 11 AM, "
        "or 12 PM.')."
    )
    if user_id and "[CRITICAL APPOINTMENT BOOKING RULES]" not in sys_content:
        sys_content += booking_instructions

    strict_datetime_instructions = (
        "\n\n[STRICT DATETIME RESOLUTION RULE]:\n"
        "You must NEVER accept vague times like 'morning', 'afternoon', 'evening', or 'kal subah'. "
        "If a user provides a vague time, you must immediately ask them to clarify by offering "
        "specific options (e.g., 'What exact time works for you? I have slots at 10 AM, 11 AM, "
        "or 12 PM.')."
    )
    if "[STRICT DATETIME RESOLUTION RULE]" not in sys_content:
        sys_content += strict_datetime_instructions

    short_response_instruction = (
        "\n\n[STRICT BREVITY CONSTRAINT]:\n"
        "You must keep your replies extremely short, concise, and direct (maximum 1 or 2 short sentences). "
        "For list items or explanations, output in one-line answers only. "
        "Do NOT speak long paragraphs, and do NOT spam the user with excessive text. Keep it brief and conversational."
    )
    sys_content += short_response_instruction

    system_index = -1
    for i, m in enumerate(messages):
        if m["role"] == "system":
            system_index = i
            break

    if system_index != -1:
        messages[system_index]["content"] = sys_content
    else:
        messages.insert(0, {"role": "system", "content": sys_content})

    messages.append({"role": "user", "content": user_message})

    kwargs: Dict[str, Any] = {}
    if user_id:
        kwargs["tools"] = BOOKING_TOOLS
        kwargs["tool_choice"] = "auto"

    tool_calls = []
    text_content = []
    
    async for event in _fireworks_chat_stream_async(messages=messages, model=model, api_key=api_key, **kwargs):
        if event["type"] == "content":
            text_content.append(event["content"])
            yield event["content"]
        elif event["type"] == "tool_calls":
            tool_calls = event["tool_calls"]

    if tool_calls:
        for tool_call in tool_calls:
            tool_name = tool_call["function"]["name"]
            if tool_name not in ["hold_appointment_slot", "confirm_appointment"]:
                continue

            try:
                args = json.loads(tool_call["function"]["arguments"])
                slot_dt = args.get("slot_datetime")
            except Exception:
                slot_dt = None

            logger.info(
                "[fireworks_llm] LLM requested booking tool call '%s' for slot: %s",
                tool_name,
                slot_dt,
            )

            if slot_dt and user_id:
                if tool_name == "hold_appointment_slot":
                    if not is_valid_iso_datetime(slot_dt):
                        db_result = {
                            "success": False,
                            "error": "INVALID_DATETIME_FORMAT",
                            "message": (
                                "Validation Error: The slot_datetime must be a precise, "
                                "valid ISO-8601 datetime string. Vague inputs like 'morning', "
                                "'afternoon', or 'kal subah' are not allowed. You must "
                                "immediately ask the user to clarify and offer specific slots "
                                "(e.g., 10 AM, 11 AM, or 12 PM)."
                            ),
                        }
                    else:
                        db_result = await run_in_threadpool(
                            hold_booking_slot,
                            user_id=user_id,
                            slot_datetime=slot_dt,
                            call_id=call_id
                        )
                else:
                    db_result = await run_in_threadpool(
                        confirm_booking_slot,
                        user_id=user_id,
                        slot_datetime=slot_dt
                    )
            else:
                db_result = {
                    "success": False,
                    "error": "INVALID_SLOT",
                    "message": "Missing slot datetime or user ID",
                }

            messages.append(
                {
                    "role": "assistant",
                    "content": "".join(text_content),
                    "tool_calls": [
                        {
                            "id": tool_call["id"],
                            "type": "function",
                            "function": {
                                "name": tool_call["function"]["name"],
                                "arguments": tool_call["function"]["arguments"],
                            },
                        }
                    ],
                }
            )

            if db_result["success"]:
                if tool_name == "hold_appointment_slot":
                    tool_output = json.dumps({
                        "status": "success",
                        "message": f"Appointment slot {slot_dt} is now held as pending for 10 minutes.",
                    })
                else:
                    tool_output = json.dumps({
                        "status": "success",
                        "message": f"Appointment slot {slot_dt} has been successfully confirmed.",
                    })
            elif db_result.get("error") == "SLOT_TAKEN":
                tool_output = json.dumps({
                    "status": "error",
                    "reason": "SLOT_TAKEN",
                    "message": "The requested slot is already taken or held by another booking.",
                })
            elif db_result.get("error") == "NO_PENDING_SLOT":
                tool_output = json.dumps({
                    "status": "error",
                    "reason": "NO_PENDING_SLOT",
                    "message": "No pending reservation was found for this time slot. It may have expired.",
                })
            else:
                tool_output = json.dumps({
                    "status": "error",
                    "reason": db_result.get("error"),
                    "message": db_result.get("message"),
                })

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call["id"],
                "content": tool_output,
            })

            async for event in _fireworks_chat_stream_async(messages=messages, model=model, api_key=api_key):
                if event["type"] == "content":
                    yield event["content"]


