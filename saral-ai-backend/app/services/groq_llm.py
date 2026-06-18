"""
Groq LLM Service.
Handles interaction with Groq API for generating receptionist responses.
"""

import os
from typing import List, Dict, Any
from dotenv import load_dotenv
from groq import Groq, GroqError

# Load environment variables from .env if present
load_dotenv()

def get_response(user_message: str, conversation_history: List[Dict[str, Any]]) -> str:
    """
    Sends the full conversation history plus the new user message to Groq and returns the assistant's reply.

    Args:
        user_message (str): The latest message from the user.
        conversation_history (list): A list of dicts representing the conversation history.
                                     Expected format: [{'role': 'user', 'content': '...'}, ...]

    Returns:
        str: The response text from the assistant.

    Raises:
        ValueError: If the GROQ_API_KEY environment variable is not set.
        RuntimeError: If there is an error during the API request or from the Groq client.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key == "placeholder-groq-key":
        raise ValueError("GROQ_API_KEY environment variable is not set or contains a placeholder value.")

    model = os.getenv("GROQ_MODEL", "llama3-8b-8192")
    
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
    has_system = any(m["role"] == "system" for m in messages)
    if not has_system:
        messages.insert(0, {
            "role": "system",
            "content": "You are a helpful receptionist AI assistant for Saral AI."
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
    except GroqError as ge:
        raise RuntimeError(f"Groq API error occurred: {str(ge)}") from ge
    except Exception as e:
        raise RuntimeError(f"An unexpected error occurred while calling Groq: {str(e)}") from e
