"""
Groq LLM Service.
Handles interaction with Groq API for generating receptionist responses.
"""

import os
from typing import List, Dict, Any
from dotenv import load_dotenv
import httpx
from groq import Groq, GroqError, APITimeoutError, APIStatusError

# Load environment variables from .env if present
load_dotenv()

def get_response(user_message: str, conversation_history: List[Dict[str, Any]], system_prompt: str = None) -> str:
    """
    Sends the full conversation history plus the new user message to Groq and returns the assistant's reply.

    Args:
        user_message (str): The latest message from the user.
        conversation_history (list): A list of dicts representing the conversation history.
                                     Expected format: [{'role': 'user', 'content': '...'}, ...]
        system_prompt (str): Optional system prompt overrides/extensions (e.g. injected FAQs).

    Returns:
        str: The response text from the assistant.

    Raises:
        ValueError: If the GROQ_API_KEY environment variable is not set.
        RuntimeError: If there is an error during the API request or from the Groq client.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key == "placeholder-groq-key":
        raise ValueError("GROQ_API_KEY environment variable is not set or contains a placeholder value.")

    # Using "openai/gpt-oss-20b" as the default model.
    # Note: "llama3-8b-8192" was decommissioned/deprecated on June 17, 2026.
    # "openai/gpt-oss-20b" is Groq's recommended fast-inference replacement.
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
            # Enforce valid roles: system, user, assistant
            if role not in ["system", "user", "assistant"]:
                role = "user"
            messages.append({
                "role": role,
                "content": str(msg["content"])
            })

    # Ensure there is a system prompt present
    sys_content = system_prompt or "You are a helpful receptionist AI assistant for Saral AI."
    
    # Check if a system prompt is already in messages
    system_index = -1
    for i, m in enumerate(messages):
        if m["role"] == "system":
            system_index = i
            break
            
    if system_index != -1:
        # If dynamic system prompt is passed, update the existing system message content
        if system_prompt:
            messages[system_index]["content"] = system_prompt
    else:
        messages.insert(0, {
            "role": "system",
            "content": sys_content
        })

    # Append the latest user message
    messages.append({
        "role": "user",
        "content": user_message
    })

    try:
        chat_completion = client.chat.completions.create(
            messages=messages,
            model=model,
        )
        if not chat_completion.choices or not chat_completion.choices[0].message:
            raise RuntimeError("Received an empty response from Groq LLM API.")
            
        return chat_completion.choices[0].message.content
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
        raise RuntimeError(f"An unexpected error occurred while calling Groq: {str(e)}") from e
