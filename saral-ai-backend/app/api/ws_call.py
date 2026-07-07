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
from app.services.fireworks_llm import get_response
from app.services.fallback_audio import get_fallback_audio
from app.utils.vad import VoiceActivityDetector
from app.services.intent_cache import semantic_cache
from app.services.supabase_db import get_relevant_faqs
from app.db.supabase_client import get_supabase
from app.services.whatsapp import send_post_call_summary
from app.core.config import settings

import re
from datetime import timedelta

# Configure logger
logger = logging.getLogger(__name__)

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
            existing_res = supabase.table("call_logs").select("caller_number").eq("id", call_id).execute()
            if existing_res.data:
                caller_number = existing_res.data[0].get("caller_number", "unknown")
        except Exception as e:
            logger.error(f"Failed to fetch caller_number for session: {e}")

    logger.info(f"WebSocket connection established with language={language}, call_id={call_id}, user_id={user_id}, caller_number={caller_number}")
    
    conversation_history = []
    turn_number = 0
    
    vad_threshold = 1000  # Default silence threshold updated from 600ms to 1000ms
    if user_id:
        try:
            supabase = get_supabase()
            user_res = supabase.table("users").select("vad_threshold_ms").eq("id", user_id).execute()
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
    llm_failure_count = 0

    
    try:
        while True:
            # 1. Receive raw audio bytes
            audio_bytes = await websocket.receive_bytes()
            
            if not audio_bytes:
                continue
            
            if turn_start_time is None:
                turn_start_time = time.perf_counter()
                
            # Check for container format or small dummy chunk (< 100 bytes)
            # which we should process immediately for compatibility
            is_container = vad_detector.is_container_format(audio_bytes)
            is_dummy = len(audio_bytes) < 100
            
            if is_container or is_dummy:
                # Container formats / dummy chunks are handled immediately for compatibility.
                # VAD gating does not apply here.
                trigger_stt = True
                audio_to_process = audio_bytes
                buffering_overhead_ms = 0
                silence_wait_ms = 0
                vad_detector.reset()
                turn_start_time = None
            else:
                # Process streaming PCM chunk with VAD.
                #
                # Optimization (cost + latency):
                # - Do NOT accumulate silent/noise frames in the STT buffer.
                # - Only keep audio bytes after VAD flips into "speech_detected".
                #
                # Note: VoiceActivityDetector.process_chunk() appends into vad_detector.audio_buffer
                # internally, so we prune/reset when we detect silence.
                is_silence_detected = vad_detector.process_chunk(audio_bytes)

                if not vad_detector.speech_detected:
                    # Still in pre-speech region: drop this chunk locally to avoid STT costs.
                    # Reset buffers, keep VAD state machine advancing.
                    vad_detector.audio_buffer = bytearray()
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
                    buffering_overhead_ms = int(round((stt_trigger_time - turn_start_time) * 1000))
                    silence_wait_ms = int(round(vad_detector.total_processed_ms - vad_detector.get_speech_end_time_ms()))

                    vad_detector.reset()
                    turn_start_time = None
                else:
                    trigger_stt = False
                    
            if not trigger_stt:
                continue
                
            turn_number += 1
            
            try:
                # 2. Speech to Text (run in threadpool since it's blocking synchronous)
                logger.info("Starting Speech-to-Text translation...")
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
                
                # 3. Send JSON control message with status transcribed and text
                await websocket.send_json({
                    "status": "transcribed",
                    "text": transcript
                })
                
                # 4. Append user message to history
                conversation_history.append({
                    "role": "user",
                    "content": transcript
                })
                
                # Cap history size before querying LLM
                if len(conversation_history) > MAX_HISTORY:
                    conversation_history = conversation_history[-MAX_HISTORY:]
                
                llm_ms = 0
                tts_ms = 0

                # 4.5 Semantic Cache Lookup
                cache_hit = await semantic_cache.lookup(transcript, language)
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
                        
                    await websocket.send_json({
                        "status": "tts_start"
                    })
                    if cached_audio:
                        await websocket.send_bytes(cached_audio)
                    else:
                        async for chunk in text_to_speech_stream(cached_reply, language):
                            if chunk:
                                await websocket.send_bytes(chunk)
                                
                    await websocket.send_json({
                        "status": "tts_end"
                    })
                    
                    # Latency logging for cache hit
                    latency_log = {
                        "call_id": call_id,
                        "turn_number": turn_number,
                        "stt_ms": stt_ms,
                        "stt_api_ms": stt_api_ms,
                        "stt_buffering_overhead_ms": buffering_overhead_ms,
                        "stt_silence_wait_ms": silence_wait_ms,
                        "llm_ms": 0,
                        "tts_ms": 0,
                        "total_ms": stt_ms,
                        "transcript_length": len(transcript),
                        "response_length": len(cached_reply),
                        "cache_hit": True
                    }
                    logger.info(json.dumps(latency_log))
                    continue

                # 4.6 RAG dynamically querying Supabase for relevant FAQs
                system_prompt = None
                if user_id:
                    try:
                        emb = await semantic_cache.embed_text(transcript)
                        faqs = await get_relevant_faqs(emb.tolist(), user_id)
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
                                 "You are a helpful receptionist AI assistant for Saral AI.\n\n"
                                 f"Use the following relevant business FAQs to answer the user's question:\n{faq_context}\n\n"
                                 "[LANGUAGE GUIDELINE: The user will frequently speak in \"Hinglish\" (a mix of Hindi and English). "
                                 "You must perfectly understand this mix. Always reply in the same natural, conversational language the "
                                 "user is speaking. Do not use overly formal Hindi; use natural, everyday Hinglish.]"
                             )
                            logger.info(f"RAG: Injected {len(faqs)} relevant FAQs into system prompt.")
                    except Exception as rag_err:
                        logger.error(f"RAG: Error fetching FAQs: {rag_err}", exc_info=True)

                # 5. Get LLM response
                logger.info("Getting response from Fireworks AI LLM...")
                llm_start = time.perf_counter()
                
                llm_reply = None
                try:
                    llm_reply = await asyncio.wait_for(
                        run_in_threadpool(get_response, transcript, conversation_history[:-1], system_prompt, user_id, call_id),
                        timeout=4.0
                    )
                except asyncio.TimeoutError as te:
                    logger.error(f"LLM Timeout Error on first attempt: {str(te)}", exc_info=True)
                except httpx.TimeoutException as te:
                    logger.error(f"LLM HTTP Timeout Exception on first attempt: {str(te)}", exc_info=True)
                except httpx.HTTPStatusError as hse:
                    logger.error(f"LLM HTTP Status Error on first attempt: {str(hse)}", exc_info=True)
                except Exception as e:
                    logger.error(f"LLM General Failure on first attempt: {str(e)}", exc_info=True)
 
                if llm_reply is None:
                    # Retry once with a shorter prompt
                    logger.info("Retrying LLM once with a shorter prompt...")
                    shorter_transcript = transcript[:50] if len(transcript) > 50 else transcript
                    try:
                        llm_reply = await asyncio.wait_for(
                            run_in_threadpool(get_response, shorter_transcript, conversation_history[:-1], system_prompt, user_id, call_id),
                            timeout=3.0
                        )
                        logger.info(f"LLM Reply on retry: {llm_reply}")
                    except asyncio.TimeoutError as te:
                        logger.error(f"LLM Timeout Error on retry: {str(te)}", exc_info=True)
                    except httpx.TimeoutException as te:
                        logger.error(f"LLM HTTP Timeout Exception on retry: {str(te)}", exc_info=True)
                    except httpx.HTTPStatusError as hse:
                        logger.error(f"LLM HTTP Status Error on retry: {str(hse)}", exc_info=True)
                    except Exception as e:
                        logger.error(f"LLM General Failure on retry: {str(e)}", exc_info=True)
 
                if llm_reply is None:
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
                        
                        # Trigger background task to alert business owner
                        from app.workers.tasks import send_emergency_callback_whatsapp
                        asyncio.create_task(send_emergency_callback_whatsapp(caller_number))
                        
                        # Gracefully close WebSocket and break loop
                        await websocket.close(code=1000)
                        break
                    else:
                        # Fall back to "Let me have someone call you back" clip
                        await _play_fallback_audio(websocket, "llm_fallback", language)
                        continue
                else:
                    # Reset failure count on successful response
                    llm_failure_count = 0
 
                llm_end = time.perf_counter()
                llm_ms = int(round((llm_end - llm_start) * 1000))
                logger.info(f"LLM Reply: {llm_reply}")
                
                # 6. Append assistant reply to history
                conversation_history.append({
                    "role": "assistant",
                    "content": llm_reply
                })
                
                # Cap history size again
                if len(conversation_history) > MAX_HISTORY:
                    conversation_history = conversation_history[-MAX_HISTORY:]
                
                # 7. Text to Speech Streaming
                logger.info("Synthesizing response to speech via stream...")
                tts_start = time.perf_counter()
                
                # Send control message indicating TTS has started
                await websocket.send_json({
                    "status": "tts_start"
                })
                
                # Stream the chunks over the websocket
                chunks_count = 0
                total_bytes = 0
                tts_audio_chunks = []
                
                async def stream_tts():
                    nonlocal chunks_count, total_bytes
                    async for chunk in text_to_speech_stream(llm_reply, language):
                        if chunk:
                            chunks_count += 1
                            total_bytes += len(chunk)
                            tts_audio_chunks.append(chunk)
                            await websocket.send_bytes(chunk)
 
                try:
                    await asyncio.wait_for(stream_tts(), timeout=20.0)
                    
                    # Send control message indicating TTS has finished
                    await websocket.send_json({
                        "status": "tts_end"
                    })
                    
                    tts_end = time.perf_counter()
                    tts_ms = int(round((tts_end - tts_start) * 1000))
                    logger.info(f"Streamed {chunks_count} chunks ({total_bytes} bytes) back to client in {tts_ms}ms.")
                    
                    # Save to semantic cache on successful completion of turn
                    if llm_reply and tts_audio_chunks:
                        try:
                            emb = await semantic_cache.embed_text(transcript)
                            semantic_cache.add(
                                text=transcript,
                                response=llm_reply,
                                language=language,
                                embedding=emb,
                                audio_bytes=b"".join(tts_audio_chunks)
                            )
                            logger.info("Successfully cached new user intent & TTS audio.")
                        except Exception as cache_save_err:
                            logger.warning(f"Failed to cache response: {cache_save_err}")
                except asyncio.TimeoutError as te:
                    logger.error(f"TTS Timeout Error during streaming: {str(te)}", exc_info=True)
                    await websocket.close(code=1000)
                    break
                except httpx.TimeoutException as te:
                    logger.error(f"TTS HTTP Timeout Exception during streaming: {str(te)}", exc_info=True)
                    await websocket.close(code=1000)
                    break
                except httpx.HTTPStatusError as hse:
                    logger.error(f"TTS HTTP Status Error during streaming: {str(hse)}", exc_info=True)
                    await websocket.close(code=1000)
                    break
                except Exception as e:
                    logger.error(f"TTS General Failure during streaming: {str(e)}", exc_info=True)
                    await websocket.close(code=1000)
                    break
                
                # 9. Structured latency logging
                total_ms = stt_ms + llm_ms + tts_ms
                latency_log = {
                    "call_id": call_id,
                    "turn_number": turn_number,
                    "stt_ms": stt_ms,
                    "stt_api_ms": stt_api_ms,
                    "stt_buffering_overhead_ms": buffering_overhead_ms,
                    "stt_silence_wait_ms": silence_wait_ms,
                    "llm_ms": llm_ms,
                    "tts_ms": tts_ms,
                    "total_ms": total_ms,
                    "transcript_length": len(transcript),
                    "response_length": len(llm_reply)
                }
                logger.info(json.dumps(latency_log))
                
            except Exception as e:
                # Log exception per step without crashing the WebSocket
                logger.error(f"Error processing voice call step: {str(e)}", exc_info=True)
                try:
                    await websocket.send_json({
                        "error": str(e)
                    })
                except Exception as send_err:
                    logger.error(f"Failed to send error message to client: {str(send_err)}")
                    # If sending failed, connection might be broken, so break loop
                    break
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected by client gracefully.")
    except Exception as e:
        logger.error(f"Unexpected error in websocket session: {str(e)}", exc_info=True)
    finally:
        manager.disconnect(websocket)
        logger.info("WebSocket call session finished. Cleaning up.")
        
        # Check for any pending bookings made during this call session to trigger recovery
        if call_id and user_id:
            try:
                supabase = get_supabase()
                pending_res = supabase.table("bookings")\
                    .select("id, slot_datetime, status, call_id")\
                    .eq("call_id", str(call_id))\
                    .eq("status", "pending")\
                    .execute()
                
                if pending_res.data:
                    logger.info(f"Found pending booking slot for call_id={call_id}. Fetching caller number for recovery.")
                    existing_res = supabase.table("call_logs").select("caller_number").eq("id", call_id).execute()
                    caller_number = "unknown"
                    if existing_res.data:
                        caller_number = existing_res.data[0].get("caller_number", "unknown")
                    
                    if caller_number and caller_number != "unknown":
                        from app.workers.tasks import send_dropped_call_recovery_whatsapp
                        logger.info(f"Triggering background task send_dropped_call_recovery_whatsapp for {caller_number}")
                        asyncio.create_task(send_dropped_call_recovery_whatsapp(caller_number))
            except Exception as recovery_err:
                logger.error(f"Failed to check pending bookings or trigger recovery task: {recovery_err}", exc_info=True)

        # Perform post-call updates
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
                    existing_res = supabase.table("call_logs").select("caller_number").eq("id", call_id).execute()
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
                    supabase.table("call_logs").upsert(log_data).execute()
                    logger.info(f"Upserted call log {call_id} in Supabase with status completed.")
                    
                    # Fetch business user's whatsapp_number and notification_preference from database to send summary
                    user_res = supabase.table("users").select("whatsapp_number, notification_preference").eq("id", user_id).execute()
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
