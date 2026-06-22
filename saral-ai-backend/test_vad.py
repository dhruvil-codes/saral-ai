import unittest
import struct
from app.utils.vad import VoiceActivityDetector

class TestVoiceActivityDetector(unittest.TestCase):

    def setUp(self):
        # 16kHz mono 16-bit PCM VAD
        self.detector = VoiceActivityDetector(
            sample_rate=16000,
            sample_width=2,
            channels=1,
            rms_threshold=500.0,
            silence_threshold_ms=600
        )

    def _generate_pcm_frame(self, amplitude: int, duration_ms: int = 20) -> bytes:
        """Helper to generate a PCM frame with a fixed sample amplitude."""
        num_samples = int(16000 * (duration_ms / 1000.0))
        return struct.pack(f"<{num_samples}h", *[amplitude] * num_samples)

    def test_container_format_detection(self):
        """Test container format detection detects WebM, Ogg, MP4, WAV, but not raw PCM."""
        webm_data = b"\x1a\x45\xdf\xa3\x9f\x81\x01"
        ogg_data = b"OggS\x00\x02\x00\x00"
        mp4_data = b"\x00\x00\x00\x18ftypmp42"
        wav_data = b"RIFF\x24\x08\x00\x00WAVE"
        raw_pcm = self._generate_pcm_frame(100)

        self.assertTrue(self.detector.is_container_format(webm_data))
        self.assertTrue(self.detector.is_container_format(ogg_data))
        self.assertTrue(self.detector.is_container_format(mp4_data))
        self.assertTrue(self.detector.is_container_format(wav_data))
        self.assertFalse(self.detector.is_container_format(raw_pcm))
        self.assertFalse(self.detector.is_container_format(b""))

    def test_initial_silence_no_trigger(self):
        """Initial silence should not trigger STT because speech was never detected."""
        silent_frame = self._generate_pcm_frame(100)  # RMS is 100 (< 500)
        
        # Feed 1000ms of silence
        for _ in range(50):  # 50 * 20ms = 1000ms
            triggered = self.detector.process_chunk(silent_frame)
            self.assertFalse(triggered)
            self.assertFalse(self.detector.speech_detected)

    def test_speech_onset_detection(self):
        """Loud sound should set speech_detected to True."""
        silent_frame = self._generate_pcm_frame(100)
        speech_frame = self._generate_pcm_frame(2000)  # RMS is 2000 (> 500)

        # First chunk is silent
        self.detector.process_chunk(silent_frame)
        self.assertFalse(self.detector.speech_detected)

        # Second chunk is speech
        self.detector.process_chunk(speech_frame)
        self.assertTrue(self.detector.speech_detected)
        self.assertEqual(self.detector.silence_accumulated_ms, 0)

    def test_silence_trigger_after_speech(self):
        """600ms of silence after speech should trigger end-of-utterance."""
        speech_frame = self._generate_pcm_frame(2000)
        silent_frame = self._generate_pcm_frame(100)

        # 1. User starts speaking (20ms)
        self.detector.process_chunk(speech_frame)
        self.assertTrue(self.detector.speech_detected)

        # 2. User speaks for 200ms
        for _ in range(10):
            triggered = self.detector.process_chunk(speech_frame)
            self.assertFalse(triggered)

        # 3. User stops speaking. Feed silence.
        # Threshold is 600ms. A 20ms chunk at a time.
        # We need 30 silent chunks (30 * 20 = 600ms) to trigger.
        for i in range(29):
            triggered = self.detector.process_chunk(silent_frame)
            self.assertFalse(triggered)
            self.assertEqual(self.detector.silence_accumulated_ms, (i + 1) * 20)

        # The 30th silent chunk should trigger
        triggered = self.detector.process_chunk(silent_frame)
        self.assertTrue(triggered)
        self.assertEqual(self.detector.silence_accumulated_ms, 600)

    def test_vad_reset(self):
        """Resetting VAD should clear internal state buffers and flags."""
        speech_frame = self._generate_pcm_frame(2000)
        self.detector.process_chunk(speech_frame)
        self.assertTrue(self.detector.speech_detected)

        self.detector.reset()
        self.assertFalse(self.detector.speech_detected)
        self.assertEqual(len(self.detector.audio_buffer), 0)
        self.assertEqual(self.detector.silence_accumulated_ms, 0)
        self.assertEqual(self.detector.total_processed_ms, 0)

if __name__ == "__main__":
    unittest.main()
