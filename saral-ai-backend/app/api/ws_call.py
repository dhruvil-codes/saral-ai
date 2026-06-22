"""
WebSocket voice call router with structured latency logging and silence-based VAD.
"""

import os
import time
import uuid
import json
import logging
import asyncio
import httpx
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool
from app.services.sarvam import speech_to_text, text_to_speech, text_to_speech_stream
from app.services.groq_llm import get_response
from app.services.fallback_audio import get_fallback_audio
from app.utils.vad import VoiceActivityDetector

# Configure logger
logger = logging.getLogger(__name__)

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
async def websocket_call(websocket: WebSocket, language: str = "en-IN", call_id: str = None):
    """
    WebSocket endpoint for real-time voice call handling.
    Accepts raw audio bytes, transcribes them using Sarvam STT,
    sends the transcription back to the client, generates a response
    via Groq LLM, synthesizes the reply into audio using Sarvam TTS,
    and sends the audio bytes back.
    """
    await websocket.accept()
    if not call_id:
        call_id = str(uuid.uuid4())
        
    logger.info(f"WebSocket connection established with language={language}, call_id={call_id}")
    
    conversation_history = []
    turn_number = 0
    vad_detector = VoiceActivityDetector()
    turn_start_time = None
    
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
                trigger_stt = True
                audio_to_process = audio_bytes
                buffering_overhead_ms = 0
                silence_wait_ms = 0
                vad_detector.reset()
                turn_start_time = None
            else:
                # Process streaming PCM chunk with VAD
                is_silence_detected = vad_detector.process_chunk(audio_bytes)
                max_audio_limit_reached = len(vad_detector.audio_buffer) >= 480000  # ~15s safety limit
                
                if is_silence_detected or max_audio_limit_reached:
                    trigger_stt = True
                    audio_to_process = bytes(vad_detector.audio_buffer)
                    
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
                
                # 5. Get LLM response
                # Pass transcript as current message, and everything in history except that as past history.
                # Note: history already contains the user message at index -1, so we pass conversation_history[:-1].
                logger.info("Getting response from Groq LLM...")
                llm_start = time.perf_counter()
                
                llm_reply = None
                try:
                    llm_reply = await asyncio.wait_for(
                        run_in_threadpool(get_response, transcript, conversation_history[:-1]),
                        timeout=2.0
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
                            run_in_threadpool(get_response, shorter_transcript, conversation_history[:-1]),
                            timeout=2.0
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
                    # Fall back to "Let me have someone call you back" clip
                    await _play_fallback_audio(websocket, "llm_fallback", language)
                    continue

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
                
                async def stream_tts():
                    nonlocal chunks_count, total_bytes
                    async for chunk in text_to_speech_stream(llm_reply, language):
                        if chunk:
                            chunks_count += 1
                            total_bytes += len(chunk)
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
        logger.info("WebSocket call session finished. Cleaning up.")
