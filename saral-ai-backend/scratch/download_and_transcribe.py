import os
import sys
import httpx
import json

from dotenv import load_dotenv
load_dotenv()

# Add current folder to path
sys.path.append(os.path.abspath("."))

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

PHRASES = [
    {
        "id": "1_hindi_booking",
        "text": "मुझे कल सुबह डॉक्टर शर्मा के साथ एक अपॉइंटमेंट बुक करना है।",
        "tl": "hi",
        "desc": "Hindi Booking Request"
    },
    {
        "id": "2_hinglish_booking",
        "text": "Dr. Verma ke sath mera Tuesday ko 3 PM appointment book kar do please.",
        "tl": "hi",
        "desc": "Hinglish Booking Request"
    },
    {
        "id": "3_hinglish_symptoms",
        "text": "Mujhe teen din se throat infection aur fever hai, kya koi slot empty hai?",
        "tl": "hi",
        "desc": "Hinglish Symptom Description"
    },
    {
        "id": "4_hinglish_reschedule",
        "text": "Kal subah 10 baje ka appointment cancel karke evening 6 PM ko schedule kar dijiye.",
        "tl": "hi",
        "desc": "Hinglish Reschedule Request"
    }
]

def download_tts(text, tl, filepath):
    url = "https://translate.google.com/translate_tts"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    params = {
        "ie": "UTF-8",
        "client": "tw-ob",
        "tl": tl,
        "q": text
    }
    
    print(f"Downloading TTS for: '{text}' ({tl})...")
    response = httpx.get(url, headers=headers, params=params, timeout=10.0)
    if response.status_code == 200:
        with open(filepath, "wb") as f:
            f.write(response.content)
        print(f"Saved to {filepath} ({len(response.content)} bytes)")
        return True
    else:
        print(f"Failed to download TTS: {response.status_code} {response.text}")
        return False

def transcribe_groq(filepath):
    if not GROQ_API_KEY:
        print("Error: GROQ_API_KEY is not set.")
        return "GROQ_API_KEY_MISSING"
        
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
    
    with open(filepath, "rb") as f:
        audio_bytes = f.read()
        
    files = {"file": ("audio.mp3", audio_bytes, "audio/mpeg")}
    data = {"model": "whisper-large-v3"} # Let Whisper auto-detect language to see how it handles Hinglish
    
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(url, headers=headers, files=files, data=data)
        if response.status_code == 200:
            return response.json().get("text", "")
        else:
            return f"Error HTTP {response.status_code}: {response.text}"
    except Exception as e:
        return f"Exception: {e}"

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    os.makedirs("scratch/stt_samples", exist_ok=True)
    
    results = []
    
    for item in PHRASES:
        filename = f"scratch/stt_samples/{item['id']}.mp3"
        if not os.path.exists(filename):
            success = download_tts(item["text"], item["tl"], filename)
            if not success:
                continue
                
        # Transcribe with Groq Whisper
        print(f"Transcribing '{item['desc']}' with Groq Whisper...")
        whisper_txt = transcribe_groq(filename)
        print(f"Whisper: '{whisper_txt}'\n")
        
        # Transcribe with Sarvam STT
        print(f"Transcribing '{item['desc']}' with Sarvam STT...")
        from app.services.sarvam import speech_to_text
        try:
            with open(filename, "rb") as f:
                audio_bytes = f.read()
            sarvam_txt = speech_to_text(audio_bytes, "hi-IN")
            print(f"Sarvam: '{sarvam_txt}'\n")
        except Exception as e:
            sarvam_txt = f"ERROR: {str(e)}"
            print(f"Sarvam Error: {sarvam_txt}\n")
        
        results.append({
            "desc": item["desc"],
            "original": item["text"],
            "whisper": whisper_txt,
            "sarvam": sarvam_txt
        })
        
    print("\n" + "=" * 60)
    print("RESULTS SUMMARY:")
    print("=" * 60)
    for r in results:
        print(f"Scenario:  {r['desc']}")
        print(f"Original:  {r['original']}")
        print(f"Whisper:   {r['whisper']}")
        print(f"Sarvam:    {r['sarvam']}")
        print("-" * 60)

if __name__ == "__main__":
    main()
