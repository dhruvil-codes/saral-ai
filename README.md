# Saral AI — Multilingual Voice Intake & Triage Agent for Indian Clinics

**AMD Developer Hackathon Act II — Track 3 (Unicorn)**

Saral AI is a multilingual voice AI agent built for small Indian clinics (physiotherapy/dental) that answers patient calls 24/7 in Hindi, Marathi, and English. It has a natural voice conversation to understand symptoms and needs, classifies urgency, captures booking details, and sends the clinic's front desk a structured case summary via WhatsApp — so no urgent call gets missed.

## The Problem

Small clinics lose patients to missed calls, and — more critically — sometimes miss genuinely urgent cases because front-desk staff can't answer every call, especially after hours or during rush periods. Saral makes sure every call gets answered, understood, and triaged correctly.

## How It Works

```
Caller voice → STT → AMD-hosted LLM reasoning → structured case + urgency
extraction → TTS response → WhatsApp + dashboard
```

1. A patient calls the clinic and speaks naturally in Hindi/Marathi/English
2. Saral answers, asks follow-up questions, and responds using the clinic's configured knowledge base (timings, fees, doctor availability, policies)
3. When the call ends, a second AI stage extracts structured intake data and classifies urgency
4. The clinic receives a WhatsApp case card with the caller's details, complaint, urgency level, and recommended action
5. The clinic dashboard shows call logs, case cards, and clinic configuration

## AMD / Fireworks Usage

Saral AI runs two distinct AMD-hosted inference stages via Fireworks AI:

- **Stage 1 (live conversation):** `deepseek-v4-flash` handles real-time conversational reasoning during the call, with full token streaming into text-to-speech for low-latency responses.
- **Stage 2 (post-call triage):** `minimax-m3` runs after the call ends to perform structured patient intake extraction and urgency classification.

Sarvam AI handles Hindi/Marathi/English text-to-speech, and Groq Whisper handles speech-to-text (chosen after direct comparison testing showed superior mixed-script Hindi/Hinglish transcription — see `docs/` for the comparison, if included).

## Tech Stack

- **Backend:** FastAPI (Python), WebSocket-based real-time voice pipeline
- **Frontend:** Next.js (React, TypeScript)
- **Database:** Supabase (Postgres)
- **LLM Inference:** Fireworks AI (AMD-hosted) — deepseek-v4-flash + minimax-m3
- **STT:** Groq Whisper (whisper-large-v3)
- **TTS:** Sarvam AI (bulbul:v3)
- **Notifications:** Twilio WhatsApp (free-form messaging)
- **VAD:** webrtcvad with pre-speech rolling buffer

## Features

- Real-time multilingual voice conversation (Hindi/Marathi/English)
- Clinic knowledge grounding (timings, doctor availability, fees, location, policies)
- Structured intake extraction (name, complaint, urgency, requested slot, patient type)
- Urgency/callback priority classification (urgent / same-day / routine / FAQ-only)
- Automated WhatsApp case card delivery to clinic staff
- Minimal clinic dashboard: call logs, case cards, FAQ/config
- Clinic setup UI with WhatsApp number configuration and Saral activation toggle

## Setup & Installation

### Prerequisites

- Python 3.11+
- Node.js 18+
- A Supabase project
- API keys: Fireworks AI, Groq, Sarvam AI, Twilio

### Backend

```bash
cd saral-ai-backend
pip install -r requirements.txt --break-system-packages
cp .env.example .env
# Fill in your API keys in .env
uvicorn app.main:app
```

### Frontend

```bash
npm install
npm run dev
```

### Environment Variables

```
FIREWORKS_API_KEY=
FIREWORKS_MODEL=accounts/fireworks/models/deepseek-v4-flash
GROQ_API_KEY=
SARVAM_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
SUPABASE_URL=
SUPABASE_KEY=
```

### Docker

```bash
docker-compose up --build
```

## Usage

1. Sign up / log in to the dashboard
2. Configure your clinic: name, timings, doctor availability, fees, FAQ entries
3. Add your WhatsApp number to receive case card notifications (Twilio Sandbox requires a one-time opt-in — send `join <sandbox-word>` to the Twilio WhatsApp number from your configured number)
4. Toggle Saral to Active
5. Test the voice agent via the live call interface
6. Review call logs and case cards in the dashboard; case cards are also delivered automatically to your WhatsApp

## Known Limitations (Hackathon Scope)

- Twilio WhatsApp integration uses the free Sandbox tier, which requires manual opt-in per recipient number (not production-grade WhatsApp Business API)
- No real telephony/PSTN integration — the voice agent is demonstrated via a WebSocket-based test interface rather than a live phone number
- STT fallback (Sarvam) is currently non-functional due to a quota issue on the trial account; Groq Whisper is the sole active STT provider

## License

Built for AMD Developer Hackathon Act II, July 2026.
