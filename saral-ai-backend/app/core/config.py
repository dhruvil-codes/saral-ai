"""
Configuration module.
Defines project settings and environment variable validation.
"""

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_KEY: str
    REDIS_URL: str
    SARVAM_API_KEY: str
    GROQ_API_KEY: str
    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_PHONE_NUMBER: str
    TWILIO_WHATSAPP_FROM: str
    SECRET_KEY: str
    MAX_CONCURRENT_CALLS: int = 10
    SILENCE_THRESHOLD_MS: int = 1300
    VAD_RMS_THRESHOLD: float = 300.0
    VAD_SAMPLE_RATE: int = 16000
    VAD_CHANNELS: int = 1
    VAD_SAMPLE_WIDTH: int = 2
    VAD_PRE_SPEECH_DURATION_MS: int = 500

    # VAD
    SILERO_MODEL_PATH: str = ""

    # Semantic Caching
    SEMANTIC_CACHE_THRESHOLD: float = 0.85
    SEMANTIC_CACHE_MAX_ENTRIES: int = 200

    # RAG
    RAG_TOP_N: int = 3
    RAG_SIMILARITY_THRESHOLD: float = 0.70

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
