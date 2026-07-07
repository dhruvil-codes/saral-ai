import os
import sys
import unittest
import struct
from unittest.mock import patch, MagicMock
import httpx

# Add current folder to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.utils.vad import VoiceActivityDetector
from app.services.sarvam import speech_to_text
from app.services.fireworks_llm import get_response

class TestHinglishAndVAD(unittest.TestCase):

    def setUp(self):
        # Initialize detector with default threshold of 1000ms (configured in Step 2)
        self.detector = VoiceActivityDetector(
            sample_rate=16000,
            sample_width=2,
            channels=1,
            rms_threshold=500.0,
            silence_threshold_ms=1000
        )

    def _generate_pcm_frame(self, amplitude: int, duration_ms: int = 20) -> bytes:
        """Helper to generate a PCM frame with a fixed sample amplitude."""
        num_samples = int(16000 * (duration_ms / 1000.0))
        return struct.pack(f"<{num_samples}h", *[amplitude] * num_samples)

    def test_20_plus_vad_and_hinglish_scenarios(self):
        """
        Verify VAD silence trigger logic across 20+ realistic Indian caller scenarios
        (e.g., pauses, Hinglish vocabulary, custom thresholds).
        """
        scenarios = [
            # format: (scenario_name, transcript_content, pause_ms, expected_early_trigger)
            ("Scenario 1: Tuesday appointment", "Mera appointment Tuesday ko hai, basically", 900, False),
            ("Scenario 2: Service pricing query", "Actually hair spa pricing kitna hoga, tell me?", 800, False),
            ("Scenario 3: Sunday opening check", "Sunday ko standard packages available hain kya?", 950, False),
            ("Scenario 4: Direct booking", "Mera naam Priya hai aur mujhe booking karni hai", 700, False),
            ("Scenario 5: Time reschedule", "Tuesday ko can we coordinate 3 PM slot instead?", 600, False),
            ("Scenario 6: WhatsApp confirmation request", "Appointment details mujhe WhatsApp par send karo, please", 850, False),
            ("Scenario 7: Urgent slot request", "Kya kal subah 10 baje ka slot khali hai?", 500, False),
            ("Scenario 8: Cancel slot", "Mujhe booking cancel karni hai, some urgent work came up", 900, False),
            ("Scenario 9: Discount check", "Standard rate par extra discount milega kya?", 750, False),
            ("Scenario 10: Location check", "Glamour Salon ka location kya hai, nearby landmark?", 800, False),
            ("Scenario 11: Call verification", "Hello, main booking check karne ke liye call kiya", 950, False),
            ("Scenario 12: Wait time check", "Rescheduling me kitna time lagta hai, coordinate please", 650, False),
            ("Scenario 13: Payment mode query", "Online payment options open hain ya cash only?", 880, False),
            ("Scenario 14: Evening slot selection", "Mera schedule busy hai, please keep it evening around 7 PM", 900, False),
            ("Scenario 15: Booking changes", "Rescheduling possible hai kya within 24 hours?", 780, False),
            ("Scenario 16: Address landmark coordinate", "Address landmark details SMS kar sakte ho kya?", 900, False),
            ("Scenario 17: Service time query", "Facial treatment me kitna duration lagta hai, approx?", 850, False),
            ("Scenario 18: Confirm number", "Mera alternate number update kar lijiye please", 700, False),
            ("Scenario 19: Feedback call", "Service kafi acchi thi, direct owner se connect karo", 920, False),
            ("Scenario 20: Slot query", "Kal 4 PM slot vacant hai kya, check standard rate", 900, False),
            ("Scenario 21: Long pause exceeding threshold", "Mera naam Rohan hai... (pause) ...appointments check karo", 1100, True),
        ]

        speech_frame = self._generate_pcm_frame(2000, 20)  # RMS > 500
        silent_frame = self._generate_pcm_frame(100, 20)   # RMS < 500

        for name, text, pause_ms, expected_trigger in scenarios:
            with self.subTest(scenario=name):
                self.detector.reset()
                
                # 1. User starts speaking (speech detected)
                triggered = self.detector.process_chunk(speech_frame)
                self.assertFalse(triggered)
                self.assertTrue(self.detector.speech_detected)

                # 2. Feed silence representing the mid-sentence pause duration
                num_silent_chunks = pause_ms // 20
                early_trigger = False
                for _ in range(num_silent_chunks):
                    if self.detector.process_chunk(silent_frame):
                        early_trigger = True
                        break
                
                self.assertEqual(early_trigger, expected_trigger, 
                                 f"Failed VAD pause trigger validation for {name} with {pause_ms}ms pause.")

                # If we expect the silence to trigger VAD at the end (e.g. Scenario 21)
                if expected_trigger:
                    self.assertTrue(early_trigger)
                else:
                    # Continue speaking after the pause and then trigger VAD with a 1000ms pause
                    triggered = self.detector.process_chunk(speech_frame)
                    self.assertFalse(triggered)
                    
                    # 1000ms pause should trigger VAD
                    final_trigger = False
                    for _ in range(50):  # 50 * 20 = 1000ms
                        if self.detector.process_chunk(silent_frame):
                            final_trigger = True
                            break
                    self.assertTrue(final_trigger, f"Utterance did not terminate after 1000ms final pause in {name}")

    @patch("httpx.Client")
    @patch("app.services.sarvam.logger")
    def test_stt_low_confidence_fallback_scenarios(self, mock_logger, mock_client):
        """
        Verify that a low confidence score (< 0.5) for Hindi/Hinglish transcribing
        automatically triggers fallback to English-only (en-IN) parsing.
        """
        # Scenario A: Low confidence (0.3) for Hindi -> Fallback to English
        mock_response_low = MagicMock()
        mock_response_low.status_code = 200
        mock_response_low.json.return_value = {
            "transcript": "Low confidence transcription result",
            "language_probability": 0.3
        }

        mock_response_fallback = MagicMock()
        mock_response_fallback.status_code = 200
        mock_response_fallback.json.return_value = {
            "transcript": "Salvaged English transcription",
            "language_probability": 0.9
        }

        # Mock client behavior: first call returns low confidence, second returns fallback
        mock_client.return_value.__enter__.return_value.post.side_effect = [
            mock_response_low,
            mock_response_fallback
        ]

        with patch.dict(os.environ, {"SARVAM_API_KEY": "test-valid-key"}):
            # Requesting with Hindi (hi-IN)
            transcript = speech_to_text(b"mocked-audio-bytes", "hi-IN")
            
            # Assert salvaged transcription is returned
            self.assertEqual(transcript, "Salvaged English transcription")
            
            # Verify the HTTP client was called twice
            self.assertEqual(mock_client.return_value.__enter__.return_value.post.call_count, 2)
            
            # Assert logger warned about the fallback
            mock_logger.warning.assert_called_once()
            self.assertIn("Low confidence", mock_logger.warning.call_args[0][0])

        # Reset mock call count
        mock_client.return_value.__enter__.return_value.post.reset_mock()
        mock_logger.warning.reset_mock()

        # Scenario B: High confidence (0.8) for Hindi -> No fallback
        mock_response_high = MagicMock()
        mock_response_high.status_code = 200
        mock_response_high.json.return_value = {
            "transcript": "High confidence transcription result",
            "language_probability": 0.8
        }
        mock_client.return_value.__enter__.return_value.post.side_effect = [mock_response_high]

        with patch.dict(os.environ, {"SARVAM_API_KEY": "test-valid-key"}):
            transcript = speech_to_text(b"mocked-audio-bytes", "hi-IN")
            self.assertEqual(transcript, "High confidence transcription result")
            self.assertEqual(mock_client.return_value.__enter__.return_value.post.call_count, 1)
            mock_logger.warning.assert_not_called()

    @patch("app.services.fireworks_llm.httpx.Client")
    def test_llm_system_prompt_guidelines(self, mock_httpx_client):
        """
        Verify that LLM system prompts generated via get_response incorporate
        the natural Hinglish reply instruction guidelines.
        """
        # Build a fake httpx response that fireworks_llm expects
        fake_response = MagicMock()
        fake_response.json.return_value = {
            "choices": [{"message": {"content": "Mocked response", "tool_calls": None}}]
        }
        fake_response.raise_for_status.return_value = None

        mock_client_instance = MagicMock()
        mock_client_instance.__enter__ = MagicMock(return_value=mock_client_instance)
        mock_client_instance.__exit__ = MagicMock(return_value=False)
        mock_client_instance.post.return_value = fake_response
        mock_httpx_client.return_value = mock_client_instance

        with patch.dict(os.environ, {"FIREWORKS_API_KEY": "test-valid-key"}):
            # Run get_response with custom system prompt and check system messages sent to Fireworks
            get_response("Mera appointment coordinate karo", [], system_prompt="Test base prompt")

            # Check calls to httpx post
            post_calls = mock_client_instance.post.call_args_list
            self.assertEqual(len(post_calls), 1)

            sent_payload = post_calls[0][1]["json"]
            sent_messages = sent_payload["messages"]
            system_messages = [m for m in sent_messages if m["role"] == "system"]
            self.assertTrue(len(system_messages) > 0)

            system_content = system_messages[0]["content"]
            expected_guideline = (
                "[LANGUAGE GUIDELINE: The user will frequently speak in \"Hinglish\" (a mix of Hindi and English). "
                "You must perfectly understand this mix. Always reply in the same natural, conversational language the "
                "user is speaking. Do not use overly formal Hindi; use natural, everyday Hinglish.]"
            )
            self.assertIn("Test base prompt", system_content)
            self.assertIn(expected_guideline, system_content)

if __name__ == "__main__":
    unittest.main()
