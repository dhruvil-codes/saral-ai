import sys
import os
import wave
import struct

sys.path.append(os.path.abspath("."))
from app.utils.vad import VoiceActivityDetector
from app.core.config import settings

def main():
    path = "../assets/real_voice.wav"
    print(f"Reading {path}...")
    with wave.open(path, "rb") as w:
        n_frames = min(w.getnframes(), 80000) # 5.0 seconds
        pcm_bytes = w.readframes(n_frames)
        
    print(f"Loaded {len(pcm_bytes)} bytes of audio ({len(pcm_bytes)/32} ms)")
    
    # Initialize VAD with settings
    vad = VoiceActivityDetector(
        sample_rate=16000,
        sample_width=2,
        channels=1,
        rms_threshold=300.0,
        silence_threshold_ms=300,
        webrtcvad_mode=2
    )
    
    chunk_size = 640
    chunks = [pcm_bytes[i:i+chunk_size] for i in range(0, len(pcm_bytes), chunk_size)]
    
    # Add 20 silence chunks at the end
    chunks.extend([b'\x00' * chunk_size] * 20)
    
    print(f"Processing {len(chunks)} chunks...")
    for idx, chunk in enumerate(chunks):
        is_silence = vad.process_chunk(chunk)
        print(
            f"Chunk {idx+1:03d} | "
            f"RMS: {vad._calculate_rms(chunk):6.1f} | "
            f"SpeechDetected: {vad.speech_detected!s:5s} | "
            f"SilenceAccum: {vad.silence_accumulated_ms:5.1f} ms | "
            f"TotalProcessed: {vad.total_processed_ms:5.1f} ms | "
            f"Fired: {is_silence!s:5s}"
        )
        if is_silence:
            print(f"===> VAD FIRED at chunk {idx+1}!")
            break

if __name__ == "__main__":
    main()
