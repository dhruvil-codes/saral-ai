# Saral AI System Architecture

This document details the architectural layout, real-time pipeline, and data models of the **Saral AI** Voice Receptionist codebase. 

---

## 1. High-Level Architecture Overview

Saral AI is designed as a low-latency, real-time Voice AI receptionist that enables MSMEs to automatically handle incoming customer calls, answer business FAQs, and extract structured business leads. It is split into two primary components:
1. **Frontend (Next.js)**: A client-facing dashboard and web interface styled strictly in accordance with [DESIGN.md](file:///d:/saral-ai/DESIGN.md) (cream canvas, electric-yellow CTAs, and flat borders).
2. **Backend (FastAPI)**: A Python-based service handling user session management, FAQ CRUD operations, and the real-time bidirectional WebSocket voice pipeline.

```mermaid
graph TD
    %% Styling
    classDef client fill:#FAFAF5,stroke:#1A1A1A,stroke-width:2px;
    classDef gateway fill:#FFFFFF,stroke:#1A1A1A,stroke-width:2px;
    classDef module fill:#D4EAC8,stroke:#1A1A1A,stroke-width:2px;
    classDef extService fill:#F5D000,stroke:#1A1A1A,stroke-width:2px;
    classDef db fill:#E8622A,stroke:#FFFFFF,stroke-width:2px;

    %% Nodes
    subgraph Clients["Clients / Web Browser"]
        NextJS["Next.js App Router"]:::client
        WS_Client["WebSocket Client<br/>(Audio Streaming)"]:::client
        REST_Client["REST Client<br/>(Auth/FAQ Administration)"]:::client
    end

    subgraph Backend["FastAPI Backend Server"]
        lifespan["Lifespan Handler"]:::gateway
        main["FastAPI App Gateway<br/>(main.py)"]:::gateway
        auth_router["Auth Router<br/>(app/api/auth.py)"]:::gateway
        faq_router["FAQ Router<br/>(app/api/faqs.py)"]:::gateway
        ws_router["WS Router<br/>(app/api/ws_call.py)"]:::gateway
        
        vad["Voice Activity Detector<br/>(app/utils/vad.py)"]:::module
        fallback["Fallback Audio Cache<br/>(app/services/fallback_audio.py)"]:::module
    end

    subgraph Data["Databases & Persistence"]
        supabase["Supabase client<br/>(app/db/supabase_client.py)"]:::db
        postgres[("Supabase Postgres DB")]:::db
    end

    subgraph External["External AI APIs"]
        sarvam["Sarvam AI API<br/>(STT & TTS Stream)"]:::extService
        groq["Groq LLM Client<br/>(openai/gpt-oss-20b)"]:::extService
    end

    %% Connections
    REST_Client -->|REST Requests| main
    main --> auth_router
    main --> faq_router
    WS_Client <-->|Bidirectional Audio Stream| ws_router
    
    auth_router --> supabase
    faq_router --> supabase
    supabase --> postgres
    
    lifespan -->|Pre-caches default audios| fallback
    ws_router <-->|Processes streaming PCM| vad
    ws_router <--|Retrieves failure clips| fallback
    
    ws_router -->|speech_to_text / text_to_speech_stream| sarvam
    ws_router -->|get_response| groq
```

---

## 2. Directory Layout & Core Components

```
d:\saral-ai
├── app/                            # Frontend Next.js Pages
│   ├── layout.tsx                  # Global HTML wrapper and font loading
│   └── page.tsx                    # Next.js homepage boilerplate
├── DESIGN.md                       # Design System Token definitions (Authoritative)
├── saral-ai-backend/               # Python FastAPI backend
│   ├── app/
│   │   ├── api/                    # API Endpoints / Routers
│   │   │   ├── auth.py             # User signup, login, JWT authorization
│   │   │   ├── callback.py         # [TODO] Webhooks from telephony (Twilio)
│   │   │   ├── calls.py            # [TODO] Call logs and history endpoints
│   │   │   ├── faqs.py             # FAQ CRUD operations
│   │   │   └── ws_call.py          # Bidirectional real-time Voice WebSocket call logic
│   │   ├── core/
│   │   │   └── config.py           # Pydantic Settings validation
│   │   ├── db/
│   │   │   ├── models.py           # Pydantic schema models & Postgres DDL definitions
│   │   │   └── supabase_client.py  # Supabase client manager
│   │   ├── services/               # AI & External integrations
│   │   │   ├── fallback_audio.py   # Memory-cached fallback voice generator
│   │   │   ├── groq_llm.py         # Groq LLM integration client (using openai/gpt-oss-20b)
│   │   │   ├── lead_extractor.py   # [TODO] Lead information extraction pipeline
│   │   │   ├── sarvam.py           # Sarvam AI STT & Streaming TTS client
│   │   │   └── twilio_service.py   # [TODO] Outgoing Twilio client
│   │   ├── utils/
│   │   │   └── vad.py              # Voice Activity Detector (webrtcvad / RMS fallback)
│   │   └── main.py                 # FastAPI lifespan setup & entrypoint router configuration
│   ├── requirements.txt            # Backend Python dependencies
│   └── tests/                      # Automated test scripts
└── architecture.excalidraw         # Editable Excalidraw diagram (open in VS Code extension)
```

---

## 3. The Real-Time Voice Pipeline

The heartbeat of the system resides in [ws_call.py](file:///d:/saral-ai/saral-ai-backend/app/api/ws_call.py). It orchestrates a bidirectional loop over a WebSocket connection `/ws/call`.

### Detailed Call Sequence Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Client as WebSocket Client (Browser)
    participant WS as ws_call.py (FastAPI Router)
    participant VAD as vad.py (VoiceActivityDetector)
    participant STT as sarvam.py (Sarvam STT)
    participant LLM as groq_llm.py (Groq LLM)
    participant TTS as sarvam.py (Sarvam TTS Stream)

    Note over Client, WS: WebSocket Connection Established
    loop Utterance Loop
        Client->>WS: Stream raw audio bytes (PCM chunks)
        WS->>VAD: process_chunk(chunk)
        alt Audio chunk is container format (WebM/Ogg/WAV)
            Note over VAD: Bypass frame-by-frame VAD; trigger STT immediately
        else Streaming raw PCM
            Note over VAD: Accumulate bytes in buffer
            Note over VAD: Calculate frame-level active speech (webrtcvad / RMS)
            Note over VAD: Detect end-of-speech silence (600ms silence threshold)
        end
        VAD-->>WS: Return True (silence detected / end-of-speech)
        
        WS->>STT: speech_to_text(audio_bytes, language)
        STT-->>WS: Return transcript string (e.g. "Hi, what are your hours?")
        WS->>Client: Send JSON message: { status: "transcribed", text: "..." }
        
        WS->>LLM: get_response(transcript, history)
        Note over LLM: Groq inference using openai/gpt-oss-20b
        LLM-->>WS: Return receptionist answer string
        
        WS->>Client: Send JSON message: { status: "tts_start" }
        WS->>TTS: text_to_speech_stream(answer, language)
        loop Yielding Audio Chunks
            TTS-->>WS: Yield chunk (MP3/Wav)
            WS->>Client: Send raw audio bytes
        end
        WS->>Client: Send JSON message: { status: "tts_end" }
        
        Note over WS: Log detailed performance metrics (total_ms, stt_ms, llm_ms, tts_ms)
    end
```

### Components of the Pipeline:

1. **Voice Activity Detector (`app/utils/vad.py`)**:
   - Accumulates incoming audio bytes.
   - Extracts 20ms frames and calculates voice activity using the `webrtcvad` library.
   - If `webrtcvad` is not installed, it falls back to a **Root Mean Square (RMS)** energy thresholding logic.
   - Once a silence threshold (configured in settings as `600ms`) is exceeded following active speech, it triggers the STT pipeline.
   - Automatically bypasses VAD chunking if a container format signature is detected (like WebM EBML, OggS, RIFF/WAV, or MP4 ftyp headers).

2. **Fallback Audio Service (`app/services/fallback_audio.py`)**:
   - To make the application robust, fixed phrases like `"Sorry, could you repeat that?"` (`stt_fallback`) and `"Let me have someone call you back"` (`llm_fallback`) are pre-generated using Sarvam TTS at FastAPI application startup (within the lifespan hook).
   - If Sarvam STT, Groq LLM, or Sarvam TTS fails or times out during a live call, the system plays these cached bytes directly from memory, preventing session drops.

3. **External Services**:
   - **Sarvam AI**: Handles voice translation, transcription (model `saaras:v3`), and streaming speech synthesis (model `bulbul:v3`).
   - **Groq LLM**: Queries `openai/gpt-oss-20b` (optimized for sub-second text completions). The request appends a standard receptionist system prompt plus up to 20 messages of historical conversation context.

---

## 4. Database Models & Schema

The data layer is hosted on Supabase (Postgres) and mapped using Pydantic models in [models.py](file:///d:/saral-ai/saral-ai-backend/app/db/models.py). 

### Schema Definition Diagram

```
+------------------------------------+       +------------------------------------+
|               users                |       |               faqs                 |
+------------------------------------+       +------------------------------------+
| id (UUID, PK)                      |       | id (UUID, PK)                      |
| email (TEXT, UNIQUE)               | <----+| user_id (UUID, FK -> users)        |
| password_hash (TEXT)               |       | question (TEXT)                    |
| business_name (TEXT)               |       | answer (TEXT)                      |
| whatsapp_number (TEXT)             |       | created_at (TIMESTAMP)             |
| created_at (TIMESTAMP)             |       | updated_at (TIMESTAMP)             |
+------------------------------------+       +------------------------------------+
                  |
                  |                                           
                  v                                           
+------------------------------------+       +------------------------------------+
|             call_logs              |       |               leads                |
+------------------------------------+       +------------------------------------+
| id (UUID, PK)                      | <----+| id (UUID, PK)                      |
| user_id (UUID, FK -> users)        |       | call_log_id (UUID, FK -> call_logs)|
| caller_number (TEXT)               |       | user_id (UUID, FK -> users)        |
| transcript (TEXT)                  |       | caller_number (TEXT)               |
| summary (TEXT)                     |       | name (TEXT)                        |
| status (TEXT)                      |       | interest (TEXT)                    |
| started_at (TIMESTAMP)             |       | urgency (TEXT)                     |
| ended_at (TIMESTAMP)               |       | budget (TEXT)                      |
+------------------------------------+       | status (TEXT)                      |
                                             | created_at (TIMESTAMP)             |
                                             +------------------------------------+
```

### Table Breakdown:
- **`users`**: Represents the MSME business owner who configures the AI receptionist. Stores contact information and password hashes (handled via `passlib` with bcrypt).
- **`faqs`**: Contains the custom Q&A facts the AI receptionist uses to answer customer queries. Updated in real-time through the REST admin routes.
- **`call_logs`**: Tracks phone calls handled by the system. Stores structured call progress, transcription text, and summaries.
- **`leads`**: High-value client records parsed from incoming call transcripts (captures interest, name, budget, and urgency for quick owner followup).

---

## 5. Latency & Diagnostics Logging

During every WebSocket audio exchange, the system calculates granular latency parameters:
- `stt_ms`: Total speech-to-text time (buffering + API latency).
- `stt_api_ms`: Exact API response time from Sarvam STT.
- `stt_buffering_overhead_ms`: Buffering delay from speech start to silence trigger.
- `stt_silence_wait_ms`: Time spent waiting for silence to conclude.
- `llm_ms`: Groq API response generation latency.
- `tts_ms`: Total time to write audio bytes back over the WebSocket.
- `total_ms`: Aggregate turnaround latency per voice response.

These parameters are written to the application log in standard JSON format:
```json
{
  "call_id": "e22a7f5a-c5c2-46be-9a99-4c126d4001d8",
  "turn_number": 1,
  "stt_ms": 1150,
  "stt_api_ms": 550,
  "stt_buffering_overhead_ms": 600,
  "stt_silence_wait_ms": 600,
  "llm_ms": 420,
  "tts_ms": 890,
  "total_ms": 2460,
  "transcript_length": 34,
  "response_length": 82
}
```
This structured logging allows system administrators to monitor the health and performance of third-party APIs (Sarvam & Groq) and tune VAD thresholds (`SILENCE_THRESHOLD_MS`, `VAD_RMS_THRESHOLD`) to hit target response speeds.
