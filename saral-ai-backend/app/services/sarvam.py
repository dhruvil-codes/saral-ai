"""
Sarvam AI Service.
Integrates Sarvam AI API for Speech-to-Text (STT), Text-to-Speech (TTS), and translation.
"""

import base64
import os
import httpx
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

SARVAM_BASE_URL = "https://api.sarvam.ai"

def _normalize_language_code(language_code: str) -> str:
    """
    Normalizes the language code to the BCP-47 region format supported by Sarvam AI.
    E.g., 'en', 'en-US' -> 'en-IN'
          'hi' -> 'hi-IN'
          'ta' -> 'ta-IN'
    """
    if not language_code:
        return "en-IN"
    
    code = language_code.strip().lower()
    
    # Direct mappings for common prefixes
    if code.startswith("en"):
        return "en-IN"
    if code.startswith("hi"):
        return "hi-IN"
        
    # If a region is already specified with a hyphen, uppercase the region part
    if "-" in code:
        parts = code.split("-")
        return f"{parts[0]}-{parts[1].upper()}"
        
    # Default to appending -IN for other languages like bn, ta, te, gu, kn, ml, mr, etc.
    return f"{code}-IN"

def speech_to_text(audio_bytes: bytes, language_code: str) -> str:
    """
    Transcribes the given audio bytes into text using Sarvam AI's speech-to-text API.

    Args:
        audio_bytes (bytes): The raw audio data (PCM/WAV/etc.) to transcribe.
        language_code (str): The language of the audio (e.g., 'en-IN', 'hi-IN').

    Returns:
        str: The transcribed text.

    Raises:
        ValueError: If the SARVAM_API_KEY environment variable is not set.
        RuntimeError: If the API call fails or returns an error response.
    """
    api_key = os.getenv("SARVAM_API_KEY")
    if not api_key or api_key == "placeholder-sarvam-key":
        # Check if settings instance could have it
        try:
            from app.core.config import settings
            api_key = settings.SARVAM_API_KEY
        except Exception:
            pass

    if not api_key or api_key == "placeholder-sarvam-key":
        raise ValueError("SARVAM_API_KEY environment variable is not set or contains a placeholder.")

    url = f"{SARVAM_BASE_URL}/speech-to-text"
    headers = {
        "api-subscription-key": api_key
    }
    
    normalized_lang = _normalize_language_code(language_code)
    
    files = {
        "file": ("audio.wav", audio_bytes, "audio/wav")
    }
    data = {
        "model": "saaras:v3",
        "language_code": normalized_lang,
        "mode": "transcribe"
    }
    
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, headers=headers, files=files, data=data)
            
        if response.status_code != 200:
            raise RuntimeError(
                f"Sarvam STT API returned error code {response.status_code}: {response.text}"
            )
            
        result = response.json()
        if "transcript" not in result:
            raise RuntimeError(
                f"Sarvam STT response did not contain 'transcript' key: {result}"
            )
            
        return result["transcript"]
        
    except httpx.HTTPError as he:
        raise RuntimeError(f"HTTP communication error with Sarvam STT API: {str(he)}") from he
    except Exception as e:
        raise RuntimeError(f"An unexpected error occurred during speech_to_text transcription: {str(e)}") from e

def text_to_speech(text: str, language_code: str) -> bytes:
    """
    Converts the input text into raw audio bytes using Sarvam AI's text-to-speech API.

    Args:
        text (str): The text string to speak.
        language_code (str): The target language (e.g., 'en-IN', 'hi-IN').

    Returns:
        bytes: The decoded raw audio bytes.

    Raises:
        ValueError: If input text is empty or SARVAM_API_KEY is not set.
        RuntimeError: If the API call fails or returns an error response.
    """
    if not text or not text.strip():
        raise ValueError("Input text cannot be empty.")

    api_key = os.getenv("SARVAM_API_KEY")
    if not api_key or api_key == "placeholder-sarvam-key":
        # Check if settings instance could have it
        try:
            from app.core.config import settings
            api_key = settings.SARVAM_API_KEY
        except Exception:
            pass

    if not api_key or api_key == "placeholder-sarvam-key":
        raise ValueError("SARVAM_API_KEY environment variable is not set or contains a placeholder.")

    url = f"{SARVAM_BASE_URL}/text-to-speech"
    headers = {
        "api-subscription-key": api_key,
        "Content-Type": "application/json"
    }
    
    normalized_lang = _normalize_language_code(language_code)
    
    payload = {
        "text": text,
        "model": "bulbul:v3",
        "speaker": "shruti",
        "target_language_code": normalized_lang,
        "pace": 1.0
    }
    
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, headers=headers, json=payload)
            
        if response.status_code != 200:
            raise RuntimeError(
                f"Sarvam TTS API returned error code {response.status_code}: {response.text}"
            )
            
        result = response.json()
        if "audios" not in result or not result["audios"]:
            raise RuntimeError(
                f"Sarvam TTS response did not contain audio data: {result}"
            )
            
        base64_audio = result["audios"][0]
        return base64.b64decode(base64_audio)
        
    except httpx.HTTPError as he:
        raise RuntimeError(f"HTTP communication error with Sarvam TTS API: {str(he)}") from he
    except Exception as e:
        raise RuntimeError(f"An unexpected error occurred during text_to_speech generation: {str(e)}") from e
