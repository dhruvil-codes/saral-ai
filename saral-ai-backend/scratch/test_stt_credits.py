import os
import sys

sys.path.append(os.path.abspath("."))
from app.services.sarvam import speech_to_text

def main():
    print("Reading sample audio...")
    with open("tests/fixtures/sample_audio.wav", "rb") as f:
        audio = f.read()
        
    print(f"Loaded {len(audio)} bytes of audio.")
    
    # Try calling Sarvam directly by using language_code = "hi-IN"
    # (Since "hi-IN" does not start with "en", speech_to_text will go straight to Sarvam REST STT API)
    try:
        print("Calling Sarvam STT REST API...")
        transcript = speech_to_text(audio, "hi-IN")
        print(f"Success! Transcript: '{transcript}'")
    except Exception as e:
        print(f"Error calling Sarvam: {e}")

if __name__ == "__main__":
    main()
