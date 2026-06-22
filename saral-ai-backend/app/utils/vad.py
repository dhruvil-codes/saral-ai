"""
Voice Activity Detection (VAD) module.
Handles real-time speech and silence detection on audio streams.
Supports webrtcvad (if installed) and falls back to RMS energy thresholding.
"""

import math
import struct
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

# Try to import webrtcvad
try:
    import webrtcvad
    WEBRTCVAD_AVAILABLE = True
    logger.info("webrtcvad library is available and will be used for VAD.")
except ImportError:
    WEBRTCVAD_AVAILABLE = False
    logger.info("webrtcvad library not found. Falling back to RMS-based VAD.")

class VoiceActivityDetector:
    def __init__(
        self,
        sample_rate: int = None,
        sample_width: int = None,
        channels: int = None,
        rms_threshold: float = None,
        silence_threshold_ms: int = None,
        webrtcvad_mode: int = 2
    ):
        """
        Initializes the Voice Activity Detector.
        
        Args:
            sample_rate: Audio sample rate in Hz (default from settings).
            sample_width: Bytes per sample (default from settings, e.g. 2 for 16-bit PCM).
            channels: Number of audio channels (default from settings).
            rms_threshold: RMS amplitude threshold for speech detection (default from settings).
            silence_threshold_ms: Silence duration in ms to trigger end of speech (default from settings).
            webrtcvad_mode: Aggressiveness mode for webrtcvad (0 to 3, default 2).
        """
        self.sample_rate = sample_rate if sample_rate is not None else settings.VAD_SAMPLE_RATE
        self.sample_width = sample_width if sample_width is not None else settings.VAD_SAMPLE_WIDTH
        self.channels = channels if channels is not None else settings.VAD_CHANNELS
        self.rms_threshold = rms_threshold if rms_threshold is not None else settings.VAD_RMS_THRESHOLD
        self.silence_threshold_ms = silence_threshold_ms if silence_threshold_ms is not None else settings.SILENCE_THRESHOLD_MS
        
        # Calculate bytes per millisecond
        self.bytes_per_sample = self.sample_width * self.channels
        self.bytes_per_ms = (self.sample_rate * self.bytes_per_sample) / 1000.0
        
        # Initialize webrtcvad if available
        self.vad = None
        if WEBRTCVAD_AVAILABLE:
            try:
                self.vad = webrtcvad.Vad(webrtcvad_mode)
            except Exception as e:
                logger.error(f"Failed to initialize webrtcvad: {e}. Using RMS fallback.")

        # State tracking
        self.reset()

    def reset(self):
        """Resets the VAD state for a new utterance/turn."""
        self.audio_buffer = bytearray()
        self.speech_detected = False
        self.silence_accumulated_ms = 0.0
        self.last_speech_time_ms = 0.0
        self.total_processed_ms = 0.0

    def is_container_format(self, data: bytes) -> bool:
        """
        Check if the data starts with signatures of container formats (WebM, Ogg, MP4, etc.)
        so we can skip frame-by-frame PCM processing.
        """
        if not data:
            return False
            
        # WebM EBML header: 1A 45 DF A3
        if data.startswith(b"\x1a\x45\xdf\xa3"):
            return True
            
        # Ogg container header: OggS
        if data.startswith(b"OggS"):
            return True
            
        # MP4/M4A signatures: 'ftyp' in bytes 4-8
        if len(data) >= 8 and data[4:8] == b"ftyp":
            return True
            
        # WAV/RIFF header: RIFF ... WAVE
        if data.startswith(b"RIFF"):
            return True
            
        return False

    def process_chunk(self, chunk: bytes) -> bool:
        """
        Processes a chunk of incoming audio.
        Appends it to the internal buffer and updates the VAD state machine.
        
        Returns:
            bool: True if end-of-utterance (silence threshold reached after speech) is detected.
        """
        if not chunk:
            return False
            
        # If it's a container format, we just buffer it and return False.
        # ws_call.py will handle bypassing VAD for container formats on a higher level.
        if self.is_container_format(chunk):
            self.audio_buffer.extend(chunk)
            self.speech_detected = True
            return False
            
        # Frame size for VAD analysis (webrtcvad requires 10, 20, or 30ms frames)
        frame_duration_ms = 20
        frame_size = int(frame_duration_ms * self.bytes_per_ms)
        
        # We process newly added bytes.
        # Find where we left off based on total processed ms.
        processed_bytes = int(self.total_processed_ms * self.bytes_per_ms)
        
        # Append new chunk to the buffer
        self.audio_buffer.extend(chunk)
        
        # Process new complete frames in the buffer
        while len(self.audio_buffer) - processed_bytes >= frame_size:
            frame = self.audio_buffer[processed_bytes : processed_bytes + frame_size]
            processed_bytes += frame_size
            self.total_processed_ms += frame_duration_ms
            
            # Determine if this frame contains active speech
            is_speech = self._is_frame_speech(frame)
            
            if is_speech:
                if not self.speech_detected:
                    logger.info("VAD: Speech detected (start of utterance).")
                    self.speech_detected = True
                self.silence_accumulated_ms = 0.0
                self.last_speech_time_ms = self.total_processed_ms
            else:
                if self.speech_detected:
                    self.silence_accumulated_ms += frame_duration_ms
                    
            # Check if silence threshold is exceeded after speech was detected
            if self.speech_detected and self.silence_accumulated_ms >= self.silence_threshold_ms:
                logger.info(
                    f"VAD: Silence detected for {self.silence_accumulated_ms}ms. Triggering STT."
                )
                return True
                
        return False

    def _is_frame_speech(self, frame: bytes) -> bool:
        """Helper to determine if a single PCM frame contains speech."""
        # 1. Try webrtcvad if available
        if self.vad is not None:
            try:
                # webrtcvad expects exact frame size and 16-bit mono PCM.
                # If these conditions are met, run it.
                return self.vad.is_speech(frame, self.sample_rate)
            except Exception:
                # Fallback to RMS on any error
                pass
                
        # 2. RMS fallback
        rms = self._calculate_rms(frame)
        return rms > self.rms_threshold

    def _calculate_rms(self, frame: bytes) -> float:
        """Calculate RMS amplitude of a PCM frame."""
        if not frame:
            return 0.0
            
        num_samples = len(frame) // self.sample_width
        if num_samples == 0:
            return 0.0
            
        fmt = f"<{num_samples}h"  # little-endian signed 16-bit
        try:
            samples = struct.unpack(fmt, frame[:num_samples * self.sample_width])
        except Exception:
            # Fallback if bytes don't match PCM layout
            samples = list(frame)
            num_samples = len(samples)
            
        sum_squares = sum(float(s) ** 2 for s in samples)
        return math.sqrt(sum_squares / num_samples)

    def get_speech_end_time_ms(self) -> float:
        """Returns the timestamp (relative to start of buffer) when speech ended."""
        return self.last_speech_time_ms
