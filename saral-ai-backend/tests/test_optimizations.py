import os
import sys
import unittest
from unittest.mock import patch, MagicMock
import httpx
from fastapi.testclient import TestClient

# Add app to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

class TestOptimizations(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)
        self.supabase_patcher = patch("app.db.supabase_client.get_supabase")
        self.mock_get_supabase = self.supabase_patcher.start()
        self.mock_client = MagicMock()
        self.mock_get_supabase.return_value = self.mock_client
        self.mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        self.mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(data=[])
        self.mock_client.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[])
        self.mock_client.table.return_value.upsert.return_value.execute.return_value = MagicMock(data=[])

    def tearDown(self):
        self.supabase_patcher.stop()

    def _consume_welcome(self, websocket, language="en-IN"):
        welcome_text = "Hello! How can I help you today?" if language.startswith("en") else "नमस्ते! मैं आपकी क्या सहायता कर सकता हूँ?"
        self.assertEqual(websocket.receive_json(), {"status": "tts_start"})
        self.assertEqual(websocket.receive_json(), {"status": "ai_text", "text": welcome_text})
        websocket.receive_bytes()
        self.assertEqual(websocket.receive_json(), {"status": "tts_end"})

    @patch("app.api.calls.get_supabase")
    def test_incoming_call_webhook(self, mock_get_supabase):
        # Mock Supabase table insert
        mock_supabase = MagicMock()
        mock_get_supabase.return_value = mock_supabase
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[])

        # Test POST /api/call/incoming
        response = self.client.post(
            "/api/call/incoming?user_id=test-user-uuid&language=hi-IN",
            data={"From": "+919876543210", "CallSid": "CA123456"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.headers["content-type"].startswith("application/xml"))
        self.assertIn("ws/call?language=hi-IN", response.text)
        self.assertIn("user_id=test-user-uuid", response.text)

    @patch("app.api.ws_call.speech_to_text")
    @patch("app.api.ws_call.semantic_cache")
    def test_websocket_semantic_cache_hit(self, mock_cache, mock_stt):
        # Configure cache hit
        mock_stt.return_value = "What are your business hours?"
        
        async def mock_lookup(text, language):
            return {
                "response": "We are open 9am to 6pm.",
                "audio_bytes": b"cached-audio-bytes",
                "language": "en-IN"
            }
        mock_cache.lookup.side_effect = mock_lookup

        with self.client.websocket_connect("/ws/call?language=en-IN") as websocket:
            self._consume_welcome(websocket, "en-IN")
            # Send audio bytes
            websocket.send_bytes(b"input-audio")
            
            # Receive transcribed text
            transcribed_msg = websocket.receive_json()
            self.assertEqual(transcribed_msg, {"status": "transcribed", "text": "What are your business hours?"})
            
            # Receive tts_start
            self.assertEqual(websocket.receive_json(), {"status": "tts_start"})
            
            # Receive cached audio bytes
            audio_bytes = websocket.receive_bytes()
            self.assertEqual(audio_bytes, b"cached-audio-bytes")
            
            # Receive tts_end
            self.assertEqual(websocket.receive_json(), {"status": "tts_end"})

    @patch("app.api.ws_call.speech_to_text")
    @patch("app.api.ws_call.semantic_cache")
    @patch("app.api.ws_call.get_relevant_faqs")
    @patch("app.api.ws_call.get_response")
    @patch("app.api.ws_call.text_to_speech_stream")
    def test_websocket_rag_injection(self, mock_tts_stream, mock_llm, mock_faqs, mock_cache, mock_stt):
        # Configure mocks
        mock_stt.return_value = "Where are you located?"
        
        async def mock_lookup(text, language):
            return None # Cache miss
        mock_cache.lookup.side_effect = mock_lookup
        
        async def mock_embed(text):
            return MagicMock(tolist=lambda: [0.1] * 384)
        mock_cache.embed_text.side_effect = mock_embed
        
        async def mock_get_faqs(emb, user_id):
            return [
                {"question": "Where are you located?", "answer": "We are in Mumbai, India."}
            ]
        mock_faqs.side_effect = mock_get_faqs
        
        mock_llm.return_value = "We are located in Mumbai."
        
        async def mock_stream(text, lang, *args, **kwargs):
            yield b"synthesized-audio"
        mock_tts_stream.side_effect = mock_stream
        
        with self.client.websocket_connect("/ws/call?user_id=test-user-123") as websocket:
            self._consume_welcome(websocket, "en-IN")
            websocket.send_bytes(b"input-audio")
            
            websocket.receive_json() # status: transcribed
            websocket.receive_json() # status: tts_start
            websocket.receive_bytes() # audio
            websocket.receive_json() # status: tts_end
            
            # Verify RAG call and FAQ injection
            mock_faqs.assert_called_once()
            args, kwargs = mock_llm.call_args
            # First arg is user message ("Where are you located?")
            # Second is history ([])
            # Third is system_prompt
            self.assertEqual(args[0], "Where are you located?")
            self.assertIn("Mumbai, India", args[2]) # FAQ must be in system prompt!

    @patch("app.api.ws_call.speech_to_text")
    @patch("app.api.ws_call.semantic_cache")
    @patch("app.api.ws_call.get_relevant_faqs")
    @patch("app.api.ws_call.get_response")
    @patch("app.api.ws_call.text_to_speech_stream")
    def test_websocket_rag_stale_injection(self, mock_tts_stream, mock_llm, mock_faqs, mock_cache, mock_stt):
        # Configure mocks
        mock_stt.return_value = "What is the fee?"
        
        async def mock_lookup(text, language):
            return None # Cache miss
        mock_cache.lookup.side_effect = mock_lookup
        
        async def mock_embed(text):
            return MagicMock(tolist=lambda: [0.1] * 384)
        mock_cache.embed_text.side_effect = mock_embed
        
        async def mock_get_faqs(emb, user_id):
            return [
                {
                    "question": "What is the fee?",
                    "answer": "The fee is ₹500 for entry.",
                    "last_updated": "2026-05-15T10:00:00+00:00", # > 30 days old from current 2026-06-30
                    "needs_verification": False
                }
            ]
        mock_faqs.side_effect = mock_get_faqs
        
        mock_llm.return_value = "The entry fee is 500 rupees, but please verify with the owner."
        
        async def mock_stream(text, lang, *args, **kwargs):
            yield b"synthesized-audio"
        mock_tts_stream.side_effect = mock_stream
        
        with self.client.websocket_connect("/ws/call?user_id=test-user-123") as websocket:
            self._consume_welcome(websocket, "en-IN")
            websocket.send_bytes(b"input-audio")
            websocket.receive_json() # status: transcribed
            websocket.receive_json() # status: tts_start
            websocket.receive_bytes() # audio
            websocket.receive_json() # status: tts_end
            
            # Verify RAG call and FAQ injection
            mock_faqs.assert_called_once()
            args, kwargs = mock_llm.call_args
            # Third arg is system_prompt
            system_prompt = args[2]
            self.assertIn("SYSTEM NOTE: This information is from 2026-05-15", system_prompt)
            self.assertIn("The fee is listed as ₹500", system_prompt)

