"""
Redis Client.
Manages connections and operations to Redis cache/message broker.
"""

import logging
from redis import Redis, from_url

logger = logging.getLogger(__name__)

_redis_pool: Redis | None = None


def get_redis() -> Redis:
    """Get or create the Redis client connection."""
    global _redis_pool
    if _redis_pool is None:
        from app.core.config import settings
        _redis_pool = from_url(
            settings.REDIS_URL,
            decode_responses=False,
            health_check_interval=5,
        )
        logger.info("Redis connection established.")
    return _redis_pool
