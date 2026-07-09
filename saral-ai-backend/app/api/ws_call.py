"""
WebSocket voice call router with structured latency logging and silence-based VAD.
"""

import os
import time
import uuid
import json
import logging
import asyncio
from datetime import datetime, timezone
import httpx
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool
from app.services.sarvam import speech_to_text, text_to_speech, text_to_speech_stream
from app.services.fireworks_llm import get_response, get_response_stream_async
from app.services.fallback_audio import get_fallback_audio
from app.utils.vad import VoiceActivityDetector
from app.services.intent_cache import semantic_cache, get_and_reset_model_load_time_ms
from app.services.supabase_db import get_relevant_faqs
from app.db.supabase_client import get_supabase
from app.services.whatsapp import send_post_call_summary
from app.core.config import settings

import re
from datetime import timedelta

# Configure logger
logger = logging.getLogger(__name__)

# Module-level set to hold strong references to in-flight background tasks.
# asyncio.create_task() without storing a reference can cause silent garbage
# collection before the task completes (especially during object teardown like
# a WebSocket closing). Tasks remove themselves via a done-callback.
BACKGROUND_TASKS: set[asyncio.Task] = set()


def _schedule_background_task(coro) -> asyncio.Task:
    """Creates an asyncio task, holds a reference to prevent GC, and auto-removes
    the reference via a done-callback when the task completes or is cancelled."""
    # DIAG-1: confirm BACKGROUND_TASKS is the same module-level object each call
    print(f"[DIAG-1] _schedule_background_task called. id(BACKGROUND_TASKS)={id(BACKGROUND_TASKS)} len_before={len(BACKGROUND_TASKS)}", flush=True)
    task = asyncio.create_task(coro)
    BACKGROUND_TASKS.add(task)
    task.add_done_callback(BACKGROUND_TASKS.discard)
    print(f"[DIAG-1] Task created and stored. id(BACKGROUND_TASKS)={id(BACKGROUND_TASKS)} len_after={len(BACKGROUND_TASKS)}", flush=True)
    return task

class ConnectionManager:
    def __init__(self):
        self.active_connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> bool:
        max_concurrent = settings.MAX_CONCURRENT_CALLS
        if len(self.active_connections) >= max_concurrent:
            logger.warning(f"Connection rejected: current active connections ({len(self.active_connections)}) >= max limit ({max_concurrent})")
            await websocket.accept()
            await websocket.close(code=1013)  # 1013: Try Again Later / Busy Signal
            return False
        
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"Connection accepted: active count={len(self.active_connections)}")
        return True

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"Connection disconnected: active count={len(self.active_connections)}")

manager = ConnectionManager()


def extract_amount(text: str) -> str:
    match = re.search(r'(?:Rs\.?|₹|rupees|INR)\s*[\d,]+(?:\.\d+)?', text, re.IGNORECASE)
    if match:
        return match.group(0)
    match = re.search(r'[\d,]+(?:\.\d+)?\s*(?:rupees|rs|INR|₹)', text, re.IGNORECASE)
    if match:
        return match.group(0)
    match = re.search(r'[\d,]+(?:\.\d+)?', text)
    if match:
        return match.group(0)
    return "the listed amount"

def parse_last_updated(val) -> datetime:
    if not val:
        return datetime.now(timezone.utc)
    if isinstance(val, datetime):
        return val
    try:
        if isinstance(val, str):
            if val.endswith('Z'):
                val = val[:-1] + '+00:00'
            return datetime.fromisoformat(val)
    except Exception:
        pass
    return datetime.now(timezone.utc)

router = APIRouter()

# Max history config
MAX_HISTORY = int(os.getenv("MAX_HISTORY", 20))

async def _play_fallback_audio(websocket: WebSocket, phrase_id: str, language: str):
    """
    Sends the pre-cached fallback audio clip corresponding to phrase_id and language.
    """
    try:
        audio_bytes = get_fallback_audio(phrase_id, language)
        if audio_bytes:
            await websocket.send_json({
                "status": "tts_start"
            })
            await websocket.send_bytes(audio_bytes)
            await websocket.send_json({
                "status": "tts_end"
            })
        else:
            logger.warning(f"No fallback audio bytes found for '{phrase_id}' in language '{language}'")
    except Exception as e:
        logger.error(f"Failed to play fallback audio: {str(e)}", exc_info=True)


async def run_stage2_triage_background(call_id: str, user_id: str, caller_number: str, transcript: str):
    """
    Runs Stage 2 triage post-call extraction on a threadpool,
    then saves the structured results into the database.

    Writes directly to dedicated triage columns (urgency_level, patient_type,
    requested_slot, recommended_action, language) instead of JSON-stringifying
    everything into the deprecated 'budget' column.
    """
    # DIAG-2: guaranteed-flush print BEFORE any async/IO — tells us if we were even entered
    print(f"[DIAG-2] run_stage2_triage_background ENTERED. call_id={call_id} transcript_len={len(transcript)}", flush=True)
    logger.info(f"Starting Stage 2 triage background task for call_id={call_id}")
    try:
        from app.services.stage2_triage import extract_case_summary
        
        # Run minimax-m3 inference in a threadpool to prevent blocking the event loop
        triage_data = await run_in_threadpool(extract_case_summary, transcript)
        
        is_fallback = triage_data.get("complaint") == "Could not extract complaint details"
        if is_fallback:
            logger.warning(f"Stage 2 triage for call_id={call_id} completed using safe fallbacks.")
        else:
            logger.info(f"Stage 2 triage for call_id={call_id} completed successfully: {triage_data}")
            
        # Store in Supabase leads table using dedicated schema columns
        supabase = get_supabase()
        lead_data = {
            "call_log_id": call_id,
            "user_id": user_id,
            "caller_number": caller_number,
            # Mapped fields (unchanged from before)
            "name": triage_data.get("caller_name") or "Unknown Patient",
            "interest": triage_data.get("complaint") or "No complaint captured",
            "urgency": triage_data.get("urgency_level") or "routine",
            # Dedicated triage columns (replaces the budget JSON blob hack)
            "urgency_level": triage_data.get("urgency_level"),
            "patient_type": triage_data.get("patient_type"),
            "requested_slot": triage_data.get("requested_slot"),
            "recommended_action": triage_data.get("recommended_action"),
            "language": triage_data.get("language"),
            "status": "new",
            # NOTE: 'budget' column intentionally omitted — was a JSON blob hack
        }
        
        def _insert_lead():
            return supabase.table("leads").insert(lead_data).execute()
        await run_in_threadpool(_insert_lead)
        logger.info(f"Successfully stored Stage 2 triage result in 'leads' table for call_id={call_id}.")

    except asyncio.CancelledError:
        # Log explicit cancellation so it's visible in logs (not silently dropped)
        logger.warning(
            f"Stage 2 triage background task for call_id={call_id} was cancelled "
            "(e.g., event loop shutdown during server restart). "
            "DB write may be incomplete."
        )
        raise  # Re-raise so asyncio can clean up properly
    except Exception as e:
        logger.error(
            f"Stage 2 triage background task for call_id={call_id} failed with unhandled exception: {e}",
            exc_info=True
        )


@router.websocket("/ws/call")
async def websocket_call(websocket: WebSocket, language: str = "en-IN", call_id: str = None, user_id: str = None):
    """
    WebSocket endpoint for real-time voice call handling.
    Accepts raw audio bytes, transcribes them using Sarvam STT,
    sends the transcription back to the client, generates a response
    via Groq LLM, synthesizes the reply into audio using Sarvam TTS,
    and sends the audio bytes back.
    """
    if not await manager.connect(websocket):
        return

    if not call_id:
        call_id = str(uuid.uuid4())
        
    caller_number = "unknown"
    if call_id:
        try:
            supabase = get_supabase()
            def _get_caller():
                return supabase.table("call_logs").select("caller_number").eq("id", call_id).execute()
            existing_res = await run_in_threadpool(_get_caller)
            if existing_res.data:
                caller_number = existing_res.data[0].get("caller_number", "unknown")
        except Exception as e:
            logger.error(f"Failed to fetch caller_number for session: {e}")

    logger.info(f"WebSocket connection established with language={language}, call_id={call_id}, user_id={user_id}, caller_number={caller_number}")
    
    conversation_history = []
    turn_number = 0
    
    # Use settings.SILENCE_THRESHOLD_MS from config/env as the default baseline VAD threshold
    vad_threshold = settings.SILENCE_THRESHOLD_MS
    if user_id:
        try:
            supabase = get_supabase()
            def _get_vad():
                return supabase.table("users").select("vad_threshold_ms").eq("id", user_id).execute()
            user_res = await run_in_threadpool(_get_vad)
            if user_res.data and user_res.data[0].get("vad_threshold_ms") is not None:
                raw_val = user_res.data[0]["vad_threshold_ms"]
                if isinstance(raw_val, int):
                    vad_threshold = max(600, min(2000, raw_val))
                elif isinstance(raw_val, str):
                    clean_val = raw_val.lower().replace("ms", "").strip()
                    if "-" in clean_val:
                        parts = clean_val.split("-")
                        try:
                            v1 = int(parts[0].strip())
                            v2 = int(parts[1].strip())
                            vad_threshold = int((v1 + v2) / 2)
                        except ValueError:
                            vad_threshold = 1000
                    else:
                        try:
                            vad_threshold = int(clean_val)
                        except ValueError:
                            vad_threshold = 1000
                    vad_threshold = max(600, min(2000, vad_threshold))
                logger.info(f"Using VAD threshold: {vad_threshold}ms (fetched for user {user_id})")
        except Exception as e:
            logger.error(f"Failed to fetch vad_threshold_ms for user {user_id}: {e}")
            
    vad_detector = VoiceActivityDetector(silence_threshold_ms=vad_threshold)
    turn_start_time = None
    speech_start_time = None
    dead_air_before_speech_ms = 0
    actual_speech_duration_ms = 0
    llm_failure_count = 0
    
    incoming_audio_queue = asyncio.Queue()
    interrupt_event = asyncio.Event()

    async def ws_receiver():
        try:
            while True:
                message = await websocket.receive()
                if "bytes" in message:
                    await incoming_audio_queue.put(message["bytes"])
                elif "text" in message:
                    try:
                        data = json.loads(message["text"])
                        if data.get("event") == "barge_in":
                            logger.info("Barge-in event received from client. Setting interrupt_event.")
                            interrupt_event.set()
                    except Exception as e:
                        logger.warning(f"Error parsing client text message: {e}")
        except WebSocketDisconnect:
            logger.info("ws_receiver: WebSocket disconnected by client.")
            await incoming_audio_queue.put(None)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.warning(f"ws_receiver exception: {e}")
            await incoming_audio_queue.put(None)

    receiver_task = asyncio.create_task(ws_receiver())
    
    # Play initial welcome greeting on connection
    welcome_text = "Hello! How can I help you today?" if language.startswith("en") else "नमस्ते! मैं आपकी क्या सहायता कर सकता हूँ?"
    logger.info(f"Playing initial welcome greeting: '{welcome_text}'")
    try:
        await websocket.send_json({"status": "tts_start"})
        async for chunk in text_to_speech_stream(welcome_text, language):
            if chunk:
                await websocket.send_bytes(chunk)
        await websocket.send_json({"status": "tts_end"})
        conversation_history.append({"role": "assistant", "content": welcome_text})
    except Exception as e:
        logger.error(f"Failed to play initial welcome greeting: {e}")
        
    try:
        while True:
            # Clear interrupt event before reading new turn audio
            interrupt_event.clear()

            # 1. Receive raw audio bytes from queue
            audio_bytes = await incoming_audio_queue.get()
            if audio_bytes is None:
                raise WebSocketDisconnect()
            
            if not audio_bytes:
                continue
                
            # Log chunk information
            is_container = vad_detector.is_container_format(audio_bytes)
            is_dummy = len(audio_bytes) < 100
            
            # Calculate RMS of received chunk
            import struct
            import math
            num_samples = len(audio_bytes) // 2
            if num_samples > 0 and not is_container:
                fmt = f"<{num_samples}h"
                try:
                    samples = struct.unpack(fmt, audio_bytes[:num_samples * 2])
                    sum_squares = sum(float(s) ** 2 for s in samples)
                    chunk_rms = math.sqrt(sum_squares / num_samples)
                except Exception:
                    chunk_rms = -1.0
            else:
                chunk_rms = 0.0
                
            logger.info(f"Received audio chunk: size={len(audio_bytes)} bytes, rms={chunk_rms:.1f}, is_container={is_container}, is_dummy={is_dummy}")
            
            if turn_start_time is None:
                turn_start_time = time.perf_counter()
            
            if is_container or is_dummy:
                # Container formats / dummy chunks are handled immediately for compatibility.
                # VAD gating does not apply here.
                trigger_stt = True
                audio_to_process = audio_bytes
                stt_trigger_time = time.perf_counter()
                buffering_overhead_ms = 0
                silence_wait_ms = 0
                dead_air_before_speech_ms = 0
                actual_speech_duration_ms = 0
                vad_detector.reset()
                turn_start_time = None
                speech_start_time = None
            else:
                # Process streaming PCM chunk with VAD.
                #
                # Optimization (cost + latency):
                # - Do NOT accumulate silent/noise frames in the STT buffer.
                # - Only keep audio bytes after VAD flips into "speech_detected".
                #
                # Note: VoiceActivityDetector.process_chunk() appends into vad_detector.audio_buffer
                # internally, so we prune/reset when we detect silence.
                speech_was_detected_before = vad_detector.speech_detected
                is_silence_detected = vad_detector.process_chunk(audio_bytes)

                if not speech_was_detected_before and vad_detector.speech_detected:
                    speech_start_time = time.perf_counter()

                if not vad_detector.speech_detected:
                    # Still in pre-speech region: the rolling pre-speech buffer inside
                    # vad_detector already retains the last ~500 ms of audio so that
                    # when speech onset IS detected those frames can be prepended to the
                    # utterance. Do NOT wipe audio_buffer here — the VAD owns it.
                    pass
                else:
                    # Speech is active; keep buffering until end-of-utterance.
                    # (End-of-utterance is signaled by is_silence_detected.)
                    pass

                max_audio_limit_reached = len(vad_detector.audio_buffer) >= 480000  # ~15s safety limit

                if is_silence_detected or max_audio_limit_reached:
                    trigger_stt = True
                    audio_to_process = bytes(vad_detector.audio_buffer)
                    if not vad_detector.is_container_format(audio_to_process):
                        import io
                        import wave
                        wav_buf = io.BytesIO()
                        with wave.open(wav_buf, "wb") as wav_file:
                            wav_file.setnchannels(1)
                            wav_file.setsampwidth(2)
                            wav_file.setframerate(16000)
                            wav_file.writeframes(audio_to_process)
                        audio_to_process = wav_buf.getvalue()

                    stt_trigger_time = time.perf_counter()
                    silence_wait_ms = int(round(vad_detector.total_processed_ms - vad_detector.get_speech_end_time_ms()))

                    if speech_start_time is not None:
                        dead_air_before_speech_ms = int(round((speech_start_time - turn_start_time) * 1000))
                        actual_speech_duration_ms = int(round((stt_trigger_time - speech_start_time) * 1000)) - silence_wait_ms
                    else:
                        dead_air_before_speech_ms = 0
                        actual_speech_duration_ms = int(round((stt_trigger_time - turn_start_time) * 1000)) - silence_wait_ms

                    buffering_overhead_ms = int(round((stt_trigger_time - turn_start_time) * 1000))
                    vad_detector.reset()
                    turn_start_time = None
                    speech_start_time = None
                else:
                    trigger_stt = False
                    
            if not trigger_stt:
                continue
                
            turn_number += 1
            turn_id = f"{call_id}-{turn_number}"
            
            try:
                # 2. Speech to Text (run in threadpool since it's blocking synchronous)
                logger.info(f"[{turn_id}] Starting Speech-to-Text translation...")
                stt_start = time.perf_counter()
                try:
                    transcript = await asyncio.wait_for(
                        run_in_threadpool(speech_to_text, audio_to_process, language),
                        timeout=3.0
                    )
                except asyncio.TimeoutError as te:
                    logger.error(f"STT Timeout Error: {str(te)}", exc_info=True)
                    await _play_fallback_audio(websocket, "stt_fallback", language)
                    continue
                except httpx.TimeoutException as te:
                    logger.error(f"STT HTTP Timeout Exception: {str(te)}", exc_info=True)
                    await _play_fallback_audio(websocket, "stt_fallback", language)
                    continue
                except httpx.HTTPStatusError as hse:
                    logger.error(f"STT HTTP Status Error: {str(hse)}", exc_info=True)
                    await _play_fallback_audio(websocket, "stt_fallback", language)
                    continue
                except Exception as e:
                    logger.error(f"STT General Failure: {str(e)}", exc_info=True)
                    await _play_fallback_audio(websocket, "stt_fallback", language)
                    continue

                stt_end = time.perf_counter()
                
                stt_api_ms = int(round((stt_end - stt_start) * 1000))
                stt_ms = buffering_overhead_ms + stt_api_ms
                logger.info(f"STT Transcript: {transcript}")

                # ── STEP 1: Hallucination check (pure CPU) ───────────────────
                _t_halluc_start = time.perf_counter()
                norm_text = "".join(c for c in transcript.lower() if c.isalnum() or c.isspace()).strip()
                hallucinations = {
                    "thank you", "thank you so much", "thanks for watching", 
                    "subtitles by", "subtitle by", "thanks", "you", "yo"
                }
                _t_halluc_end = time.perf_counter()

                # If transcript is empty or matches a known Whisper silent hallucination, skip
                if not transcript or not transcript.strip() or norm_text in hallucinations:
                    logger.info(f"STT transcript '{transcript}' is empty or detected as a Whisper silent hallucination. Skipping LLM generation.")
                    continue

                # ── STEP 2: Send "transcribed" WS message ────────────────────
                _t_transcribed_send_start = time.perf_counter()
                await websocket.send_json({
                    "status": "transcribed",
                    "text": transcript
                })
                _t_transcribed_send_end = time.perf_counter()
                
                # ── STEP 3: History append + cap (pure CPU) ──────────────────
                _t_history_start = time.perf_counter()
                conversation_history.append({
                    "role": "user",
                    "content": transcript
                })
                if len(conversation_history) > MAX_HISTORY:
                    conversation_history = conversation_history[-MAX_HISTORY:]
                _t_history_end = time.perf_counter()
                
                user_speech_end_time = stt_trigger_time - (silence_wait_ms / 1000)
                llm_generation_ms = 0
                tts_total_drain_ms = 0
                time_to_first_audio_ms = None

                # ── STEP 4: Semantic Cache Lookup ────────────────────────────
                # Check whether embedding model is available before calling lookup
                from app.services.intent_cache import _load_model as _cache_load_model
                _cache_model_available = _cache_load_model() is not False
                _t_cache_start = time.perf_counter()
                try:
                    cache_hit = await asyncio.wait_for(
                        semantic_cache.lookup(transcript, language),
                        timeout=0.2  # 200ms hard ceiling — cache is an optimisation, not a gate
                    )
                except asyncio.TimeoutError:
                    cache_hit = None
                    logger.warning(
                        f"[{turn_id}] [STEP_TIMING] cache_lookup TIMEOUT (>200ms) — skipping cache, "
                        "proceeding directly to LLM generation."
                    )
                _t_cache_end = time.perf_counter()
                logger.info(
                    f"[{turn_id}] [STEP_TIMING] cache_lookup: model_available={_cache_model_available} "
                    f"hit={bool(cache_hit)} "
                    f"duration_ms={int(round((_t_cache_end - _t_cache_start)*1000))}"
                )
                if cache_hit:
                    logger.info("Semantic cache HIT. Returning cached response immediately.")
                    cached_reply = cache_hit["response"]
                    cached_audio = cache_hit["audio_bytes"]
                    
                    conversation_history.append({
                        "role": "assistant",
                        "content": cached_reply
                    })
                    if len(conversation_history) > MAX_HISTORY:
                        conversation_history = conversation_history[-MAX_HISTORY:]
                        
                    first_audio_sent_at = None
                    cached_tts_start_at = time.perf_counter()

                    await websocket.send_json({
                        "status": "tts_start"
                    })
                    if cached_audio:
                        first_audio_sent_at = time.perf_counter()
                        await websocket.send_bytes(cached_audio)
                    else:
                        async for chunk in text_to_speech_stream(cached_reply, language):
                            if chunk:
                                if first_audio_sent_at is None:
                                    first_audio_sent_at = time.perf_counter()
                                await websocket.send_bytes(chunk)
                                
                    await websocket.send_json({
                        "status": "tts_end"
                    })
                    cached_tts_end_at = time.perf_counter()
                    tts_total_drain_ms = int(round((cached_tts_end_at - cached_tts_start_at) * 1000))
                    if first_audio_sent_at is not None:
                        time_to_first_audio_ms = int(round((first_audio_sent_at - user_speech_end_time) * 1000))
                    
                    model_load_ms = int(round(get_and_reset_model_load_time_ms()))
                    
                    # Latency logging for cache hit
                    latency_log = {
                        "call_id": call_id,
                        "turn_id": turn_id,
                        "turn_number": turn_number,
                        "stt_ms": stt_ms,
                        "stt_api_ms": stt_api_ms,
                        "stt_buffering_overhead_ms": buffering_overhead_ms,
                        "dead_air_before_speech_ms": dead_air_before_speech_ms,
                        "actual_speech_duration_ms": actual_speech_duration_ms,
                        "stt_silence_wait_ms": silence_wait_ms,
                        "cache_lookup_ms": int(round((_t_cache_end - _t_cache_start)*1000)),
                        "model_load_ms": model_load_ms,
                        "llm_generation_ms": 0,
                        "tts_total_drain_ms": tts_total_drain_ms,
                        "time_to_first_audio_ms": time_to_first_audio_ms,
                        "total_ms": stt_ms + tts_total_drain_ms,
                        "transcript_length": len(transcript),
                        "response_length": len(cached_reply),
                        "cache_hit": True
                    }
                    logger.info(f"[{turn_id}] LATENCY_LOG: {json.dumps(latency_log)}")
                    continue

                # ── STEP 5: RAG lookup (Supabase, only when user_id is set) ─
                _t_rag_start = time.perf_counter()
                _rag_faq_count = 0
                system_prompt = None
                if user_id:
                    try:
                        emb = await semantic_cache.embed_text(transcript)
                        faqs = await get_relevant_faqs(emb.tolist(), user_id)
                        _rag_faq_count = len(faqs) if faqs else 0
                        if faqs:
                            faq_items = []
                            for f in faqs:
                                item_str = f"- Question: {f['question']}\n  Answer: {f['answer']}"
                                
                                # Freshness Check:
                                last_updated_val = f.get("last_updated")
                                last_updated_dt = parse_last_updated(last_updated_val)
                                if last_updated_dt.tzinfo is None:
                                    last_updated_dt = last_updated_dt.replace(tzinfo=timezone.utc)
                                
                                now_dt = datetime.now(timezone.utc)
                                age_days = (now_dt - last_updated_dt).days
                                
                                text_to_check = (f.get("question", "") + " " + f.get("answer", "")).lower()
                                high_risk_keywords = ["price", "fee", "cost", "rupees", "₹", "time", "hours"]
                                has_keyword = any(kw in text_to_check for kw in high_risk_keywords)
                                
                                if age_days > 30 and has_keyword:
                                    last_updated_date = last_updated_dt.strftime("%Y-%m-%d")
                                    amount = extract_amount(f.get("answer", ""))
                                    item_str += f"\n  [SYSTEM NOTE: This information is from {last_updated_date}. You MUST tell the user: \"The fee is listed as {amount}, but please verify with the owner as this might have changed recently.\"]"
                                
                                faq_items.append(item_str)
                                
                            faq_context = "\n".join(faq_items)
                            system_prompt = (
                                 "You are Shruti, a helpful female receptionist AI assistant for Saral AI. "
                                 "Because you are a female and your voice is female (Shruti), you must always refer to yourself "
                                 "in the female grammatical gender (e.g. use 'कर सकती हूँ', 'करूँगी', 'व्यस्त हूँ', etc. instead "
                                 "of male verbs/pronouns).\n\n"
                                 f"Use the following relevant business FAQs to answer the user's question:\n{faq_context}\n\n"
                                 "[LANGUAGE GUIDELINE: The user will frequently speak in \"Hinglish\" (a mix of Hindi and English). "
                                 "You must perfectly understand this mix. Always reply in the same natural, conversational language the "
                                 "user is speaking. Do not use overly formal Hindi; use natural, everyday Hinglish.]"
                             )
                            logger.info(f"[{turn_id}] RAG: Injected {len(faqs)} relevant FAQs into system prompt.")
                    except Exception as rag_err:
                        logger.error(f"[{turn_id}] RAG: Error fetching FAQs: {rag_err}", exc_info=True)
                _t_rag_end = time.perf_counter()
                model_load_ms = int(round(get_and_reset_model_load_time_ms()))

                # ── Emit consolidated step-timing log ────────────────────────
                _step_timing = {
                    "hallucination_check_ms": int(round((_t_halluc_end - _t_halluc_start) * 1000)),
                    "transcribed_send_ms":    int(round((_t_transcribed_send_end - _t_transcribed_send_start) * 1000)),
                    "history_op_ms":          int(round((_t_history_end - _t_history_start) * 1000)),
                    "cache_lookup_ms":        int(round((_t_cache_end - _t_cache_start) * 1000)),
                    "cache_model_available":  _cache_model_available,
                    "model_load_ms":          model_load_ms,
                    "dead_air_before_speech_ms": dead_air_before_speech_ms,
                    "actual_speech_duration_ms": actual_speech_duration_ms,
                    "rag_lookup_ms":          int(round((_t_rag_end - _t_rag_start) * 1000)),
                    "rag_faq_count":          _rag_faq_count,
                    "rag_ran":                bool(user_id),
                    "total_stt_to_llm_gap_ms": int(round((_t_rag_end - stt_end) * 1000)),
                }
                logger.info(f"[{turn_id}] [STEP_TIMING] stt_to_llm_gap: {json.dumps(_step_timing)}")

                # 5. Get LLM response stream
                logger.info(f"[{turn_id}] Getting streaming response from Fireworks AI LLM...")
                llm_start = time.perf_counter()
                
                llm_reply = None
                tts_audio_chunks = []
                chunks_received = []
                tts_started = False
                llm_stream_end = None
                tts_total_start = None
                tts_total_end = None
                first_audio_sent_at = None
                sentence_telemetry = []

                async def consume_llm_stream(user_prompt, history, sys_prompt, timeout_val):
                    nonlocal llm_stream_end
                    stream_gen = get_response_stream_async(
                        user_prompt,
                        history,
                        sys_prompt,
                        user_id,
                        call_id
                    )
                    iterator = stream_gen.__aiter__()
                    try:
                        first_chunk = await asyncio.wait_for(iterator.__anext__(), timeout=timeout_val)
                        chunks_received.append(first_chunk)
                        yield first_chunk
                    except (asyncio.TimeoutError, StopAsyncIteration) as e:
                        if isinstance(e, asyncio.TimeoutError):
                            raise
                        return
                    
                    try:
                        while True:
                            try:
                                chunk = await asyncio.wait_for(iterator.__anext__(), timeout=5.0)
                                chunks_received.append(chunk)
                                yield chunk
                            except StopAsyncIteration:
                                llm_stream_end = time.perf_counter()
                                break
                            except asyncio.TimeoutError:
                                logger.warning("[ws_call] LLM chunk read timeout mid-generation")
                                llm_stream_end = time.perf_counter()
                                break
                    finally:
                        if llm_stream_end is None:
                            llm_stream_end = time.perf_counter()

                async def sentence_generator(chunk_gen):
                    buffer = ""
                    # Split only on actual sentence terminators, not on commas or semicolons.
                    # This prevents splitting on tiny phrases like "Ji," which created huge gaps of silence
                    # between words and made the response time feel extremely slow.
                    sentence_end_chars = {'.', '?', '!', '।'}
                    async for token in chunk_gen:
                        buffer += token
                        while True:
                            split_idx = -1
                            for idx, char in enumerate(buffer):
                                if char in sentence_end_chars:
                                    # Avoid splitting on decimals (e.g. "9.30")
                                    is_decimal = (char in {'.', ','} and 
                                                  idx > 0 and idx < len(buffer) - 1 and 
                                                  buffer[idx-1].isdigit() and buffer[idx+1].isdigit())
                                    if not is_decimal:
                                        split_idx = idx
                                        break
                            if split_idx != -1:
                                sentence = buffer[:split_idx+1].strip()
                                buffer = buffer[split_idx+1:]
                                if sentence and any(c.isalnum() for c in sentence):
                                    yield sentence
                            else:
                                break
                    if buffer.strip() and any(c.isalnum() for c in buffer):
                        yield buffer.strip()

                async def run_concurrent_llm_tts_pipeline(chunk_gen):
                    tts_queue_queue = asyncio.Queue()
                    turn_failed_event = asyncio.Event()

                    async def fetch_tts_to_queue(sentence_idx, sentence_str, queue):
                        synthesis_start = time.perf_counter()
                        synthesis_start_iso = datetime.now(timezone.utc).isoformat()
                        sentence_telemetry[sentence_idx - 1]["tts_synthesis_start_iso"] = synthesis_start_iso
                        sentence_telemetry[sentence_idx - 1]["tts_synthesis_start_offset_ms"] = int(round((synthesis_start - llm_start) * 1000))
                        logger.info(
                            f"[{turn_id}] [TELEMETRY] sentence_{sentence_idx}_tts_dispatched "
                            f"offset_ms={sentence_telemetry[sentence_idx - 1]['tts_synthesis_start_offset_ms']} "
                            f"at={synthesis_start_iso} text={sentence_str!r}"
                        )
                        logger.info(
                            f"[{turn_id}] [TELEMETRY] sentence_{sentence_idx}_tts_synthesis_start "
                            f"offset_ms={sentence_telemetry[sentence_idx - 1]['tts_synthesis_start_offset_ms']} "
                            f"at={synthesis_start_iso} text={sentence_str!r}"
                        )
                        try:
                            async for chunk in text_to_speech_stream(sentence_str, language):
                                if interrupt_event.is_set() or turn_failed_event.is_set():
                                    break
                                if chunk:
                                    await queue.put(chunk)
                            await queue.put(None)
                        except Exception as exc:
                            logger.error(f"TTS streaming failed for sentence '{sentence_str}': {exc}")
                            await queue.put(exc)

                    async def llm_sentence_producer():
                        nonlocal tts_total_start
                        try:
                            async for sentence in sentence_generator(chunk_gen):
                                if interrupt_event.is_set() or turn_failed_event.is_set():
                                    break
                                sentence_idx = len(sentence_telemetry) + 1
                                kickoff_at = time.perf_counter()
                                if tts_total_start is None:
                                    tts_total_start = kickoff_at
                                sentence_telemetry.append({
                                    "sentence_index": sentence_idx,
                                    "text": sentence,
                                    "tts_kickoff_offset_ms": int(round((kickoff_at - llm_start) * 1000)),
                                    "tts_synthesis_start_iso": None,
                                    "tts_synthesis_start_offset_ms": None,
                                    "first_audio_sent_iso": None,
                                    "first_audio_sent_offset_ms": None,
                                    "audio_drain_end_iso": None,
                                    "audio_drain_end_offset_ms": None
                                })
                                logger.info(
                                    f"[{turn_id}] [TELEMETRY] sentence_{sentence_idx}_assembled "
                                    f"offset_ms={int(round((kickoff_at - llm_start) * 1000))}"
                                )
                                logger.info(f"Kicking off TTS synthesis for sentence {sentence_idx}: {sentence}")
                                sentence_queue = asyncio.Queue()
                                asyncio.create_task(fetch_tts_to_queue(sentence_idx, sentence, sentence_queue))
                                await tts_queue_queue.put(sentence_queue)
                        except Exception as exc:
                            logger.error(f"LLM sentence producer failed: {exc}")
                            err_queue = asyncio.Queue()
                            await err_queue.put(exc)
                            await tts_queue_queue.put(err_queue)
                        finally:
                            await tts_queue_queue.put(None)

                    async def tts_audio_consumer():
                        nonlocal tts_started, first_audio_sent_at, tts_total_end
                        sentence_idx = 0
                        try:
                            while True:
                                queue = await tts_queue_queue.get()
                                if queue is None:
                                    break
                                sentence_idx += 1
                                sentence_audio_started = False
                                while True:
                                    item = await queue.get()
                                    if item is None:
                                        if sentence_audio_started:
                                            audio_end_at = time.perf_counter()
                                            audio_end_iso = datetime.now(timezone.utc).isoformat()
                                            if sentence_idx - 1 < len(sentence_telemetry):
                                                sentence_telemetry[sentence_idx - 1]["audio_drain_end_iso"] = audio_end_iso
                                                sentence_telemetry[sentence_idx - 1]["audio_drain_end_offset_ms"] = int(round((audio_end_at - llm_start) * 1000))
                                            logger.info(
                                                f"[{turn_id}] [TELEMETRY] sentence_{sentence_idx}_audio_drain_end "
                                                f"offset_ms={int(round((audio_end_at - llm_start) * 1000))} "
                                                f"at={audio_end_iso}"
                                            )
                                        break
                                    elif isinstance(item, Exception):
                                        raise item
                                    else:
                                        if interrupt_event.is_set():
                                            break
                                        if not tts_started:
                                            await websocket.send_json({"status": "tts_start"})
                                            tts_started = True
                                        if not sentence_audio_started:
                                            audio_start_at = time.perf_counter()
                                            audio_start_iso = datetime.now(timezone.utc).isoformat()
                                            sentence_audio_started = True
                                            if sentence_idx - 1 < len(sentence_telemetry):
                                                sentence_telemetry[sentence_idx - 1]["first_audio_sent_iso"] = audio_start_iso
                                                sentence_telemetry[sentence_idx - 1]["first_audio_sent_offset_ms"] = int(round((audio_start_at - llm_start) * 1000))
                                            logger.info(
                                                f"[{turn_id}] [TELEMETRY] sentence_{sentence_idx}_first_audio_byte_sent "
                                                f"offset_ms={int(round((audio_start_at - llm_start) * 1000))} "
                                                f"at={audio_start_iso}"
                                            )
                                            if first_audio_sent_at is None:
                                                first_audio_sent_at = audio_start_at
                                        await websocket.send_bytes(item)
                                        tts_audio_chunks.append(item)
                        except Exception as exc:
                            logger.error(f"TTS audio consumer failed: {exc}")
                            turn_failed_event.set()
                            raise exc
                        finally:
                            if tts_started and not interrupt_event.is_set():
                                await websocket.send_json({"status": "tts_end"})
                            tts_total_end = time.perf_counter()

                    await asyncio.gather(
                        llm_sentence_producer(),
                        tts_audio_consumer()
                    )

                try:
                    logger.info("Attempting LLM stream first try...")
                    chunks_received = []
                    chunk_gen = consume_llm_stream(transcript, conversation_history[:-1], system_prompt, 10.0)
                    
                    logger.info(f"[{turn_id}] [TELEMETRY] Starting TTS streaming loop (first attempt) at {datetime.now(timezone.utc).isoformat()}")
                    await run_concurrent_llm_tts_pipeline(chunk_gen)
                    logger.info(f"[{turn_id}] [TELEMETRY] Finished TTS streaming loop (first attempt) at {datetime.now(timezone.utc).isoformat()}")
                    llm_reply = "".join(chunks_received)
                except Exception as err:
                    logger.warning(f"[{turn_id}] First LLM stream attempt failed: {err}")
                    if not chunks_received:
                        # Retry once with a shorter prompt
                        logger.info(f"[{turn_id}] Retrying LLM stream with shorter prompt...")
                        shorter_transcript = transcript[:50] if len(transcript) > 50 else transcript
                        try:
                            chunks_received = []
                            chunk_gen = consume_llm_stream(shorter_transcript, conversation_history[:-1], system_prompt, 8.0)
                            
                            logger.info(f"[{turn_id}] [TELEMETRY] Starting TTS streaming loop (retry attempt) at {datetime.now(timezone.utc).isoformat()}")
                            await run_concurrent_llm_tts_pipeline(chunk_gen)
                            logger.info(f"[{turn_id}] [TELEMETRY] Finished TTS streaming loop (retry attempt) at {datetime.now(timezone.utc).isoformat()}")
                            llm_reply = "".join(chunks_received)
                        except Exception as retry_err:
                            logger.error(f"LLM retry failed: {retry_err}", exc_info=True)
                            llm_reply = None
                    else:
                        # If we got some chunks but failed mid-stream, finish gracefully
                        if tts_started and not interrupt_event.is_set():
                            await websocket.send_json({"status": "tts_end"})
                        llm_reply = "".join(chunks_received)

                if llm_reply is None or not llm_reply.strip():
                    llm_failure_count += 1
                    logger.warning(f"LLM response generation failed. Consecutive failure count: {llm_failure_count}")
                    
                    if llm_failure_count >= 2:
                        exit_msg = "I'm having trouble connecting right now. Someone will call you back in 30 minutes."
                        logger.error(f"LLM failure limit reached (count={llm_failure_count}). Synthesizing emergency message and exiting gracefully.")
                        try:
                            await websocket.send_json({
                                "status": "tts_start"
                            })
                            async for chunk in text_to_speech_stream(exit_msg, language):
                                if chunk:
                                    await websocket.send_bytes(chunk)
                            await websocket.send_json({
                                "status": "tts_end"
                            })
                        except Exception as tts_err:
                            logger.error(f"Failed to play final emergency audio: {tts_err}")
                        
                        from app.workers.tasks import send_emergency_callback_whatsapp
                        _schedule_background_task(send_emergency_callback_whatsapp(caller_number))
                        
                        await websocket.close(code=1000)
                        break
                    else:
                        await _play_fallback_audio(websocket, "llm_fallback", language)
                        continue
                else:
                    llm_failure_count = 0

                # If successful, logger and metrics
                if llm_stream_end is None:
                    llm_stream_end = time.perf_counter()
                llm_generation_ms = int(round((llm_stream_end - llm_start) * 1000))
                logger.info(f"LLM Reply: {llm_reply}")
                
                # 6. Append assistant reply to history
                conversation_history.append({
                    "role": "assistant",
                    "content": llm_reply
                })
                
                if len(conversation_history) > MAX_HISTORY:
                    conversation_history = conversation_history[-MAX_HISTORY:]
                
                # Record TTS synthesis + streaming drain for stats.
                if tts_total_start is not None and tts_total_end is not None:
                    tts_total_drain_ms = int(round((tts_total_end - tts_total_start) * 1000))
                else:
                    tts_total_drain_ms = 0
                if first_audio_sent_at is not None:
                    time_to_first_audio_ms = int(round((first_audio_sent_at - user_speech_end_time) * 1000))
                logger.info(
                    f"Streamed TTS audio chunks ({len(tts_audio_chunks)} chunks) back to client "
                    f"in {tts_total_drain_ms}ms total drain."
                )
                
                # Save to semantic cache on successful completion of turn
                if llm_reply and tts_audio_chunks:
                    try:
                        emb = await semantic_cache.embed_text(transcript)
                        await semantic_cache.add(
                            text=transcript,
                            response=llm_reply,
                            language=language,
                            embedding=emb,
                            audio_bytes=b"".join(tts_audio_chunks)
                        )
                        logger.info("Successfully cached new user intent & TTS audio.")
                    except Exception as cache_save_err:
                        logger.warning(f"Failed to cache response: {cache_save_err}")
                
                # 9. Structured latency logging
                total_ms = int(round((time.perf_counter() - user_speech_end_time) * 1000))
                latency_log = {
                    "call_id": call_id,
                    "turn_id": turn_id,
                    "turn_number": turn_number,
                    "stt_ms": stt_ms,
                    "stt_api_ms": stt_api_ms,
                    "stt_buffering_overhead_ms": buffering_overhead_ms,
                    "dead_air_before_speech_ms": dead_air_before_speech_ms,
                    "actual_speech_duration_ms": actual_speech_duration_ms,
                    "stt_silence_wait_ms": silence_wait_ms,
                    "cache_lookup_ms": int(round((_t_cache_end - _t_cache_start)*1000)),
                    "model_load_ms": model_load_ms,
                    "llm_generation_ms": llm_generation_ms,
                    "tts_total_drain_ms": tts_total_drain_ms,
                    "time_to_first_audio_ms": time_to_first_audio_ms,
                    "total_ms": total_ms,
                    "transcript_length": len(transcript),
                    "response_length": len(llm_reply),
                    "sentence_telemetry": sentence_telemetry
                }
                logger.info(f"[{turn_id}] LATENCY_LOG: {json.dumps(latency_log)}")
                
            except WebSocketDisconnect as ws_disc:
                logger.info("WebSocket disconnected gracefully inside step loop.")
                raise ws_disc
            except Exception as e:
                # Log exception per step without crashing the WebSocket
                # DIAG-3: show exception type and conversation_history length at time of inner except
                print(f"[DIAG-3] Inner except caught: type={type(e).__name__} msg={e!r} conversation_history_len={len(conversation_history)}", flush=True)
                logger.error(f"Error processing voice call step: {str(e)}", exc_info=True)
                try:
                    await websocket.send_json({
                        "error": str(e)
                    })
                except Exception as send_err:
                    print(f"[DIAG-3] send_json(error) also failed: {type(send_err).__name__} -- breaking loop. conversation_history_len={len(conversation_history)}", flush=True)
                    logger.error(f"Failed to send error message to client: {str(send_err)}")
                    # If sending failed, connection might be broken, so break loop
                    break
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected by client gracefully.")
    except Exception as e:
        logger.error(f"Unexpected error in websocket session: {str(e)}", exc_info=True)
    finally:
        receiver_task.cancel()
        try:
            await receiver_task
        except Exception:
            pass
        manager.disconnect(websocket)
        # DIAG-4: show conversation_history state at the moment finally runs
        print(f"[DIAG-4] finally block reached. call_id={call_id} user_id={user_id} conversation_history_len={len(conversation_history)}", flush=True)
        logger.info("WebSocket call session finished. Cleaning up.")
        
        # Check for any pending bookings made during this call session to trigger recovery
        if call_id and user_id:
            try:
                supabase = get_supabase()
                def _get_pending():
                    return supabase.table("bookings")\
                        .select("id, slot_datetime, status, call_id")\
                        .eq("call_id", str(call_id))\
                        .eq("status", "pending")\
                        .execute()
                pending_res = await run_in_threadpool(_get_pending)
                
                if pending_res.data:
                    logger.info(f"Found pending booking slot for call_id={call_id}. Fetching caller number for recovery.")
                    def _get_caller_log():
                        return supabase.table("call_logs").select("caller_number").eq("id", call_id).execute()
                    existing_res = await run_in_threadpool(_get_caller_log)
                    caller_number = "unknown"
                    if existing_res.data:
                        caller_number = existing_res.data[0].get("caller_number", "unknown")
                    
                    if caller_number and caller_number != "unknown":
                        from app.workers.tasks import send_dropped_call_recovery_whatsapp
                        logger.info(f"Triggering background task send_dropped_call_recovery_whatsapp for {caller_number}")
                        _schedule_background_task(send_dropped_call_recovery_whatsapp(caller_number))
            except Exception as recovery_err:
                logger.error(f"Failed to check pending bookings or trigger recovery task: {recovery_err}", exc_info=True)

        # Perform post-call updates
        # DIAG-4b: this is the GATE — if conversation_history is empty, triage is NEVER scheduled
        print(f"[DIAG-4b] conversation_history gate check: len={len(conversation_history)} -> will_enter={bool(conversation_history)}", flush=True)
        if conversation_history:
            # 1. Compile the full transcript
            full_transcript = "\n".join([
                f"{msg['role'].capitalize()}: {msg['content']}"
                for msg in conversation_history
                if msg['role'] in ['user', 'assistant']
            ])
            
            # 2. Update database call logs and trigger WhatsApp
            if call_id and user_id:
                try:
                    supabase = get_supabase()
                    
                    # Check if call log already exists to preserve caller_number
                    def _get_existing_log():
                        return supabase.table("call_logs").select("caller_number").eq("id", call_id).execute()
                    existing_res = await run_in_threadpool(_get_existing_log)
                    caller_number = "unknown"
                    if existing_res.data:
                        caller_number = existing_res.data[0].get("caller_number", "unknown")
                    
                    # Generate summary of the call via Fireworks AI LLM
                    summary = "Call completed."
                    if full_transcript.strip():
                        try:
                            summary_prompt = "Summarize the following phone call conversation in 1-2 sentences, highlighting customer requests and contact information:"
                            summary = await run_in_threadpool(
                                get_response,
                                f"{summary_prompt}\n\nConversation:\n{full_transcript}",
                                []
                            )
                        except Exception as sum_err:
                            logger.error(f"Failed to generate call summary: {sum_err}")
                            
                    # Update call log in Supabase
                    log_data = {
                        "id": call_sid if 'call_sid' in locals() else call_id,
                        "user_id": user_id,
                        "caller_number": caller_number,
                        "transcript": full_transcript,
                        "summary": summary,
                        "status": "completed",
                        "ended_at": datetime.now(timezone.utc).isoformat()
                    }
                    def _upsert_call_log():
                        return supabase.table("call_logs").upsert(log_data).execute()
                    await run_in_threadpool(_upsert_call_log)
                    logger.info(f"Upserted call log {call_id} in Supabase with status completed.")
                    
                    # Fetch business user's whatsapp_number and notification_preference from database to send summary
                    def _get_user_summary_preference():
                        return supabase.table("users").select("whatsapp_number, notification_preference").eq("id", user_id).execute()
                    user_res = await run_in_threadpool(_get_user_summary_preference)
                    if user_res.data and user_res.data[0].get("whatsapp_number"):
                        whatsapp_number = user_res.data[0]["whatsapp_number"]
                        preference = user_res.data[0].get("notification_preference", "urgent_only")
                        
                        should_send = True
                        if preference in ["urgent_only", "digest"]:
                            booking_failed = False
                            for msg in conversation_history:
                                if msg.get("role") == "tool":
                                    try:
                                        content_data = json.loads(msg.get("content", "{}"))
                                        if content_data.get("status") == "error":
                                            booking_failed = True
                                            break
                                    except Exception:
                                        pass
                            
                            angry_keywords = ["urgent", "emergency", "manager", "owner", "complaint", "gussa", "cancel"]
                            has_keyword = any(kw in full_transcript.lower() for kw in angry_keywords)
                            
                            should_send = booking_failed or has_keyword
                            logger.info(f"[SMART ROUTER] preference={preference}, booking_failed={booking_failed}, has_keyword={has_keyword} -> should_send={should_send}")
                        
                        if should_send:
                            # Trigger WhatsApp message
                            await send_post_call_summary(whatsapp_number, summary, user_id)
                        else:
                            logger.info(f"[SMART ROUTER] Suppressing immediate WhatsApp notification for {whatsapp_number} due to preference '{preference}'.")
                except Exception as db_err:
                    logger.error(f"Failed to perform post-call logging/WhatsApp summary: {db_err}")

        # Post-call Stage 2 triage (decoupled from in-memory conversation_history, Option B)
        if call_id and user_id:
            try:
                supabase = get_supabase()
                # Fetch the latest transcript and caller number from the DB (authoritative source of truth)
                def _get_latest_transcript():
                    return supabase.table("call_logs").select("transcript, caller_number").eq("id", call_id).execute()
                db_res = await run_in_threadpool(_get_latest_transcript)
                if db_res.data:
                    db_transcript = db_res.data[0].get("transcript") or ""
                    db_caller_number = db_res.data[0].get("caller_number") or "unknown"
                    
                    # DIAG-5: confirm we actually reach the scheduling call
                    print(f"[DIAG-5] About to schedule Stage 2 triage. call_id={call_id} db_transcript_len={len(db_transcript)}", flush=True)
                    _schedule_background_task(
                        run_stage2_triage_background(
                            call_id=call_id,
                            user_id=user_id,
                            caller_number=db_caller_number,
                            transcript=db_transcript
                        )
                    )
                    print(f"[DIAG-5] Stage 2 triage task scheduled.", flush=True)
                else:
                    logger.warning(f"No call log found for call_id={call_id} in DB. Stage 2 triage skipped.")
            except Exception as triage_sched_err:
                logger.error(f"Failed to schedule Stage 2 triage from DB transcript: {triage_sched_err}")
