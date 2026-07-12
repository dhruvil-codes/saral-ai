-- Migration 07: Add pgvector RAG support to faqs table
--
-- Adds:
--   1. pgvector extension (if not already present)
--   2. embedding vector(384) column  – all-MiniLM-L6-v2 output dimension
--   3. last_updated column           – mirrors updated_at; used by FAQResponse
--   4. needs_verification column     – flag for stale/AI-modified FAQs
--   5. match_faqs() RPC function     – cosine similarity search for RAG
--   6. HNSW index for fast ANN search

-- 1. Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add missing columns to faqs (idempotent)
ALTER TABLE faqs
    ADD COLUMN IF NOT EXISTS embedding       vector(384),
    ADD COLUMN IF NOT EXISTS last_updated    TIMESTAMP WITH TIME ZONE
                                             DEFAULT timezone('utc', now()) NOT NULL,
    ADD COLUMN IF NOT EXISTS needs_verification BOOLEAN DEFAULT false NOT NULL;

-- 3. Back-fill last_updated from updated_at for any existing rows
UPDATE faqs
SET last_updated = updated_at
WHERE last_updated IS DISTINCT FROM updated_at;

-- 4. HNSW index for approximate nearest-neighbour search (cosine distance)
CREATE INDEX IF NOT EXISTS faqs_embedding_hnsw_idx
    ON faqs
    USING hnsw (embedding vector_cosine_ops);

-- 5. match_faqs RPC – returns FAQs whose embedding is within `match_threshold`
--    similarity of the supplied query_embedding, filtered by user.
CREATE OR REPLACE FUNCTION match_faqs(
    query_embedding    vector(384),
    match_threshold    float,
    match_count        int,
    filter_user_id     uuid
)
RETURNS TABLE (
    id                 uuid,
    user_id            uuid,
    question           text,
    answer             text,
    similarity         float,
    last_updated       timestamp with time zone,
    needs_verification boolean
)
LANGUAGE sql STABLE
AS $$
    SELECT
        f.id,
        f.user_id,
        f.question,
        f.answer,
        1 - (f.embedding <=> query_embedding) AS similarity,
        f.last_updated,
        f.needs_verification
    FROM faqs f
    WHERE
        f.user_id = filter_user_id
        AND f.embedding IS NOT NULL
        AND 1 - (f.embedding <=> query_embedding) >= match_threshold
    ORDER BY f.embedding <=> query_embedding
    LIMIT match_count;
$$;
