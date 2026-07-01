import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from app.api import auth, faqs, ws_call, calls, bookings, callback
from app.api.auth import get_current_user
from app.workers import faq_worker
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
    
    logger.info("Lifespan startup: initializing fallback audio...")
    await run_in_threadpool(initialize_fallback_audio)
    
    logger.info("Lifespan startup: loading semantic cache from Redis...")
    try:
        await run_in_threadpool(semantic_cache.load_from_redis)
    except Exception as e:
        logger.warning(f"Failed to load semantic cache from Redis on startup: {e}")
        
    logger.info("Lifespan startup: starting FAQ scheduler loop...")
    faq_task = asyncio.create_task(faq_scheduler_loop())
    
    yield
    
    logger.info("Lifespan shutdown: cancelling FAQ scheduler loop...")
    faq_task.cancel()
    try:
        await faq_task
    except asyncio.CancelledError:
        pass

app = FastAPI(title="Saral AI Backend", lifespan=lifespan)

app.include_router(auth.router, prefix="/api/auth")
app.include_router(faqs.router, prefix="/api")
app.include_router(calls.router, prefix="/api")
app.include_router(bookings.router, prefix="/api")
app.include_router(callback.router, prefix="/api")
app.include_router(faq_worker.router, prefix="/api")
app.include_router(ws_call.router)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/auth/me")
def read_current_user(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}


