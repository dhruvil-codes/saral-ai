"""
Sarvam AI Service.
Integrates Sarvam AI API for Speech-to-Text (STT), Text-to-Speech (TTS), and translation.
"""

import base64
import os
import time
import logging
import httpx
from dotenv import load_dotenv

# Configure logger
logger = logging.getLogger(__name__)

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
            raise httpx.HTTPStatusError(
                f"Sarvam STT API returned error code {response.status_code}: {response.text}",
                request=response.request,
                response=response
            )
            
        result = response.json()
        if "transcript" not in result:
            raise RuntimeError(
                f"Sarvam STT response did not contain 'transcript' key: {result}"
            )
            
        return result["transcript"]
        
    except (httpx.TimeoutException, httpx.HTTPStatusError) as he:
        raise he
    except httpx.HTTPError as he:
        raise RuntimeError(f"HTTP communication error with Sarvam STT API: {str(he)}") from he
    except Exception as e:
        raise RuntimeError(f"An unexpected error occurred during speech_to_text transcription: {str(e)}") from e

def text_to_speech(
    text: str,
    language_code: str,
    speech_sample_rate: int = 16000,
    output_format: str = "mp3"
) -> bytes:
    """
    Converts the input text into raw audio bytes using Sarvam AI's text-to-speech API.

    Args:
        text (str): The text string to speak.
        language_code (str): The target language (e.g., 'en-IN', 'hi-IN').
        speech_sample_rate (int): The audio sample rate (default 16000).
        output_format (str): The audio format (default 'mp3').

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
        "pace": 1.0,
        "speech_sample_rate": speech_sample_rate,
        "output_format": output_format
    }
    
    logger.info(
        f"Sarvam TTS Request: url={url}, model={payload['model']}, speaker={payload['speaker']}, "
        f"lang={payload['target_language_code']}, sample_rate={payload['speech_sample_rate']}, format={payload['output_format']}"
    )
    
    try:
        api_start = time.perf_counter()
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, headers=headers, json=payload)
        api_duration = (time.perf_counter() - api_start) * 1000
        
        if response.status_code != 200:
            raise httpx.HTTPStatusError(
                f"Sarvam TTS API returned error code {response.status_code}: {response.text}",
                request=response.request,
                response=response
            )
            
        post_start = time.perf_counter()
        result = response.json()
        if "audios" not in result or not result["audios"]:
            raise RuntimeError(
                f"Sarvam TTS response did not contain audio data: {result}"
            )
            
        base64_audio = result["audios"][0]
        decoded_bytes = base64.b64decode(base64_audio)
        post_duration = (time.perf_counter() - post_start) * 1000
        
        logger.info(
            f"Sarvam TTS standard call timings: API call = {api_duration:.1f}ms, "
            f"Post-processing (JSON + base64 decoding) = {post_duration:.1f}ms, Total = {api_duration + post_duration:.1f}ms"
        )
        return decoded_bytes
        
    except (httpx.TimeoutException, httpx.HTTPStatusError) as he:
        raise he
    except httpx.HTTPError as he:
        raise RuntimeError(f"HTTP communication error with Sarvam TTS API: {str(he)}") from he
    except Exception as e:
        raise RuntimeError(f"An unexpected error occurred during text_to_speech generation: {str(e)}") from e


async def text_to_speech_stream(
    text: str,
    language_code: str,
    speech_sample_rate: int = 16000,
    output_audio_codec: str = "mp3"
):
    """
    Converts the input text into a stream of audio bytes using Sarvam AI's streaming text-to-speech API.

    Args:
        text (str): The text string to speak.
        language_code (str): The target language (e.g., 'en-IN', 'hi-IN').
        speech_sample_rate (int): The audio sample rate (default 16000).
        output_audio_codec (str): The audio codec (default 'mp3').

    Yields:
        bytes: Chunks of audio bytes as they arrive from the API.

    Raises:
        ValueError: If input text is empty or SARVAM_API_KEY is not set.
        RuntimeError: If the API call fails.
    """
    if not text or not text.strip():
        raise ValueError("Input text cannot be empty.")

    api_key = os.getenv("SARVAM_API_KEY")
    if not api_key or api_key == "placeholder-sarvam-key":
        try:
            from app.core.config import settings
            api_key = settings.SARVAM_API_KEY
        except Exception:
            pass

    if not api_key or api_key == "placeholder-sarvam-key":
        raise ValueError("SARVAM_API_KEY environment variable is not set or contains a placeholder.")

    url = f"{SARVAM_BASE_URL}/text-to-speech/stream"
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
        "pace": 1.0,
        "speech_sample_rate": speech_sample_rate,
        "output_audio_codec": output_audio_codec
    }
    
    logger.info(
        f"Sarvam TTS Stream Request: url={url}, model={payload['model']}, speaker={payload['speaker']}, "
        f"lang={payload['target_language_code']}, sample_rate={payload['speech_sample_rate']}, codec={payload['output_audio_codec']}"
    )
    
    try:
        start_time = time.perf_counter()
        ttfb_time = None
        total_bytes = 0
        chunks_count = 0
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    raise httpx.HTTPStatusError(
                        f"Sarvam TTS Stream API returned error code {response.status_code}: {error_text.decode('utf-8', errors='ignore')}",
                        request=response.request,
                        response=response
                    )
                
                async for chunk in response.aiter_bytes():
                    if ttfb_time is None:
                        ttfb_time = (time.perf_counter() - start_time) * 1000
                        logger.info(f"Sarvam TTS Stream TTFB (Time to First Byte): {ttfb_time:.1f}ms")
                    
                    total_bytes += len(chunk)
                    chunks_count += 1
                    yield chunk
                    
        total_duration = (time.perf_counter() - start_time) * 1000
        logger.info(
            f"Sarvam TTS Stream completed: TTFB = {ttfb_time:.1f}ms, Total duration = {total_duration:.1f}ms, "
            f"Total bytes = {total_bytes}, Total chunks = {chunks_count}"
        )
        
    except (httpx.TimeoutException, httpx.HTTPStatusError) as he:
        raise he
    except httpx.HTTPError as he:
        raise RuntimeError(f"HTTP communication error with Sarvam TTS Stream API: {str(he)}") from he
    except Exception as e:
        raise RuntimeError(f"An unexpected error occurred during text_to_speech streaming: {str(e)}") from e
