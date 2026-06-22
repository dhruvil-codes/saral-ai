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
    SILENCE_THRESHOLD_MS: int = 600
    VAD_RMS_THRESHOLD: float = 500.0
    VAD_SAMPLE_RATE: int = 16000
    VAD_CHANNELS: int = 1
    VAD_SAMPLE_WIDTH: int = 2

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
