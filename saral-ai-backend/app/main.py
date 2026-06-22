import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from app.api import auth, faqs, ws_call
from app.api.auth import get_current_user

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Max history config
MAX_HISTORY = int(os.getenv("MAX_HISTORY", 20))

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.fallback_audio import initialize_fallback_audio
    from fastapi.concurrency import run_in_threadpool
    logger.info("Lifespan startup: initializing fallback audio...")
    await run_in_threadpool(initialize_fallback_audio)
    yield

app = FastAPI(title="Saral AI Backend", lifespan=lifespan)

app.include_router(auth.router, prefix="/api/auth")
app.include_router(faqs.router, prefix="/api")
app.include_router(ws_call.router)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/auth/me")
def read_current_user(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}


