-- Step 1: Add Saral activation status to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS saral_active BOOLEAN DEFAULT true;

