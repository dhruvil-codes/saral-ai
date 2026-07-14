<div align="center">

# 🩺 Saral AI

### Multilingual Voice Intake & Triage Agent for Indian Clinics

[![AMD](https://img.shields.io/badge/AMD-Fireworks%20AI-ED1C24?style=flat-square)](https://fireworks.ai)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/DB-Supabase-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)]()

**A patient calls. Saral answers — in Hindi, Marathi, or English — understands what's wrong, knows how urgent it is, and makes sure the clinic finds out immediately.**

[Demo Video](#) · [Live App](#) · [Report Bug](#)
<img width="1905" height="951" alt="Saral AI Hero v1" src="https://github.com/user-attachments/assets/f93acdbf-80c3-45bc-82b4-40a7e34fd38a" />

</div>

---

## 🚨 The Problem

Small clinics lose patients to missed calls — and worse, sometimes miss genuinely **urgent** cases because no one was free to pick up. A single overwhelmed front desk can't triage every caller correctly, especially after hours or in a caller's preferred language.

## 💡 The Solution

Saral AI is a **voice-first AI receptionist** purpose-built for physiotherapy and dental clinics in India. It doesn't just answer the phone — it *understands* the call.

```
📞 Patient calls  →  🎙️ Natural voice conversation (Hindi/Marathi/English)
                  →  🧠 AMD-hosted LLM reasoning
                  →  🚦 Urgency classification + structured intake
                  →  💬 WhatsApp case card to clinic staff
                  →  📊 Dashboard: call logs, case cards, config
```

No urgent call gets lost in translation — or lost at all.

---

## ✨ Features

| | |
|---|---|
| 🗣️ **Real-time multilingual voice** | Fluid Hindi/Marathi/English conversation, streamed end-to-end |
| 🏥 **Clinic-aware answering** | Grounded in real timings, doctor availability, fees, and policies |
| 🚦 **Urgency triage** | Every call classified: urgent / same-day / routine / FAQ-only |
| 📋 **Structured intake** | Name, complaint, patient type, requested slot — extracted automatically |
| 💬 **WhatsApp case cards** | Clinic staff get a clean summary the moment a call ends |
| 📅 **Live appointment booking** | Tool-calling agent holds and confirms real slots |
| 📊 **Minimal dashboard** | Call logs, case cards, and clinic config — nothing you don't need |

---

## 🏗️ Architecture

```
                    ┌─────────────────────────────────────┐
                    │           Caller (Voice)             │
                    └──────────────────┬────────────────────┘
                                       │
                          Speech-to-Text (Groq Whisper)
                                       │
                    ┌──────────────────▼────────────────────┐
                    │   Stage 1 — Live Conversation          │
                    │   deepseek-v4-flash (Fireworks / AMD)  │
                    │   streamed, sentence-by-sentence TTS   │
                    └──────────────────┬────────────────────┘
                                       │
                          Text-to-Speech (Sarvam AI)
                                       │
                                  Call ends
                                       │
                    ┌──────────────────▼────────────────────┐
                    │   Stage 2 — Structured Triage           │
                    │   minimax-m3 (Fireworks / AMD)          │
                    │   urgency + intake extraction           │
                    └──────────────────┬────────────────────┘
                                       │
                       ┌───────────────┴───────────────┐
                       ▼                                ▼
              WhatsApp Case Card                 Dashboard
              (Twilio)                            (Call Logs, Case Cards)
```

**Two distinct AMD-hosted inference stages, each doing a genuinely different job** — not one API call re-labeled twice.

---

## 🔥 AMD / Fireworks Usage

> Saral AI runs its entire reasoning pipeline on AMD-hosted infrastructure via Fireworks AI:
>
> - **Stage 1** — `deepseek-v4-flash` handles live conversational reasoning, fully streamed into text-to-speech for natural, low-latency dialogue.
> - **Stage 2** — `minimax-m3` runs post-call to extract structured patient intake and classify urgency.
> - A dedicated tool-calling model handles appointment hold/confirm operations reliably.

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology |
|---|---|
| **LLM Inference** | Fireworks AI (AMD-hosted) |
| **Backend** | FastAPI · Python · WebSockets |
| **Frontend** | Next.js · TypeScript · Tailwind |
| **Database** | Supabase (Postgres + pgvector) |
| **STT** | Groq Whisper (whisper-large-v3) |
| **TTS** | Sarvam AI (bulbul:v3) |
| **Cache** | Redis (Upstash) |
| **Notifications** | Twilio WhatsApp |
| **VAD** | webrtcvad + pre-speech rolling buffer |

</div>

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A Supabase project
- API keys: Fireworks AI, Groq, Sarvam AI, Twilio

### Backend

```bash
cd saral-ai-backend
pip install -r requirements.txt --break-system-packages
cp .env.example .env   # fill in your keys
uvicorn app.main:app
```

### Frontend

```bash
npm install
npm run dev
```

### 🐳 Docker

```bash
docker-compose up --build
```

### Environment Variables

```env
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

---

## 📖 Usage

1. **Sign up** and complete the onboarding wizard
2. **Configure your clinic** — timings, doctors, fees, FAQ, WhatsApp number
3. **Activate Saral** with a single toggle
4. **Test the live agent** through the built-in call interface
5. **Watch case cards land** on WhatsApp and in your dashboard, automatically

> 📱 Twilio Sandbox requires a one-time opt-in — text `join <sandbox-word>` to the Twilio WhatsApp number from your configured clinic number.

---

## ⚠️ Known Limitations (Hackathon Scope)

- Twilio WhatsApp runs on the free Sandbox tier — manual opt-in per number, not production WhatsApp Business API
- No real PSTN telephony — demonstrated via a WebSocket-based live call interface
- STT fallback provider is currently inactive due to a trial quota limit; primary provider is fully functional

---

## 🗺️ Roadmap

- [ ] Real telephony integration (dedicated clinic phone numbers)
- [ ] Production WhatsApp Business API
- [ ] Additional regional languages
- [ ] Deeper AMD Developer Cloud usage (ROCm-hosted embeddings)

---

<div align="center">
</div>
