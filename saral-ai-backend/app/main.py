import os
import logging
from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool
from app.api import auth, faqs
from app.api.auth import get_current_user
from app.services.sarvam import speech_to_text, text_to_speech
from app.services.groq_llm import get_response

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Max history config
MAX_HISTORY = int(os.getenv("MAX_HISTORY", 20))

app = FastAPI(title="Saral AI Backend")

app.include_router(auth.router, prefix="/api/auth")
app.include_router(faqs.router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/auth/me")
def read_current_user(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}

@app.websocket("/ws/call")
async def websocket_call(websocket: WebSocket, language: str = "en-IN"):
    """
    WebSocket endpoint for real-time voice call handling.
    Accepts raw audio bytes, transcribes them using Sarvam STT,
    sends the transcription back to the client, generates a response
    via Groq LLM, synthesizes the reply into audio using Sarvam TTS,
    and sends the audio bytes back.
    """
    await websocket.accept()
    logger.info(f"WebSocket connection established with language={language}")
    
    conversation_history = []
    
    try:
        while True:
            # 1. Receive raw audio bytes
            audio_bytes = await websocket.receive_bytes()
            
            if not audio_bytes:
                continue
            
            try:
                # 2. Speech to Text (run in threadpool since it's blocking synchronous)
                logger.info("Starting Speech-to-Text translation...")
                transcript = await run_in_threadpool(speech_to_text, audio_bytes, language)
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
                llm_reply = await run_in_threadpool(get_response, transcript, conversation_history[:-1])
                logger.info(f"LLM Reply: {llm_reply}")
                
                # 6. Append assistant reply to history
                conversation_history.append({
                    "role": "assistant",
                    "content": llm_reply
                })
                
                # Cap history size again
                if len(conversation_history) > MAX_HISTORY:
                    conversation_history = conversation_history[-MAX_HISTORY:]
                
                # 7. Text to Speech
                logger.info("Synthesizing response to speech...")
                speech_bytes = await run_in_threadpool(text_to_speech, llm_reply, language)
                
                # 8. Send audio bytes back to the client
                logger.info(f"Sending {len(speech_bytes)} bytes of audio back to client.")
                await websocket.send_bytes(speech_bytes)
                
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


