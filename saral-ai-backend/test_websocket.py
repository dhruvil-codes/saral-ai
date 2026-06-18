import os
import sys
import unittest
from unittest.mock import patch, MagicMock

# Make sure app is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from fastapi.testclient import TestClient
from fastapi import WebSocketDisconnect

class TestWebSocketCall(unittest.TestCase):

    @patch("app.main.speech_to_text")
    @patch("app.main.get_response")
    @patch("app.main.text_to_speech")
    def test_websocket_success_flow(self, mock_tts, mock_llm, mock_stt):
        # Configure mocks
        mock_stt.return_value = "Hello receptionist"
        mock_llm.return_value = "Hello! How can I assist you?"
        mock_tts.return_value = b"synthesized-audio-bytes"

        # Initialize TestClient
        client = TestClient(app)

        # Connect to WebSocket
        with client.websocket_connect("/ws/call?language=hi-IN") as websocket:
            # Send dummy audio bytes
            websocket.send_bytes(b"input-audio-bytes")
            
            # Receive control message
            control_msg = websocket.receive_json()
            self.assertEqual(control_msg, {"status": "transcribed", "text": "Hello receptionist"})
            
            # Receive audio response
            audio_response = websocket.receive_bytes()
            self.assertEqual(audio_response, b"synthesized-audio-bytes")

            # Check mock parameter assertions
            mock_stt.assert_called_once_with(b"input-audio-bytes", "hi-IN")
            mock_llm.assert_called_once_with("Hello receptionist", [])
            mock_tts.assert_called_once_with("Hello! How can I assist you?", "hi-IN")

    @patch("app.main.speech_to_text")
    @patch("app.main.get_response")
    @patch("app.main.text_to_speech")
    def test_websocket_stt_error_handling(self, mock_tts, mock_llm, mock_stt):
        # Configure mocks: STT fails the first time, succeeds the second time
        mock_stt.side_effect = [RuntimeError("STT translation failed"), "Second attempt succeeded"]
        mock_llm.return_value = "LLM response"
        mock_tts.return_value = b"tts-bytes"

        client = TestClient(app)

        with client.websocket_connect("/ws/call") as websocket:
            # First send: STT fails
            websocket.send_bytes(b"audio-1")
            err_msg = websocket.receive_json()
            self.assertIn("error", err_msg)
            self.assertIn("STT translation failed", err_msg["error"])

            # Second send: STT succeeds and proceeds
            websocket.send_bytes(b"audio-2")
            control_msg = websocket.receive_json()
            self.assertEqual(control_msg, {"status": "transcribed", "text": "Second attempt succeeded"})
            
            audio_response = websocket.receive_bytes()
            self.assertEqual(audio_response, b"tts-bytes")

    @patch("app.main.speech_to_text")
    @patch("app.main.get_response")
    @patch("app.main.text_to_speech")
    def test_websocket_llm_and_tts_error_handling(self, mock_tts, mock_llm, mock_stt):
        # Configure mocks: LLM fails on first turn, TTS fails on second turn
        mock_stt.return_value = "Hello"
        mock_llm.side_effect = [RuntimeError("Groq failed"), "Hi there"]
        # Since TTS is only called on the second turn, its first call should raise the error.
        mock_tts.side_effect = RuntimeError("Sarvam TTS failed")

        client = TestClient(app)

        with client.websocket_connect("/ws/call") as websocket:
            # First attempt: LLM fails
            websocket.send_bytes(b"audio-1")
            control_msg = websocket.receive_json()
            self.assertEqual(control_msg, {"status": "transcribed", "text": "Hello"})
            
            err_msg = websocket.receive_json()
            self.assertIn("error", err_msg)
            self.assertIn("Groq failed", err_msg["error"])

            # Second attempt: LLM succeeds, but TTS fails
            websocket.send_bytes(b"audio-2")
            control_msg2 = websocket.receive_json()
            self.assertEqual(control_msg2, {"status": "transcribed", "text": "Hello"})
            
            err_msg2 = websocket.receive_json()
            self.assertIn("error", err_msg2)
            self.assertIn("Sarvam TTS failed", err_msg2["error"])

    @patch("app.main.speech_to_text")
    @patch("app.main.get_response")
    @patch("app.main.text_to_speech")
    def test_websocket_history_limit(self, mock_tts, mock_llm, mock_stt):
        mock_stt.side_effect = ["Msg 1", "Msg 2", "Msg 3", "Msg 4"]
        mock_llm.side_effect = ["Reply 1", "Reply 2", "Reply 3", "Reply 4"]
        mock_tts.return_value = b"tts"

        from app import main
        # Save old MAX_HISTORY to restore later
        old_max_history = main.MAX_HISTORY
        main.MAX_HISTORY = 4

        try:
            client = TestClient(app)

            with client.websocket_connect("/ws/call") as websocket:
                # Turn 1
                websocket.send_bytes(b"audio-1")
                self.assertEqual(websocket.receive_json(), {"status": "transcribed", "text": "Msg 1"})
                self.assertEqual(websocket.receive_bytes(), b"tts")

                # Turn 2
                websocket.send_bytes(b"audio-2")
                self.assertEqual(websocket.receive_json(), {"status": "transcribed", "text": "Msg 2"})
                self.assertEqual(websocket.receive_bytes(), b"tts")

                # Turn 3
                websocket.send_bytes(b"audio-3")
                self.assertEqual(websocket.receive_json(), {"status": "transcribed", "text": "Msg 3"})
                self.assertEqual(websocket.receive_bytes(), b"tts")

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
            main.MAX_HISTORY = old_max_history

if __name__ == "__main__":
    unittest.main()
