-- 1. Create bookings table if not exists
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slot_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled'
    expires_at TIMESTAMP WITH TIME ZONE,
    call_id UUID, -- stores the call log session ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_slot UNIQUE (user_id, slot_datetime)
);

-- 2. Alter existing bookings table status column default and add columns if it already exists
ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS call_id UUID;

-- 3. Create indices on user_id and call_id
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_call_id ON bookings(call_id);

-- 4. Create or replace the match_faqs RPC (currently missing in schema)
CREATE OR REPLACE FUNCTION match_faqs (
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  filter_user_id uuid
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  question text,
  answer text,
  similarity float,
  last_updated timestamp with time zone,
  needs_verification boolean
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    faqs.id,
    faqs.user_id,
    faqs.question,
    faqs.answer,
    1 - (faqs.embedding <=> query_embedding) AS similarity,
    faqs.last_updated,
    faqs.needs_verification
  FROM faqs
  WHERE faqs.user_id = filter_user_id
    AND 1 - (faqs.embedding <=> query_embedding) > match_threshold
  ORDER BY faqs.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
