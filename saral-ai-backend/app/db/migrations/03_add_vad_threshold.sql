-- Step 1: Add vad_threshold_ms column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS vad_threshold_ms INTEGER DEFAULT 1000;
