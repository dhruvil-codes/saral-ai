-- Step 1: Add notification_preference column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preference TEXT DEFAULT 'urgent_only' CHECK (notification_preference IN ('all', 'urgent_only', 'digest'));

-- Step 2: Ensure call_logs table has a summary column
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS summary TEXT;
