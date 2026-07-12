import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from app.api import auth, faqs, ws_call, calls, bookings, callback, leads, agents
from app.api.auth import get_current_user
from app.workers import faq_worker, digest_worker
import asyncio

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Max history config
MAX_HISTORY = int(os.getenv("MAX_HISTORY", 20))

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.fallback_audio import initialize_fallback_audio
    from app.services.intent_cache import semantic_cache
    from fastapi.concurrency import run_in_threadpool
    from app.workers.faq_worker import faq_scheduler_loop
    from app.workers.digest_worker import daily_digest_scheduler_loop
    
    logger.info("Lifespan startup: initializing fallback audio...")
    try:
        await run_in_threadpool(initialize_fallback_audio)
    except Exception as e:
        logger.warning(f"Failed to initialize fallback audio on startup: {e}")
    
    logger.info("Lifespan startup: loading semantic cache from Redis...")
    try:
        await run_in_threadpool(semantic_cache.load_from_redis)
    except Exception as e:
        logger.warning(f"Failed to load semantic cache from Redis on startup: {e}")

    logger.info("Lifespan startup: preloading embedding model (all-MiniLM-L6-v2)...")
    try:
        from app.services.intent_cache import preload_embedding_model, get_and_reset_model_load_time_ms
        await run_in_threadpool(preload_embedding_model)
        # Flush the startup loading time so it isn't counted in the first WS call telemetry
        await run_in_threadpool(get_and_reset_model_load_time_ms)
    except Exception as e:
        logger.warning(f"Failed to preload embedding model on startup: {e}")
        
    logger.info("Lifespan startup: starting FAQ scheduler loop...")
    faq_task = asyncio.create_task(faq_scheduler_loop())

    logger.info("Lifespan startup: starting Daily Digest scheduler loop...")
    digest_task = asyncio.create_task(daily_digest_scheduler_loop())
    
    yield
    
    logger.info("Lifespan shutdown: cancelling scheduler loops...")
    faq_task.cancel()
    digest_task.cancel()
    try:
        await asyncio.gather(faq_task, digest_task, return_exceptions=True)
    except Exception as e:
        logger.warning(f"Error during lifespan task cancellation: {e}")

from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(title="Saral AI Backend", lifespan=lifespan)

allowed_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True if allowed_origins and allowed_origins[0] != "*" else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth")
app.include_router(agents.router, prefix="/api")
app.include_router(faqs.router, prefix="/api")
app.include_router(calls.router, prefix="/api")
app.include_router(leads.router, prefix="/api")
app.include_router(bookings.router, prefix="/api")
app.include_router(callback.router, prefix="/api")
app.include_router(faq_worker.router, prefix="/api")
app.include_router(digest_worker.router, prefix="/api")
app.include_router(ws_call.router)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/auth/me")
def read_current_user(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}



