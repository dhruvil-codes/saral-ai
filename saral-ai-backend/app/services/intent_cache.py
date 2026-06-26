"""
Semantic Intent Cache.
Caches frequent query embeddings and their corresponding pre-generated
TTS audio bytes. Uses a local SentenceTransformer model for fast embeddings
and Redis for persistent storage.
"""

import json
import time
import logging
import base64
import numpy as np
from typing import List, Optional
from fastapi.concurrency import run_in_threadpool
from app.core.redis_client import get_redis
from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy-loaded local embedding model
# ---------------------------------------------------------------------------
_embedding_model = None


def _load_model():
    global _embedding_model
    if _embedding_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("Semantic cache embedding model loaded (all-MiniLM-L6-v2).")
        except ImportError:
            logger.warning("sentence-transformers not installed. Semantic cache disabled.")
            _embedding_model = False
        except Exception as exc:
            logger.error(f"Failed to load embedding model: {exc}")
            _embedding_model = False
    return _embedding_model


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    dot = np.dot(a, b)
    norm = np.linalg.norm(a) * np.linalg.norm(b)
    return float(dot / norm) if norm != 0 else 0.0


class IntentCacheEntry:
    def __init__(self, text: str, response: str, language: str, embedding: List[float], audio_bytes: Optional[bytes] = None):
        self.text = text
        self.response = response
        self.language = language
        self.embedding = np.array(embedding, dtype=np.float32)
        self.audio_bytes = audio_bytes or b""
        self.created_at = time.time()

    def serialize(self) -> dict:
        return {
            "text": self.text,
            "response": self.response,
            "language": self.language,
            "embedding": self.embedding.tolist(),
            "audio": base64.b64encode(self.audio_bytes).decode() if self.audio_bytes else "",
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, data: dict):
        entry = cls(
            text=data["text"],
            response=data["response"],
            language=data.get("language", "en-IN"),
            embedding=data["embedding"],
            audio_bytes=base64.b64decode(data["audio"]) if data.get("audio") else b"",
        )
        entry.created_at = data.get("created_at", time.time())
        return entry


class SemanticCache:
    def __init__(self, threshold: float = None, max_entries: int = None):
        self.threshold = threshold or settings.SEMANTIC_CACHE_THRESHOLD
        self.max_entries = max_entries or settings.SEMANTIC_CACHE_MAX_ENTRIES
        self._redis = get_redis()
        self._key = "semantic_cache:intents"
        self._entries: List[IntentCacheEntry] = []

    # -------------------------------------------------------------------
    # Startup / shutdown helpers
    # -------------------------------------------------------------------

    def load_from_redis(self):
        """Load all cache entries into memory from Redis."""
        self._entries = []
        try:
            raw = self._redis.get(self._key)
            if raw:
                data = json.loads(raw.decode("utf-8"))
                if isinstance(data, list):
                    for item in data:
                        try:
                            self._entries.append(IntentCacheEntry.from_dict(item))
                        except Exception as exc:
                            logger.warning(f"Failed to load cache entry: {exc}")
        except Exception as exc:
            logger.error(f"Failed to load cache from Redis: {exc}")

    def save_to_redis(self):
        """Persist in-memory cache to Redis."""
        try:
            payload = json.dumps([entry.serialize() for entry in self._entries])
            self._redis.set(self._key, payload.encode("utf-8"))
        except Exception as exc:
            logger.error(f"Failed to save cache to Redis: {exc}")

    # -------------------------------------------------------------------
    # Core logic
    # -------------------------------------------------------------------

    async def embed_text(self, text: str) -> np.ndarray:
        """Compute normalized embedding for a single sentence."""
        model = _load_model()
        if model is False:
            raise RuntimeError("Embedding model not available.")

        def _run():
            emb = model.encode(text, convert_to_tensor=False, convert_to_numpy=True)
            norms = np.linalg.norm(emb, axis=-1, keepdims=True)
            return emb / norms

        return await run_in_threadpool(_run)

    def find(self, embedding: np.ndarray):
        """
        Find the best matching cached intent.

        Returns:
            Tuple of (match_found_bool, entry_or_None)
        """
        if _load_model() is False:
            return False, None

        best_score = -1.0
        best_entry = None

        for entry in self._entries:
            score = _cosine_similarity(embedding, entry.embedding)
            if score > best_score:
                best_score = score
                best_entry = entry

        if best_score >= self.threshold:
            logger.info(f"Semantic cache HIT (score={best_score:.3f})")
            return True, best_entry

        logger.debug(f"Semantic cache MISS (best_score={best_score:.3f})")
        return False, None

    def add(self, text: str, response: str, language: str, embedding: np.ndarray, audio_bytes: Optional[bytes] = None):
        """
        Store a new intent / response / audio in the cache.
        Evicts oldest if max_entries exceeded.
        """
        if _load_model() is False:
            return

        entry = IntentCacheEntry(
            text=text,
            response=response,
            language=language,
            embedding=embedding.tolist(),
            audio_bytes=audio_bytes,
        )

        self._entries.append(entry)

        # Simple eviction: keep only the last max_entries
        if len(self._entries) > self.max_entries:
            self._entries = self._entries[-self.max_entries:]

        self.save_to_redis()

    async def lookup(self, text: str, language: str = "en-IN"):
        """
        Embed query text and search for a semantic match.

        Returns:
            dict with keys 'response', 'audio_bytes' or None
        """
        try:
            embedding = await self.embed_text(text)
        except Exception as exc:
            logger.warning(f"Embedding failed: {exc}")
            return None

        found, entry = self.find(embedding)
        if found and entry:
            return {
                "response": entry.response,
                "audio_bytes": entry.audio_bytes,
                "language": entry.language,
            }
        return None


# Global singleton
semantic_cache = SemanticCache()
