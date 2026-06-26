import os
import sys
import unittest
from unittest.mock import patch, MagicMock

# Make sure app is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from fastapi.testclient import TestClient

class TestWebSocketCall(unittest.TestCase):

    @patch("app.api.ws_call.speech_to_text")
    @patch("app.api.ws_call.get_response")
    @patch("app.api.ws_call.text_to_speech_stream")
    def test_websocket_success_flow(self, mock_tts_stream, mock_llm, mock_stt):
        # Configure mocks
        mock_stt.return_value = "Hello receptionist"
        mock_llm.return_value = "Hello! How can I assist you?"
        
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
            mock_tts_stream.assert_called_once_with("Hello! How can I assist you?", "hi-IN")

    @patch("app.api.ws_call.get_fallback_audio")
    @patch("app.api.ws_call.speech_to_text")
    @patch("app.api.ws_call.get_response")
    @patch("app.api.ws_call.text_to_speech_stream")
    def test_websocket_stt_error_handling(self, mock_tts_stream, mock_llm, mock_stt, mock_fallback):
        # Configure mocks: STT fails the first time, succeeds the second time
        mock_stt.side_effect = [RuntimeError("STT translation failed"), "Second attempt succeeded"]
        mock_llm.return_value = "LLM response"
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
    @patch("app.api.ws_call.get_response")
    @patch("app.api.ws_call.text_to_speech_stream")
    def test_websocket_llm_and_tts_error_handling(self, mock_tts_stream, mock_llm, mock_stt, mock_fallback):
        # Configure mocks:
        # Turn 1: LLM fails first attempt, succeeds on second (retry)
        # Turn 2: LLM fails both attempts, triggers LLM fallback
        # Turn 3: LLM succeeds, but TTS fails (closes websocket)
        mock_stt.return_value = "Hello"
        mock_llm.side_effect = [
            RuntimeError("Groq failed 1"), "Hi there", # Turn 1
            RuntimeError("Groq failed 2"), RuntimeError("Groq failed 3"), # Turn 2 (both fail)
            "Success text" # Turn 3
        ]
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
    @patch("app.api.ws_call.get_response")
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
        
        mock_llm.side_effect = [
            httpx.TimeoutException("LLM timeout"), "LLM retry succeeded", # Turn 3
            httpx.HTTPStatusError("LLM error 1", request=MagicMock(), response=MagicMock(status_code=500)), # Turn 4
            httpx.HTTPStatusError("LLM error 2", request=MagicMock(), response=MagicMock(status_code=500)), # Turn 4 retry
            "LLM normal response" # Turn 5
        ]
        
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
    @patch("app.api.ws_call.get_response")
    @patch("app.api.ws_call.text_to_speech_stream")
    def test_websocket_history_limit(self, mock_tts_stream, mock_llm, mock_stt):
        mock_stt.side_effect = ["Msg 1", "Msg 2", "Msg 3", "Msg 4"]
        mock_llm.side_effect = ["Reply 1", "Reply 2", "Reply 3", "Reply 4"]
        
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

if __name__ == "__main__":
    unittest.main()
