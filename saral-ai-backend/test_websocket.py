import os
import sys
import unittest
from unittest.mock import patch, MagicMock

# Make sure app is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app

from app.api.ws_call import semantic_cache
import numpy as np

# Globally mock semantic_cache lookup, add and embed_text to prevent downloading SentenceTransformer model
async def mock_lookup(text, language="en-IN"):
    return None
semantic_cache.lookup = mock_lookup

def mock_add(*args, **kwargs):
    pass
semantic_cache.add = mock_add

async def mock_embed_text(text):
    return np.zeros(384)
semantic_cache.embed_text = mock_embed_text

class TestWebSocketCall(unittest.TestCase):

    @patch("app.api.ws_call.speech_to_text")
    @patch("app.api.ws_call.get_response_stream_async")
    @patch("app.api.ws_call.text_to_speech_stream")
    def test_websocket_success_flow(self, mock_tts_stream, mock_llm, mock_stt):
        # Configure mocks
        mock_stt.return_value = "Hello receptionist"
        
        async def mock_llm_stream(*args, **kwargs):
            yield "Hello how can I assist you"
        mock_llm.side_effect = mock_llm_stream
        
        async def mock_stream(text, language_code):
            yield b"synthesized-audio-bytes"
        mock_tts_stream.side_effect = mock_stream

        # Initialize TestClient
        client = TestClient(app)

        # Connect to WebSocket
        with client.websocket_connect("/ws/call?language=hi-IN") as websocket:
            # Send dummy audio bytes
            websocket.send_bytes(b"input-audio-bytes")
            
            # Receive control message
            control_msg = websocket.receive_json()
            self.assertEqual(control_msg, {"status": "transcribed", "text": "Hello receptionist"})
            
            # Receive tts_start
            self.assertEqual(websocket.receive_json(), {"status": "tts_start"})
            
            # Receive audio response chunk
            audio_response = websocket.receive_bytes()
            self.assertEqual(audio_response, b"synthesized-audio-bytes")

            # Receive tts_end
            self.assertEqual(websocket.receive_json(), {"status": "tts_end"})

            # Check mock parameter assertions
            mock_stt.assert_called_once_with(b"input-audio-bytes", "hi-IN")
            self.assertEqual(mock_llm.call_args[0][0], "Hello receptionist")
            self.assertEqual(mock_llm.call_args[0][1], [])
            mock_tts_stream.assert_called_once_with("Hello how can I assist you", "hi-IN")

    @patch("app.api.ws_call.get_fallback_audio")
    @patch("app.api.ws_call.speech_to_text")
    @patch("app.api.ws_call.get_response_stream_async")
    @patch("app.api.ws_call.text_to_speech_stream")
    def test_websocket_stt_error_handling(self, mock_tts_stream, mock_llm, mock_stt, mock_fallback):
        # Configure mocks: STT fails the first time, succeeds the second time
        mock_stt.side_effect = [RuntimeError("STT translation failed"), "Second attempt succeeded"]
        
        async def mock_llm_stream(*args, **kwargs):
            yield "LLM response"
        mock_llm.side_effect = mock_llm_stream
        mock_fallback.return_value = b"fake-stt-fallback-audio"
        
        async def mock_stream(text, language_code):
            yield b"tts-bytes"
        mock_tts_stream.side_effect = mock_stream

        client = TestClient(app)

        with client.websocket_connect("/ws/call") as websocket:
            # First send: STT fails, returns fallback audio
            websocket.send_bytes(b"audio-1")
            self.assertEqual(websocket.receive_json(), {"status": "tts_start"})
            self.assertEqual(websocket.receive_bytes(), b"fake-stt-fallback-audio")
            self.assertEqual(websocket.receive_json(), {"status": "tts_end"})

            # Second send: STT succeeds and proceeds
            websocket.send_bytes(b"audio-2")
            control_msg = websocket.receive_json()
            self.assertEqual(control_msg, {"status": "transcribed", "text": "Second attempt succeeded"})
            
            self.assertEqual(websocket.receive_json(), {"status": "tts_start"})
            audio_response = websocket.receive_bytes()
            self.assertEqual(audio_response, b"tts-bytes")
            self.assertEqual(websocket.receive_json(), {"status": "tts_end"})

    @patch("app.api.ws_call.get_fallback_audio")
    @patch("app.api.ws_call.speech_to_text")
    @patch("app.api.ws_call.get_response_stream_async")
    @patch("app.api.ws_call.text_to_speech_stream")
    def test_websocket_llm_and_tts_error_handling(self, mock_tts_stream, mock_llm, mock_stt, mock_fallback):
        # Configure mocks:
        # Turn 1: LLM fails first attempt, succeeds on second (retry)
        # Turn 2: LLM fails both attempts, triggers LLM fallback
        # Turn 3: LLM succeeds, but TTS fails (closes websocket)
        mock_stt.return_value = "Hello"
        
        async def mock_fail_1(*args, **kwargs):
            raise RuntimeError("Groq failed 1")
            yield ""
        async def mock_success_1(*args, **kwargs):
            yield "Hi there"
        async def mock_fail_2(*args, **kwargs):
            raise RuntimeError("Groq failed 2")
            yield ""
        async def mock_fail_3(*args, **kwargs):
            raise RuntimeError("Groq failed 3")
            yield ""
        async def mock_success_2(*args, **kwargs):
            yield "Success text"

        iterator_calls = iter([
            mock_fail_1, mock_success_1,
            mock_fail_2, mock_fail_3,
            mock_success_2
        ])
        async def mock_llm_stream_wrapper(*args, **kwargs):
            func = next(iterator_calls)
            async for token in func(*args, **kwargs):
                yield token
        mock_llm.side_effect = mock_llm_stream_wrapper
        mock_fallback.return_value = b"fake-llm-fallback-audio"
        
        async def mock_stream(text, language_code):
            yield b"tts-bytes"
        
        async def mock_error_stream(text, language_code):
            raise RuntimeError("Sarvam TTS failed")
            if False:
                yield b""

        mock_tts_stream.side_effect = mock_stream

        client = TestClient(app)

        with client.websocket_connect("/ws/call") as websocket:
            # Turn 1: LLM fails first attempt, succeeds on retry
            websocket.send_bytes(b"audio-1")
            self.assertEqual(websocket.receive_json(), {"status": "transcribed", "text": "Hello"})
            self.assertEqual(websocket.receive_json(), {"status": "tts_start"})
            self.assertEqual(websocket.receive_bytes(), b"tts-bytes")
            self.assertEqual(websocket.receive_json(), {"status": "tts_end"})

            # Turn 2: LLM fails both attempts -> plays fallback
            websocket.send_bytes(b"audio-2")
            self.assertEqual(websocket.receive_json(), {"status": "transcribed", "text": "Hello"})
            self.assertEqual(websocket.receive_json(), {"status": "tts_start"})
            self.assertEqual(websocket.receive_bytes(), b"fake-llm-fallback-audio")
            self.assertEqual(websocket.receive_json(), {"status": "tts_end"})

            # Turn 3: LLM succeeds, but TTS fails -> closes websocket
            mock_tts_stream.side_effect = mock_error_stream
            websocket.send_bytes(b"audio-3")
            self.assertEqual(websocket.receive_json(), {"status": "transcribed", "text": "Hello"})
            self.assertEqual(websocket.receive_json(), {"status": "tts_start"})
            
            # Since TTS failed, websocket is closed.
            try:
                msg = websocket.receive()
                self.assertEqual(msg.get("type"), "websocket.close")
            except Exception:
                pass

    @patch("app.api.ws_call.get_fallback_audio")
    @patch("app.api.ws_call.speech_to_text")
    @patch("app.api.ws_call.get_response_stream_async")
    @patch("app.api.ws_call.text_to_speech_stream")
    def test_websocket_timeouts_and_status_errors(self, mock_tts_stream, mock_llm, mock_stt, mock_fallback):
        import httpx
        mock_fallback.return_value = b"fallback-audio"
        mock_stt.side_effect = [
            httpx.TimeoutException("STT timeout"),
            httpx.HTTPStatusError("STT bad status", request=MagicMock(), response=MagicMock(status_code=500)),
            "Succeeded STT 3",
            "Succeeded STT 4",
            "Succeeded STT 5"
        ]
        
        async def mock_llm_timeout(*args, **kwargs):
            raise httpx.TimeoutException("LLM timeout")
            yield ""
        async def mock_llm_retry_success(*args, **kwargs):
            yield "LLM retry succeeded"
        async def mock_llm_status_error_1(*args, **kwargs):
            raise httpx.HTTPStatusError("LLM error 1", request=MagicMock(), response=MagicMock(status_code=500))
            yield ""
        async def mock_llm_status_error_2(*args, **kwargs):
            raise httpx.HTTPStatusError("LLM error 2", request=MagicMock(), response=MagicMock(status_code=500))
            yield ""
        async def mock_llm_normal(*args, **kwargs):
            yield "LLM normal response"

        iterator_calls = iter([
            mock_llm_timeout, mock_llm_retry_success,
            mock_llm_status_error_1, mock_llm_status_error_2,
            mock_llm_normal
        ])
        async def mock_llm_stream_wrapper(*args, **kwargs):
            func = next(iterator_calls)
            async for token in func(*args, **kwargs):
                yield token
        mock_llm.side_effect = mock_llm_stream_wrapper
        
        async def mock_stream(text, language_code):
            yield b"tts-chunk"
            
        async def mock_timeout_stream(text, language_code):
            raise httpx.TimeoutException("TTS stream timeout")
            if False:
                yield b""
                
        mock_tts_stream.side_effect = mock_stream
        
        client = TestClient(app)
        
        with client.websocket_connect("/ws/call") as websocket:
            # Turn 1: STT raises httpx.TimeoutException
            websocket.send_bytes(b"audio-1")
            self.assertEqual(websocket.receive_json(), {"status": "tts_start"})
            self.assertEqual(websocket.receive_bytes(), b"fallback-audio")
            self.assertEqual(websocket.receive_json(), {"status": "tts_end"})
            
            # Turn 2: STT raises httpx.HTTPStatusError
            websocket.send_bytes(b"audio-2")
            self.assertEqual(websocket.receive_json(), {"status": "tts_start"})
            self.assertEqual(websocket.receive_bytes(), b"fallback-audio")
            self.assertEqual(websocket.receive_json(), {"status": "tts_end"})
            
            # Turn 3: LLM raises httpx.TimeoutException, retry succeeds
            websocket.send_bytes(b"audio-3")
            self.assertEqual(websocket.receive_json(), {"status": "transcribed", "text": "Succeeded STT 3"})
            self.assertEqual(websocket.receive_json(), {"status": "tts_start"})
            self.assertEqual(websocket.receive_bytes(), b"tts-chunk")
            self.assertEqual(websocket.receive_json(), {"status": "tts_end"})
            
            # Turn 4: LLM raises httpx.HTTPStatusError on both attempts -> fallback
            websocket.send_bytes(b"audio-4")
            self.assertEqual(websocket.receive_json(), {"status": "transcribed", "text": "Succeeded STT 4"})
            self.assertEqual(websocket.receive_json(), {"status": "tts_start"})
            self.assertEqual(websocket.receive_bytes(), b"fallback-audio")
            self.assertEqual(websocket.receive_json(), {"status": "tts_end"})
            
            # Turn 5: TTS raises httpx.TimeoutException -> closes websocket
            mock_tts_stream.side_effect = mock_timeout_stream
            websocket.send_bytes(b"audio-5")
            self.assertEqual(websocket.receive_json(), {"status": "transcribed", "text": "Succeeded STT 5"})
            self.assertEqual(websocket.receive_json(), {"status": "tts_start"})
            try:
                msg = websocket.receive()
                self.assertEqual(msg.get("type"), "websocket.close")
            except Exception:
                pass

    @patch("app.api.ws_call.speech_to_text")
    @patch("app.api.ws_call.get_response_stream_async")
    @patch("app.api.ws_call.text_to_speech_stream")
    def test_websocket_history_limit(self, mock_tts_stream, mock_llm, mock_stt):
        mock_stt.side_effect = ["Msg 1", "Msg 2", "Msg 3", "Msg 4"]
        
        async def r1(*args, **kwargs): yield "Reply 1"
        async def r2(*args, **kwargs): yield "Reply 2"
        async def r3(*args, **kwargs): yield "Reply 3"
        async def r4(*args, **kwargs): yield "Reply 4"
        
        iterator_calls = iter([r1, r2, r3, r4])
        async def mock_llm_stream_wrapper(*args, **kwargs):
            func = next(iterator_calls)
            async for token in func(*args, **kwargs):
                yield token
        mock_llm.side_effect = mock_llm_stream_wrapper
        
        async def mock_stream(text, language_code):
            yield b"tts"
        mock_tts_stream.side_effect = mock_stream

        from app.api import ws_call
        # Save old MAX_HISTORY to restore later
        old_max_history = ws_call.MAX_HISTORY
        ws_call.MAX_HISTORY = 4

        try:
            client = TestClient(app)

            with client.websocket_connect("/ws/call") as websocket:
                # Turn 1
                websocket.send_bytes(b"audio-1")
                self.assertEqual(websocket.receive_json(), {"status": "transcribed", "text": "Msg 1"})
                self.assertEqual(websocket.receive_json(), {"status": "tts_start"})
                self.assertEqual(websocket.receive_bytes(), b"tts")
                self.assertEqual(websocket.receive_json(), {"status": "tts_end"})

                # Turn 2
                websocket.send_bytes(b"audio-2")
                self.assertEqual(websocket.receive_json(), {"status": "transcribed", "text": "Msg 2"})
                self.assertEqual(websocket.receive_json(), {"status": "tts_start"})
                self.assertEqual(websocket.receive_bytes(), b"tts")
                self.assertEqual(websocket.receive_json(), {"status": "tts_end"})

                # Turn 3
                websocket.send_bytes(b"audio-3")
                self.assertEqual(websocket.receive_json(), {"status": "transcribed", "text": "Msg 3"})
                self.assertEqual(websocket.receive_json(), {"status": "tts_start"})
                self.assertEqual(websocket.receive_bytes(), b"tts")
                self.assertEqual(websocket.receive_json(), {"status": "tts_end"})

                # Check what was passed to get_response in Turn 3
                call_args = mock_llm.call_args_list[2]
                user_msg_arg = call_args[0][0]
                history_arg = call_args[0][1]
                self.assertEqual(user_msg_arg, "Msg 3")
                self.assertEqual(len(history_arg), 3)
                self.assertEqual(history_arg[0]["content"], "Reply 1")
                self.assertEqual(history_arg[1]["content"], "Msg 2")
                self.assertEqual(history_arg[2]["content"], "Reply 2")
        finally:
            ws_call.MAX_HISTORY = old_max_history

    @patch("app.api.ws_call.get_supabase")
    @patch("app.api.ws_call.speech_to_text")
    @patch("app.api.ws_call.get_response_stream_async")
    @patch("app.api.ws_call.text_to_speech_stream")
    @patch("app.api.ws_call.get_fallback_audio")
    @patch("app.workers.tasks.send_emergency_callback_whatsapp")
    def test_websocket_llm_outage_graceful_exit(self, mock_emergency_task, mock_fallback, mock_tts_stream, mock_llm, mock_stt, mock_get_supabase):
        # Configure mocks
        mock_stt.return_value = "Hello"
        
        async def mock_empty_gen(*args, **kwargs):
            if False:
                yield ""
        mock_llm.side_effect = mock_empty_gen
        mock_fallback.return_value = b"fallback-audio"
        
        async def mock_stream(text, language_code):
            yield b"emergency-tts-audio"
        mock_tts_stream.side_effect = mock_stream
        
        # Mock Supabase
        mock_client = MagicMock()
        mock_table = MagicMock()
        mock_execute = MagicMock()
        mock_execute.data = [{"caller_number": "+919876543210"}]
        mock_table.select.return_value.eq.return_value.execute.return_value = mock_execute
        mock_client.table.return_value = mock_table
        mock_get_supabase.return_value = mock_client
        
        client = TestClient(app)
        
        with client.websocket_connect("/ws/call?call_id=test-call-outage&user_id=user-uuid-123") as websocket:
            # Turn 1: LLM fails first and second attempt -> llm_reply is None. Count becomes 1. Plays fallback.
            websocket.send_bytes(b"audio-1")
            self.assertEqual(websocket.receive_json(), {"status": "transcribed", "text": "Hello"})
            self.assertEqual(websocket.receive_json(), {"status": "tts_start"})
            self.assertEqual(websocket.receive_bytes(), b"fallback-audio")
            self.assertEqual(websocket.receive_json(), {"status": "tts_end"})
            
            # Turn 2: LLM fails again. Count becomes 2. Synthesizes emergency msg, triggers background task, closes WS.
            websocket.send_bytes(b"audio-2")
            self.assertEqual(websocket.receive_json(), {"status": "transcribed", "text": "Hello"})
            self.assertEqual(websocket.receive_json(), {"status": "tts_start"})
            self.assertEqual(websocket.receive_bytes(), b"emergency-tts-audio")
            self.assertEqual(websocket.receive_json(), {"status": "tts_end"})
            
            # Verify close
            try:
                msg = websocket.receive()
                self.assertEqual(msg.get("type"), "websocket.close")
            except Exception:
                pass
                
        # Verify emergency WhatsApp task is triggered with correct caller_number
        mock_emergency_task.assert_called_once_with("+919876543210")

    @patch("app.api.ws_call.get_supabase")
    @patch("app.api.ws_call.speech_to_text")
    @patch("app.api.ws_call.get_response_stream_async")
    @patch("app.api.ws_call.text_to_speech_stream")
    def test_websocket_concurrency_limit(self, mock_tts_stream, mock_llm, mock_stt, mock_get_supabase):
        from fastapi import WebSocketDisconnect
        # Configure mocks
        mock_stt.return_value = "Hello"
        
        async def mock_hi_stream(*args, **kwargs):
            yield "Hi"
        mock_llm.side_effect = mock_hi_stream
        
        async def mock_stream(text, language_code):
            yield b"tts"
        mock_tts_stream.side_effect = mock_stream
        
        # Mock Supabase
        mock_client = MagicMock()
        mock_table = MagicMock()
        mock_execute = MagicMock()
        mock_execute.data = [{"caller_number": "+919876543210"}]
        mock_table.select.return_value.eq.return_value.execute.return_value = mock_execute
        mock_client.table.return_value = mock_table
        mock_get_supabase.return_value = mock_client

        from app.core.config import settings
        
        # Save original settings
        old_max_concurrent = settings.MAX_CONCURRENT_CALLS
        settings.MAX_CONCURRENT_CALLS = 1
        
        client = TestClient(app)
        
        try:
            # 1. Establish the first connection (active = 1)
            with client.websocket_connect("/ws/call?call_id=call-1") as ws1:
                # 2. Try to connect a second one (active = 2, which exceeds limit of 1)
                # It should accept and close immediately with code 1013
                try:
                    with client.websocket_connect("/ws/call?call_id=call-2") as ws2:
                        msg = ws2.receive()
                        if msg.get("type") == "websocket.close":
                            self.assertEqual(msg.get("code"), 1013)
                except WebSocketDisconnect as e:
                    self.assertEqual(e.code, 1013)
        finally:
            settings.MAX_CONCURRENT_CALLS = old_max_concurrent

if __name__ == "__main__":
    unittest.main()
