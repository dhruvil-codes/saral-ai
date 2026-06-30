"""
Supabase RAG Service.
Wraps pgvector queries for FAQ retrieval.
"""

import logging
from typing import List
from app.db.supabase_client import get_supabase
from app.core.config import settings

logger = logging.getLogger(__name__)


async def get_relevant_faqs(query_embedding: list, user_id: str, top_n: int = None, threshold: float = None) -> List[dict]:
    """
    Fetch the most relevant FAQs for a given user via Supabase pgvector.

    Args:
        query_embedding: Vector (list[float]) for the user query.
        user_id: Supabase UUID of the business user.
        top_n: Maximum number of results (default uses config).
        threshold: Minimum similarity score (default uses config).

    Returns:
        List of dicts with keys: id, question, answer, user_id, similarity
    """
    top_n = top_n or settings.RAG_TOP_N
    threshold = threshold or settings.RAG_SIMILARITY_THRESHOLD

    supabase = get_supabase()

    try:
        # Assumes a Supabase RPC function 'match_faqs' defined as:
        #
        # create or replace function match_faqs(
        #     query_embedding vector(384),
        #     match_threshold float,
        #     match_count int,
        #     filter_user_id uuid
        # )
        # returns table(id uuid, user_id uuid, question text, answer text, similarity float, last_updated timestamp with time zone, needs_verification boolean) ...
        #
        resp = supabase.rpc(
            "match_faqs",
            {
                "query_embedding": query_embedding,
                "match_threshold": threshold,
                "match_count": top_n,
                "filter_user_id": user_id,
            },
        ).execute()

        # Supabase returns data as a list of dicts
        rows = getattr(resp, "data", None) or []
        logger.info(
            f"RAG query returned {len(rows)} FAQs for user {user_id} "
            f"(threshold={threshold}, top_n={top_n}).")
        return rows
    except Exception as exc:
        logger.error(f"RAG query failed: {exc}", exc_info=True)
        return []
