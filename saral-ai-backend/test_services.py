"""
Verification test script for Sarvam AI and Groq LLM services.
Tests functionality via unit testing, mocking out API requests by default
if credentials are placeholders, and testing real endpoints if valid keys are found.
"""

import os
import unittest
import base64
from unittest.mock import patch, MagicMock
import httpx
from groq import GroqError

# Make sure we can import the app modules
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.sarvam import speech_to_text, text_to_speech, _normalize_language_code
from app.services.groq_llm import get_response

class TestServices(unittest.TestCase):

    def setUp(self):
        self.sarvam_key = os.getenv("SARVAM_API_KEY", "placeholder-sarvam-key")
        self.groq_key = os.getenv("GROQ_API_KEY", "placeholder-groq-key")
        
        self.is_real_sarvam = self.sarvam_key and not self.sarvam_key.startswith("placeholder")
        self.is_real_groq = self.groq_key and not self.groq_key.startswith("placeholder")

    def test_normalize_language_code(self):
        """Test language code normalization maps correctly."""
        self.assertEqual(_normalize_language_code("en"), "en-IN")
        self.assertEqual(_normalize_language_code("en-us"), "en-IN")
        self.assertEqual(_normalize_language_code("hi"), "hi-IN")
        self.assertEqual(_normalize_language_code("ta-in"), "ta-IN")
        self.assertEqual(_normalize_language_code("bn"), "bn-IN")
        self.assertEqual(_normalize_language_code(None), "en-IN")

    @patch("httpx.Client")
    def test_speech_to_text_mocked(self, mock_client):
        """Test speech_to_text parsing of JSON responses under mock."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "transcript": "Hello world transcription",
            "request_id": "test-req-123"
        }
        mock_client.return_value.__enter__.return_value.post.return_value = mock_response

        # Execute with a dummy key set in env for test isolation
        with patch.dict(os.environ, {"SARVAM_API_KEY": "test-valid-key"}):
            transcript = speech_to_text(b"fake-audio-bytes", "en-US")
            self.assertEqual(transcript, "Hello world transcription")
            
            # Verify mock call parameters
            post_args = mock_client.return_value.__enter__.return_value.post.call_args
            self.assertEqual(post_args[0][0], "https://api.sarvam.ai/speech-to-text")
            self.assertEqual(post_args[1]["headers"]["api-subscription-key"], "test-valid-key")
            self.assertEqual(post_args[1]["data"]["model"], "saaras:v3")
            self.assertEqual(post_args[1]["data"]["language_code"], "en-IN")

    @patch("httpx.Client")
    def test_text_to_speech_mocked(self, mock_client):
        """Test text_to_speech base64 decoding under mock."""
        mock_audio_base64 = base64.b64encode(b"fake-binary-audio-data").decode("utf-8")
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "audios": [mock_audio_base64],
            "request_id": "test-req-456"
        }
        mock_client.return_value.__enter__.return_value.post.return_value = mock_response

        with patch.dict(os.environ, {"SARVAM_API_KEY": "test-valid-key"}):
            audio_bytes = text_to_speech("Test speech", "hi")
            self.assertEqual(audio_bytes, b"fake-binary-audio-data")

            # Verify mock call parameters
            post_args = mock_client.return_value.__enter__.return_value.post.call_args
            self.assertEqual(post_args[0][0], "https://api.sarvam.ai/text-to-speech")
            self.assertEqual(post_args[1]["json"]["model"], "bulbul:v3")
            self.assertEqual(post_args[1]["json"]["target_language_code"], "hi-IN")

    @patch("app.services.groq_llm.Groq")
    def test_groq_llm_mocked(self, mock_groq):
        """Test Groq LLM integration and message formatting under mock."""
        mock_client_inst = MagicMock()
        mock_completion = MagicMock()
        mock_choice = MagicMock()
        mock_message = MagicMock()
        
        mock_message.content = "This is a mock reply from receptionist."
        mock_choice.message = mock_message
        mock_completion.choices = [mock_choice]
        mock_client_inst.chat.completions.create.return_value = mock_completion
        mock_groq.return_value = mock_client_inst

        with patch.dict(os.environ, {"GROQ_API_KEY": "test-groq-key"}):
            history = [
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "Hello! How can I help you?"}
            ]
            response = get_response("Can I book an appointment?", history)
            self.assertEqual(response, "This is a mock reply from receptionist.")
            
            # Verify system prompt prepending and user message addition
            create_args = mock_client_inst.chat.completions.create.call_args
            messages_sent = create_args[1]["messages"]
            
            self.assertEqual(messages_sent[0]["role"], "system")
            self.assertEqual(messages_sent[1]["role"], "user")
            self.assertEqual(messages_sent[1]["content"], "Hello")
            self.assertEqual(messages_sent[2]["role"], "assistant")
            self.assertEqual(messages_sent[3]["role"], "user")
            self.assertEqual(messages_sent[3]["content"], "Can I book an appointment?")

    # ------------------ Real API Integration Tests (Conditional) ------------------

    def test_real_sarvam_tts_and_stt(self):
        """Performs integration test with real Sarvam AI endpoints if credentials are present."""
        if not self.is_real_sarvam:
            self.skipTest("Skipping real Sarvam AI test: No valid SARVAM_API_KEY found.")

        print("\n--- Testing Real Sarvam TTS ---")
        test_text = "नमस्ते, सरल एआई में आपका स्वागत है।"
        try:
            audio_bytes = text_to_speech(test_text, "hi")
            self.assertIsInstance(audio_bytes, bytes)
            self.assertTrue(len(audio_bytes) > 0)
            print(f"Success! Generated {len(audio_bytes)} bytes of audio.")
            
            print("--- Testing Real Sarvam STT ---")
            transcript = speech_to_text(audio_bytes, "hi")
            self.assertIsInstance(transcript, str)
            self.assertTrue(len(transcript) > 0)
            safe_transcript = transcript.encode('ascii', 'backslashreplace').decode('ascii')
            print(f"Success! Transcribed text: '{safe_transcript}'")
        except Exception as e:
            self.fail(f"Real Sarvam API integration failed: {e}")

    def test_real_groq_llm(self):
        """Performs integration test with real Groq endpoints if credentials are present."""
        if not self.is_real_groq:
            self.skipTest("Skipping real Groq test: No valid GROQ_API_KEY found.")

        print("\n--- Testing Real Groq LLM ---")
        try:
            history = [{"role": "system", "content": "You are a brief receptionist assistant."}]
            response = get_response("Hi, I want to talk to sales.", history)
            self.assertIsInstance(response, str)
            self.assertTrue(len(response) > 0)
            print(f"Success! Assistant response: '{response}'")
        except Exception as e:
            self.fail(f"Real Groq LLM integration failed: {e}")

if __name__ == "__main__":
    unittest.main()
