-- Step 1: Add new triage columns to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS urgency_level TEXT,
ADD COLUMN IF NOT EXISTS patient_type TEXT,
ADD COLUMN IF NOT EXISTS requested_slot TEXT,
ADD COLUMN IF NOT EXISTS recommended_action TEXT,
ADD COLUMN IF NOT EXISTS language TEXT;
