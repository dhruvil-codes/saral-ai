-- Migration 08: Add system_prompt and voice_id to users table
--
-- Adds:
--   1. system_prompt TEXT column to store user's custom agent instructions.
--   2. voice_id TEXT column to store user's custom Sarvam TTS speaker selection.

ALTER TABLE users ADD COLUMN IF NOT EXISTS system_prompt TEXT DEFAULT 'You are a friendly AI receptionist for City Physiotherapy Clinic. Your name is Shruti. Always be warm, professional, and speak in a mix of Hindi and English (Hinglish) when appropriate.';
ALTER TABLE users ADD COLUMN IF NOT EXISTS voice_id TEXT DEFAULT 'shruti';
