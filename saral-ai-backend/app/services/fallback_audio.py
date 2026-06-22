"""
Fallback Audio Service.
Pre-generates and caches fixed TTS fallback phrases at application startup.
"""

import os
import logging
from typing import Dict, Tuple
from app.services.sarvam import text_to_speech, _normalize_language_code

logger = logging.getLogger(__name__)

# Memory cache for generated audio bytes
# Key: (phrase_id, language_code) -> Value: bytes
_AUDIO_CACHE: Dict[Tuple[str, str], bytes] = {}

# Fixed phrases to pre-generate
FALLBACK_PHRASES = {
    "stt_fallback": "Sorry, could you repeat that?",
    "llm_fallback": "Let me have someone call you back"
}

# Default supported languages to pre-generate at startup
SUPPORTED_LANGUAGES = ["en-IN", "hi-IN"]

def initialize_fallback_audio():
    """
    Called once at application startup.
    Generates audio bytes for fixed phrases and caches them in memory.
    Ensures the server doesn't crash if TTS API is unavailable or api key is missing.
    """
    logger.info("Initializing fallback audio cache...")
    api_key = os.getenv("SARVAM_API_KEY")
    if not api_key or api_key == "placeholder-sarvam-key":
        logger.warning("SARVAM_API_KEY is not set or contains a placeholder. Skipping actual TTS generation. Cache will remain empty.")
        return

    for phrase_id, text in FALLBACK_PHRASES.items():
        for lang in SUPPORTED_LANGUAGES:
            try:
                logger.info(f"Generating fallback audio for '{phrase_id}' in '{lang}'...")
                # Generate audio bytes
                audio_bytes = text_to_speech(
                    text=text,
                    language_code=lang,
                    speech_sample_rate=16000,
                    output_format="mp3"
                )
                if audio_bytes:
                    _AUDIO_CACHE[(phrase_id, lang)] = audio_bytes
                    logger.info(f"Successfully cached '{phrase_id}' in '{lang}' ({len(audio_bytes)} bytes)")
            except Exception as e:
                logger.error(f"Failed to generate fallback audio for '{phrase_id}' in '{lang}': {str(e)}", exc_info=True)

def get_fallback_audio(phrase_id: str, language_code: str = "en-IN") -> bytes:
    """
    Retrieves cached fallback audio bytes.
    If the requested language is not found, falls back to 'en-IN'.
    If no cached audio is available, returns empty bytes.
    """
    normalized_lang = _normalize_language_code(language_code)
    
    # Try normalized language
    if (phrase_id, normalized_lang) in _AUDIO_CACHE:
        return _AUDIO_CACHE[(phrase_id, normalized_lang)]
        
    # Fallback to en-IN
    if (phrase_id, "en-IN") in _AUDIO_CACHE:
        return _AUDIO_CACHE[(phrase_id, "en-IN")]
        
    return b""
