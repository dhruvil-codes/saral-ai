# Saral AI 🎙️

> Low-Latency, Real-Time Voice AI Receptionist for MSMEs

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python)](https://www.python.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)

Saral AI is an intelligent, real-time voice receptionist built to help Micro, Small, and Medium Enterprises (MSMEs) handle customer phone calls automatically. It operates over a bi-directional WebSocket connection to answer business queries, capture high-intent customer leads, and provide instant response streaming in regional languages.

---

## 📌 Table of Contents

- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Directory Structure](#-directory-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Real-Time Voice Pipeline](#-real-time-voice-pipeline)
- [Database Schema](#-database-schema)
- [Telemetry & Latency Diagnostics](#-telemetry--latency-diagnostics)

---

## ✨ Key Features

- **Bidirectional Streaming Audio**: Continuous full-duplex WebSocket communication (`/ws/call`) for natural, low-latency conversational turns.
- **Multilingual Speech Intelligence**: Powered by Sarvam AI models (`saaras:v3` for Speech-to-Text and `bulbul:v3` for streaming Text-to-Speech) optimized for regional language nuances.
- **Sub-Second LLM Conversational Logic**: Integrates Groq LLM (`openai/gpt-oss-20b`) to process context-aware responses with minimum turnaround delay.
- **Adaptive Voice Activity Detection (VAD)**: Utilizes `webrtcvad` with RMS energy fallback to detect end-of-speech silence thresholds dynamically. Supports streaming raw PCM and containerized formats (WebM, Ogg, WAV).
- **Automated Lead Extraction**: Captures key customer metrics directly from audio transcripts, including caller intent, urgency level, budget, and contact information.
- **Fault-Tolerant Audio Caching**: Features pre-cached fallback responses in memory to maintain call stability if third-party APIs experience transient timeouts.
- **Real-Time Analytics & FAQ Control**: Administrative dashboard enabling business owners to update knowledge bases and view call logs.

---

## 🏗️ System Architecture

```mermaid
graph TD
    %% Styling
    classDef client fill:#FAFAF5,stroke:#1A1A1A,stroke-width:2px;
    classDef gateway fill:#FFFFFF,stroke:#1A1A1A,stroke-width:2px;
    classDef module fill:#D4EAC8,stroke:#1A1A1A,stroke-width:2px;
    classDef highlight fill:#F5D000,stroke:#1A1A1A,stroke-width:2px;
    classDef service fill:#FFFFFF,stroke:#1A1A1A,stroke-width:2px;

    subgraph Clients["CLIENTS / FRONTEND (Web Browser & Devices)"]
        NextJS["<b>Next.js App Router</b><br/>layout.tsx, page.tsx, globals.css"]:::client
        WS_Client["<b>WebSocket Client</b><br/>Audio Streaming (Client-side mic)"]:::client
        REST_Client["<b>HTTP REST Client</b><br/>Axios / Fetch calls for Auth & FAQs"]:::client
    end

    subgraph Backend["FASTAPI BACKEND SERVER (ASGI Application Gateway)"]
        REST_Routers["<b>HTTP REST Routers (app/api)</b><br/>auth.py → JWT, Registrations, Login<br/>faqs.py → FAQ CRUD (MSME Context)"]:::gateway
        
        subgraph WSRouter["WebSocket Router (app/api/ws_call.py)"]
            VAD["<b>VAD (app/utils/vad.py)</b><br/>Silence & speech trigger (webrtcvad / RMS)"]:::module
            Fallback["<b>Fallback Audio Service</b><br/>Pre-cached failure voice (mitigate API outages)"]:::module
            WS_Loop["<b>WebSocket Loop</b><br/>Transcribe → LLM → TTS Stream"]:::highlight
        end

        Core_DB["<b>Core & DB Client (app/core, app/db)</b><br/>config.py → Pydantic validation<br/>supabase_client.py → Client Init"]:::gateway
    end

    subgraph Persistence["DATABASES & SERVICES (Persistence & AI APIs)"]
        Supabase["<b>Supabase Postgres DB</b><br/>Tables: users, faqs, call_logs, leads"]:::service
        Sarvam["<b>Sarvam AI</b><br/>STT (saaras:v3), Streaming TTS (bulbul:v3)"]:::service
        Groq["<b>Groq LLM Service</b><br/>Receptionist Reasoning (openai/gpt-oss-20b)"]:::service
        Twilio["<b>Twilio / Celery (TODO)</b><br/>Webhook / Worker tasks"]:::service
    end

    %% Flow connections
    REST_Client -->|REST API Calls| REST_Routers
    WS_Client <-->|Audio stream (WebSockets)| WSRouter
    
    REST_Routers --> Supabase
    WS_Loop -->|STT & TTS| Sarvam
    WS_Loop -->|LLM Prompt| Groq
    WS_Loop --> Supabase
    Core_DB --> Supabase
```

---

## 🛠️ Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend Framework** | Next.js 16 (App Router), React 19, TypeScript |
| **Styling & UI** | Tailwind CSS v4, Framer Motion, Lucide Icons, Radix UI |
| **Backend Framework** | Python 3.10+, FastAPI, Uvicorn, WebSockets |
| **AI & ML Pipeline** | Sarvam AI (STT/TTS), Groq LLM, WebRTCVAD, PyDantic |
| **Database & Auth** | Supabase (PostgreSQL), Passlib (Bcrypt), Python-Jose |

---

## 📁 Directory Structure

```
saral-ai/
├── app/                        # Next.js frontend application pages and layouts
│   ├── auth/                   # Authentication routes and callbacks
│   ├── dashboard/              # Business admin portal and analytics
│   ├── globals.css             # Global CSS styling and design tokens
│   ├── layout.tsx              # Root HTML wrapper
│   └── page.tsx                # Main landing page
├── components/                 # Reusable UI components
├── saral-ai-backend/           # FastAPI backend application
│   ├── app/
│   │   ├── api/                # REST endpoints and WebSocket call routers
│   │   ├── core/               # Configuration and environment management
│   │   ├── db/                 # Supabase client and database schemas
│   │   ├── services/           # Integration clients (Sarvam, Groq, Fallback)
│   │   ├── utils/              # Voice Activity Detection algorithms
│   │   └── main.py             # FastAPI entry point
│   ├── requirements.txt        # Backend dependencies
│   └── tests/                  # Backend testing suite
├── architecture.md             # In-depth architectural specification
└── DESIGN.md                   # Authoritative design tokens and system guidelines
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and `npm` or `bun`
- Python 3.10+
- Active accounts and API keys for **Supabase**, **Sarvam AI**, and **Groq**

---

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd saral-ai-backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # Linux/macOS
   source .venv/bin/activate
   ```

3. Install requirements:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables. Copy `.env.example` to `.env` and fill in your credentials:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_or_service_key
   SARVAM_API_KEY=your_sarvam_api_key
   GROQ_API_KEY=your_groq_api_key
   SECRET_KEY=your_jwt_secret_key
   ```

5. Run the development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

---

### Frontend Setup

1. Navigate to the root project directory:
   ```bash
   cd ..
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
   ```

4. Start the Next.js development server:
   ```bash
   npm run dev
   ```

5. Access the application in your browser at `http://localhost:3000`.

---

## 🔁 Real-Time Voice Pipeline

The voice call processing loop operates through the following stages:

1. **Audio Ingestion**: Audio chunks are received over WebSocket (`/ws/call`).
2. **Speech Detection**: Voice Activity Detector monitors audio frames for trailing silence (default threshold 600ms).
3. **Transcription**: Sarvam AI converts speech audio to text output.
4. **LLM Inference**: Groq processes customer queries with conversational context history.
5. **Synthesis & Streaming**: Response text is converted back to speech stream and delivered to the client.

---

## 📊 Database Schema

The core system schema maintained in PostgreSQL includes:

- **`users`**: Business owner details, credentials, and configuration settings.
- **`faqs`**: Custom facts, business operating hours, and service responses used by the LLM.
- **`call_logs`**: Call metrics, duration logs, and generated transcript summaries.
- **`leads`**: Parsed client leads containing contact info, budget, and urgency classifications.

---

## 📈 Telemetry & Latency Diagnostics

Saral AI monitors performance metrics per audio exchange to ensure low-latency performance:

- `stt_ms`: Speech-to-Text latency and buffering overhead.
- `llm_ms`: Groq inference duration.
- `tts_ms`: Speech synthesis and WebSocket chunk delivery time.
- `total_ms`: Round-trip execution time.

Diagnostic telemetry logs are emitted in JSON format during active sessions for monitoring system performance.

---

## 📄 License

This project is licensed under the MIT License.
