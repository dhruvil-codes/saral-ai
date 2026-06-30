-- Step 1: Alter the faqs table to add last_updated and needs_verification columns
ALTER TABLE faqs 
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS needs_verification BOOLEAN DEFAULT false;

-- Step 2: Backfill any existing rows with the current timestamp
UPDATE faqs 
SET last_updated = now() 
WHERE last_updated IS NULL;

-- Step 3: Recreate the pgvector match_faqs RPC to return the new columns
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
