"use client";

import { useRef, useState, useEffect, useCallback, Suspense } from "react";
import { Mic, MicOff, Phone, PhoneOff, Wifi, WifiOff, Play, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { useSearchParams } from "next/navigation";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type CallStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "listening"
  | "ai_speaking";

type LogLevel = "system" | "user" | "ai" | "error" | "debug";

interface LogEntry {
  id: string;
  ts: string;
  level: LogLevel;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TARGET_SAMPLE_RATE = 16000;
const PROCESSOR_BUFFER_SIZE = 4096;

const LANGUAGE_OPTIONS = [
  { value: "en-IN", label: "English (India)" },
  { value: "hi-IN", label: "Hindi (हिन्दी)" },
  { value: "ta-IN", label: "Tamil (தமிழ்)" },
  { value: "te-IN", label: "Telugu (తెలుగు)" },
];

const STATUS_META: Record<
  CallStatus,
  { label: string; color: string; dotColor: string }
> = {
  idle: {
    label: "Disconnected",
    color: "text-[#888888]",
    dotColor: "bg-[#888888]",
  },
  connecting: {
    label: "Connecting…",
    color: "text-[#f5a623]",
    dotColor: "bg-[#f5a623]",
  },
  connected: {
    label: "Connected",
    color: "text-[#22c55e]",
    dotColor: "bg-[#22c55e]",
  },
  listening: {
    label: "Listening…",
    color: "text-[#3b82f6]",
    dotColor: "bg-[#3b82f6]",
  },
  ai_speaking: {
    label: "AI Speaking…",
    color: "text-[#a855f7]",
    dotColor: "bg-[#a855f7]",
  },
};

const LOG_LEVEL_META: Record<
  LogLevel,
  { label: string; color: string; bg: string }
> = {
  system: { label: "SYS", color: "text-[#888888]", bg: "bg-[#f5f5f0]" },
  user: { label: "YOU", color: "text-[#f97316]", bg: "bg-[#fff7ed]" },
  ai: { label: " AI", color: "text-[#22c55e]", bg: "bg-[#f0fdf4]" },
  error: { label: "ERR", color: "text-[#ef4444]", bg: "bg-[#fef2f2]" },
  debug: { label: "DBG", color: "text-[#a855f7]", bg: "bg-[#faf5ff]" },
};

// ─────────────────────────────────────────────────────────────────────────────
// WAV encoding helper
// ─────────────────────────────────────────────────────────────────────────────

function encodeWAV(samples: Int16Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // Write samples
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(44 + i * 2, samples[i], true);
  }

  return buffer;
}

// ─────────────────────────────────────────────────────────────────────────────
// Downsample helper (float32 → Int16 at target rate)
// ─────────────────────────────────────────────────────────────────────────────

function downsampleBuffer(
  buffer: Float32Array,
  originalRate: number,
  targetRate: number
): Int16Array {
  if (originalRate === targetRate) {
    const result = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      result[i] = s < 0 ? s * 32768 : s * 32767;
    }
    return result;
  }

  const ratio = originalRate / targetRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Int16Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.ceil((i + 1) * ratio), buffer.length);
    let sum = 0;
    for (let j = start; j < end; j++) sum += buffer[j];
    const avg = sum / (end - start);
    const s = Math.max(-1, Math.min(1, avg));
    result[i] = s < 0 ? s * 32768 : s * 32767;
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function TestAgentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f5a623]" />
      </div>
    }>
      <TestAgentConsoleContent />
    </Suspense>
  );
}

function TestAgentConsoleContent() {
  const searchParams = useSearchParams();
  const agentId = searchParams.get("agent_id") || "";

  // ── UI state ──────────────────────────────────────────────────────────────
  const [status, setStatus] = useState<CallStatus>("idle");
  const [wsUrl, setWsUrl] = useState(() => {
    const base = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000")
      .replace(/^https:\/\//, "wss://")
      .replace(/^http:\/\//, "ws://");
    return `${base}/ws/call`;
  });
  const [language, setLanguage] = useState("en-IN");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [testPhoneNumber, setTestPhoneNumber] = useState<string>("");
  
  const supabase = createClient();

  useEffect(() => {
    async function loadUserSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          setUserId(session.user.id);
          
          // Let's also fetch their WhatsApp number to pre-populate as default
          const token = session.access_token;
          const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.user && data.user.whatsapp_number) {
              setTestPhoneNumber(data.user.whatsapp_number);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load user session/settings for test agent", err);
      }
    }
    loadUserSession();
  }, [supabase]);

  const [aiState, setAiState] = useState<string>("Listening");
  const [callDuration, setCallDuration] = useState<number>(0);
  const [telemetryLogs, setTelemetryLogs] = useState<any[]>([]);

  const isCallActive =
    status === "connected" ||
    status === "listening" ||
    status === "ai_speaking";

  useEffect(() => {
    let interval: any = null;
    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
      setAiState("Listening");
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCallActive]);

  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [totalBytesSent, setTotalBytesSent] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("saral_selected_device_id") || "";
    }
    return "";
  });
  const [micBoost, setMicBoost] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("saral_mic_boost") || "auto";
    }
    return "auto";
  });
  const micBoostRef = useRef<string>("auto");
  
  useEffect(() => {
    micBoostRef.current = micBoost;
    if (typeof window !== "undefined") {
      localStorage.setItem("saral_mic_boost", micBoost);
    }
  }, [micBoost]);

  useEffect(() => {
    if (typeof window !== "undefined" && selectedDeviceId) {
      localStorage.setItem("saral_selected_device_id", selectedDeviceId);
    }
  }, [selectedDeviceId]);

  // Load input devices on mount
  useEffect(() => {
    async function initDevices() {
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        const inputs = list.filter((d) => d.kind === "audioinput");
        setDevices(inputs);
        
        const savedId = localStorage.getItem("saral_selected_device_id");
        if (savedId && inputs.some((d) => d.deviceId === savedId)) {
          setSelectedDeviceId(savedId);
        } else if (inputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(inputs[0].deviceId);
        }
      } catch (err) {
        console.error("enumerateDevices failed:", err);
      }
    }
    initDevices();
  }, [selectedDeviceId]);

  const refreshDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const inputs = list.filter((d) => d.kind === "audioinput");
      setDevices(inputs);
    } catch (err) {
      console.error("refreshDevices failed:", err);
    }
  }, []);

  // ── Refs (audio / WS plumbing — no re-render needed) ─────────────────────
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // TTS playback
  const nextPlayTimeRef = useRef<number>(0);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const mseQueueRef = useRef<ArrayBuffer[]>([]);
  const mseUseRef = useRef<boolean>(false);
  const fallbackBufferRef = useRef<Uint8Array>(new Uint8Array(0));
  const playedDurationRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const isAISpeakingRef = useRef<boolean>(false);
  const firstChunkPlayedRef = useRef<boolean>(false);
  const stoppedSpeakingTimeRef = useRef<number | null>(null);

  // Log scroll ref
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  const addLog = useCallback(
    (level: LogLevel, message: string) => {
      const now = new Date();
      const ts = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}.${now
        .getMilliseconds()
        .toString()
        .padStart(3, "0")}`;

      const id = `${now.getTime()}-${Math.random().toString(36).substring(2, 9)}`;
      setLogs((prev) => {
        const next = [...prev, { id, ts, level, message }];
        return next.length > 200 ? next.slice(-200) : next;
      });
    },
    []
  );

  // Auto-scroll log
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop =
        logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // ── Waveform visualizer ───────────────────────────────────────────────────
  const drawVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);

      const bufLen = analyser.frequencyBinCount;
      const data = new Uint8Array(bufLen);
      analyser.getByteTimeDomainData(data);

      ctx.fillStyle = "#f5f5f0";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#f5a623";
      ctx.beginPath();

      const sliceW = canvas.width / bufLen;
      let x = 0;
      for (let i = 0; i < bufLen; i++) {
        const v = data[i] / 128.0;
        const y = (v * canvas.height) / 2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceW;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
  }, []);

  const stopVisualizer = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#f5f5f0";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Draw flat line
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#e5e5e0";
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      }
    }
  }, []);

  // ── Barge-in: stop AI audio immediately ──────────────────────────────────
  const stopAIAudio = useCallback(() => {
    // Stop MSE audio element
    const audioEl = document.getElementById(
      "tts-audio-el"
    ) as HTMLAudioElement | null;
    if (audioEl) {
      audioEl.pause();
      audioEl.src = "";
    }

    // Stop all Web Audio sources
    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // already stopped
      }
    }
    activeSourcesRef.current = [];

    // Reset MSE refs
    mediaSourceRef.current = null;
    sourceBufferRef.current = null;
    mseQueueRef.current = [];
    mseUseRef.current = false;
    fallbackBufferRef.current = new Uint8Array(0);
    playedDurationRef.current = 0;

    // Reset next play cursor
    if (audioCtxRef.current) {
      nextPlayTimeRef.current = audioCtxRef.current.currentTime;
    }

    firstChunkPlayedRef.current = false;
    isAISpeakingRef.current = false;
  }, []);

  // ── TTS Playback: init streaming (MSE preferred) ─────────────────────────
  const initStreamingPlayback = useCallback(async () => {
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") await audioCtx.resume();

    mseQueueRef.current = [];
    mseUseRef.current = true;
    nextPlayTimeRef.current = audioCtx.currentTime;
    firstChunkPlayedRef.current = false;
    fallbackBufferRef.current = new Uint8Array(0);
    playedDurationRef.current = 0;

    if (
      typeof window !== "undefined" &&
      window.MediaSource &&
      MediaSource.isTypeSupported("audio/mpeg")
    ) {
      let audioEl = document.getElementById(
        "tts-audio-el"
      ) as HTMLAudioElement | null;
      if (!audioEl) {
        audioEl = document.createElement("audio");
        audioEl.id = "tts-audio-el";
        audioEl.style.display = "none";
        document.body.appendChild(audioEl);
      }
      audioEl.src = "";

      const ms = new MediaSource();
      mediaSourceRef.current = ms;
      audioEl.src = URL.createObjectURL(ms);

      ms.addEventListener("sourceopen", () => {
        try {
          const sb = ms.addSourceBuffer("audio/mpeg");
          sourceBufferRef.current = sb;

          sb.addEventListener("updateend", () => {
            if (mseQueueRef.current.length > 0 && !sb.updating) {
              const chunk = mseQueueRef.current.shift()!;
              try {
                sb.appendBuffer(chunk);
              } catch {
                mseUseRef.current = false;
              }
            }
          });

          sb.addEventListener("error", () => {
            mseUseRef.current = false;
          });
        } catch {
          mseUseRef.current = false;
        }
      });

      audioEl.onplaying = () => {
        if (!firstChunkPlayedRef.current && stoppedSpeakingTimeRef.current) {
          firstChunkPlayedRef.current = true;
          const latency = performance.now() - stoppedSpeakingTimeRef.current;
          setLatencyMs(Math.round(latency));
          addLog("debug", `MSE playback started. Stop-to-play latency: ${latency.toFixed(0)} ms`);
        }
      };

      audioEl.onerror = () => {
        mseUseRef.current = false;
      };

      audioEl.onended = () => {
        isAISpeakingRef.current = false;
        setStatus("connected");
        addLog("debug", "MSE Audio element playback ended.");
      };

      audioEl.play().catch(() => {});
    } else {
      mseUseRef.current = false;
    }
  }, [addLog]);

  // ── TTS chunk handler ─────────────────────────────────────────────────────
  const handleTTSChunk = useCallback(
    (arrayBuffer: ArrayBuffer) => {
      const audioCtx = audioCtxRef.current;
      if (!audioCtx) return;

      const ms = mediaSourceRef.current;
      const sb = sourceBufferRef.current;

      if (mseUseRef.current && ms) {
        if (sb && !sb.updating && mseQueueRef.current.length === 0) {
          try {
            sb.appendBuffer(arrayBuffer);
          } catch {
            mseUseRef.current = false;
            decodeAndPlayFallback(arrayBuffer);
          }
        } else {
          mseQueueRef.current.push(arrayBuffer);
        }
      } else {
        decodeAndPlayFallback(arrayBuffer);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const decodeAndPlayFallback = useCallback(
    (arrayBuffer: ArrayBuffer) => {
      const audioCtx = audioCtxRef.current;
      if (!audioCtx) return;

      // Accumulate the raw MP3 bytes
      const prev = fallbackBufferRef.current;
      const next = new Uint8Array(prev.length + arrayBuffer.byteLength);
      next.set(prev, 0);
      next.set(new Uint8Array(arrayBuffer), prev.length);
      fallbackBufferRef.current = next;

      try {
        // Decode the entire accumulated stream
        const promise = audioCtx.decodeAudioData(
          next.buffer.slice(0),
          (decoded) => {
            const played = playedDurationRef.current;
            const totalDuration = decoded.duration;
            const newDuration = totalDuration - played;

            if (newDuration > 0.05) { // Only play if we have at least 50ms of new audio
              const startTime = Math.max(
                audioCtx.currentTime,
                nextPlayTimeRef.current
              );
              const src = audioCtx.createBufferSource();
              src.buffer = decoded;
              src.connect(audioCtx.destination);
              
              // Play only the new portion: start at startTime, with offset = played
              src.start(startTime, played);
              activeSourcesRef.current.push(src);

              src.onended = () => {
                activeSourcesRef.current = activeSourcesRef.current.filter(
                  (s) => s !== src
                );
                if (activeSourcesRef.current.length === 0) {
                  isAISpeakingRef.current = false;
                  setStatus("connected");
                  addLog("debug", "Fallback Audio source playback ended.");
                }
              };

              nextPlayTimeRef.current = startTime + newDuration;
              playedDurationRef.current = totalDuration;

              if (
                !firstChunkPlayedRef.current &&
                stoppedSpeakingTimeRef.current
              ) {
                firstChunkPlayedRef.current = true;
                const latency =
                  performance.now() - stoppedSpeakingTimeRef.current;
                setLatencyMs(Math.round(latency));
                addLog(
                  "debug",
                  `Web Audio fallback playback started. Latency: ${latency.toFixed(0)} ms`
                );
              }
            }
          },
          () => {
            // Waiting for more frames to form a decodable block — expected
          }
        );

        if (promise && typeof promise.catch === "function") {
          promise.catch(() => {
            // Catch modern Promise rejection for partial chunks
          });
        }
      } catch {
        // Catch synchronous errors for legacy browsers
      }
    },
    [addLog]
  );

  const finishStreamingPlayback = useCallback(() => {
    const ms = mediaSourceRef.current;
    const sb = sourceBufferRef.current;

    if (mseUseRef.current && ms && ms.readyState === "open") {
      const checkEnd = setInterval(() => {
        if (mseQueueRef.current.length === 0 && (!sb || !sb.updating)) {
          clearInterval(checkEnd);
          try {
            ms.endOfStream();
          } catch {
            // ignore
          }
        }
      }, 80);
    }

    // Safety release: if audio element is not active/playing, release state immediately.
    // Otherwise, the audioEl.onended listener will release it when playback finishes.
    const audioEl = document.getElementById("tts-audio-el") as HTMLAudioElement | null;
    if (!audioEl || audioEl.paused || audioEl.ended || audioEl.readyState < 2) {
      isAISpeakingRef.current = false;
      setStatus("connected");
    }
  }, [addLog]);

  const handleServerMessage = useCallback(async (event: MessageEvent) => {
    if (typeof event.data === "string") {
      try {
        const data = JSON.parse(event.data) as Record<string, any>;

        if (data.status === "state_change") {
          setAiState(String(data.state));
          setTelemetryLogs((prev) => [
            ...prev,
            {
              type: "state",
              message: `AI shifted state to: ${data.state}`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        } else if (data.status === "latency") {
          setLatencyMs(Number(data.latency_ms));
          setTelemetryLogs((prev) => [
            ...prev,
            {
              type: "latency",
              message: `Turn Latency logged: ${data.latency_ms} ms`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        } else if (data.status === "rag_retrieval") {
          setTelemetryLogs((prev) => [
            ...prev,
            {
              type: "rag",
              message: `RAG search for "${data.queries}" matched FAQs: ${data.matches?.join(", ") || "none"}`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        } else if (data.status === "tool_call") {
          setTelemetryLogs((prev) => [
            ...prev,
            {
              type: "tool_call",
              message: `Tool executing: ${data.name} with args: ${typeof data.args === "object" ? JSON.stringify(data.args) : data.args}`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        } else if (data.status === "tool_result") {
          setTelemetryLogs((prev) => [
            ...prev,
            {
              type: "tool_result",
              message: `Tool returned: ${typeof data.result === "object" ? JSON.stringify(data.result) : data.result}`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        } else if (data.status === "booking_event") {
          setTelemetryLogs((prev) => [
            ...prev,
            {
              type: "booking",
              message: `Booking outcome: [${data.type.toUpperCase()}] ${data.details}`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        } else if (data.status === "transcribed") {
          const text = String(data.text ?? "");
          addLog("user", text);
          stoppedSpeakingTimeRef.current = performance.now();
          setTelemetryLogs((prev) => [
            ...prev,
            {
              type: "stt",
              message: `User speech transcribed: "${text}"`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        } else if (data.status === "tts_start") {
          isAISpeakingRef.current = true;
          setStatus("ai_speaking");
          setAiState("Speaking");
          addLog("debug", "TTS stream starting…");
          await initStreamingPlayback();
        } else if (data.status === "tts_end") {
          addLog("debug", "TTS stream complete.");
          finishStreamingPlayback();
          setAiState("Listening");
        } else if (data.status === "ai_text") {
          const text = String(data.text ?? "");
          setLogs((prev) => {
            if (prev.length > 0 && prev[prev.length - 1].level === "ai") {
              const lastLog = prev[prev.length - 1];
              // Append to the last AI log with a space
              const updatedLast = {
                ...lastLog,
                message: lastLog.message.endsWith(" ") ? lastLog.message + text : lastLog.message + " " + text
              };
              return [...prev.slice(0, -1), updatedLast];
            } else {
              const now = new Date();
              const ts = `${now.getHours().toString().padStart(2, "0")}:${now
                .getMinutes()
                .toString()
                .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}.${now
                .getMilliseconds()
                .toString()
                .padStart(3, "0")}`;
              const id = `${now.getTime()}-${Math.random().toString(36).substring(2, 9)}`;
              return [...prev, { id, ts, level: "ai" as const, message: text }];
            }
          });
        } else if (data.cache_hit) {
          addLog("debug", "Semantic cache HIT — serving cached response.");
          setTelemetryLogs((prev) => [
            ...prev,
            {
              type: "cache",
              message: "Semantic cache HIT — serving cached response.",
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        } else if (data.error) {
          addLog("error", `Server error: ${String(data.error)}`);
          setTelemetryLogs((prev) => [
            ...prev,
            {
              type: "error",
              message: `Server reported error: ${data.error}`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        } else {
          addLog("debug", `Server JSON: ${JSON.stringify(data)}`);
        }
      } catch {
        addLog("debug", `Raw text message: ${event.data}`);
      }
    } else if (event.data instanceof ArrayBuffer) {
      handleTTSChunk(event.data);
    }
  }, [addLog, initStreamingPlayback, finishStreamingPlayback, handleTTSChunk]);

  // ── PCM accumulation buffer across processor callbacks ───────────────────
  const pcmAccumRef = useRef<Int16Array[]>([]);

  // ── Start call ────────────────────────────────────────────────────────────
  const startCall = useCallback(async () => {
    addLog("system", `Connecting to ${wsUrl}?language=${language}…`);
    setStatus("connecting");
    isAISpeakingRef.current = false;

    // 1. Request mic
    let stream: MediaStream;
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : {}),
        },
      };
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog("error", `Microphone permission denied: ${msg}`);
      setStatus("idle");
      return;
    }
    mediaStreamRef.current = stream;
    refreshDevices();

    // Log mic track metadata for debugging
    const track = stream.getAudioTracks()[0];
    console.log("[Mic Track Status]", {
      enabled: track?.enabled,
      muted: track?.muted,
      label: track?.label,
      readyState: track?.readyState,
    });

    // 2. Create AudioContext
    const audioCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    audioCtxRef.current = audioCtx;
    if (audioCtx.state === "suspended") await audioCtx.resume();

    addLog(
      "debug",
      `AudioContext created. Native sample rate: ${audioCtx.sampleRate} Hz → downsampling to ${TARGET_SAMPLE_RATE} Hz`
    );

    // 3. Connect mic → analyser (for visualizer)
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    analyserRef.current = analyser;
    source.connect(analyser);

    // 4. ScriptProcessorNode for PCM capture + downsampling
    const processor = audioCtx.createScriptProcessor(
      PROCESSOR_BUFFER_SIZE,
      1,
      1
    );
    processorRef.current = processor;
    analyser.connect(processor);
    processor.connect(audioCtx.destination);

    pcmAccumRef.current = [];
    let totalSamplesAccum = 0;
    const SEND_INTERVAL_SAMPLES = TARGET_SAMPLE_RATE * 0.25; // send every ~250ms

    processor.onaudioprocess = (e: AudioProcessingEvent) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate raw float32 RMS
      let rawSum = 0;
      for (let i = 0; i < inputData.length; i++) {
        rawSum += inputData[i] * inputData[i];
      }
      const rawRms = Math.sqrt(rawSum / inputData.length);
      console.log(`[Mic Debug Raw] Float32 RMS: ${rawRms.toFixed(6)}`);

      const downsampled = downsampleBuffer(
        inputData,
        audioCtx.sampleRate,
        TARGET_SAMPLE_RATE
      );
      pcmAccumRef.current.push(downsampled);
      totalSamplesAccum += downsampled.length;

      if (totalSamplesAccum >= SEND_INTERVAL_SAMPLES) {
        // Flatten accumulated PCM
        const totalLen = pcmAccumRef.current.reduce(
          (acc, c) => acc + c.length,
          0
        );
        const flat = new Int16Array(totalLen);
        let offset = 0;
        for (const chunk of pcmAccumRef.current) {
          flat.set(chunk, offset);
          offset += chunk.length;
        }
        pcmAccumRef.current = [];
        totalSamplesAccum = 0;

        // Apply gain booster
        let appliedGain = 1;
        const currentBoost = micBoostRef.current;
        if (currentBoost === "auto") {
          // Dynamic AGC: Target a peak of 16000 (~50% amplitude)
          let maxVal = 0;
          for (let i = 0; i < flat.length; i++) {
            const absVal = Math.abs(flat[i]);
            if (absVal > maxVal) maxVal = absVal;
          }
          // Only boost if there is a non-zero signal to prevent static amplification
          if (maxVal >= 1 && maxVal < 16000) {
            appliedGain = 16000 / maxVal;
            // Cap gain to 800x
            appliedGain = Math.min(appliedGain, 800);
          }
        } else {
          appliedGain = parseFloat(currentBoost);
        }

        if (appliedGain > 1) {
          for (let i = 0; i < flat.length; i++) {
            flat[i] = Math.max(-32768, Math.min(32767, Math.round(flat[i] * appliedGain)));
          }
          console.log(`[Mic AGC] Boosted quiet audio by ${appliedGain.toFixed(1)}x (original peak: ${Math.round(16000 / appliedGain)})`);
        }

        // Calculate RMS of flat Int16 samples
        let sumSquares = 0;
        for (let i = 0; i < flat.length; i++) {
          sumSquares += flat[i] * flat[i];
        }
        const rms = Math.sqrt(sumSquares / flat.length);
        console.log(`[Mic Debug Int16] Flat RMS: ${rms.toFixed(1)}, samples: ${flat.length}`);

        // Barge-in: if AI is speaking AND the user is actively speaking.
        // We set the threshold to 3000 to prevent speaker echo (RMS ~1800) from falsely cutting off the AI,
        // while allowing the user's boosted speech (RMS ~4000+) to successfully interrupt.
        const USER_SPEECH_THRESHOLD = 3000;
        if (isAISpeakingRef.current && firstChunkPlayedRef.current && rms > USER_SPEECH_THRESHOLD) {
          addLog(
            "debug",
            `Barge-in triggered (RMS: ${Math.round(rms)} > ${USER_SPEECH_THRESHOLD}) — stopping AI playback.`
          );
          stopAIAudio();
          const ws = wsRef.current;
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event: "barge_in" }));
          }
        }

        // If the AI is still speaking (user did not barge in), discard this chunk and do not send it.
        // This avoids feedback loop where AI's own voice/echo is sent to the VAD.
        if (isAISpeakingRef.current) {
          return;
        }

        stoppedSpeakingTimeRef.current = null; // reset; will be set when PCM send happens

        const pcmBuffer = flat.buffer;
        ws.send(pcmBuffer);

        setTotalBytesSent((prev) => {
          const next = prev + pcmBuffer.byteLength;
          return next;
        });
      }
    };

    // 5. Open WebSocket
    if (testPhoneNumber.trim()) {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(testPhoneNumber.trim())) {
        addLog("error", "Invalid test phone number. Must be in E.164 format, e.g. +919999999999");
        toast.error("Invalid test phone number format");
        setStatus("idle");
        // cleanup
        stream.getTracks().forEach((t) => t.stop());
        await audioCtx.close();
        return;
      }
    }

    const queryParams = new URLSearchParams({
      language,
      ...(userId ? { user_id: userId } : {}),
      ...(testPhoneNumber ? { caller_number: testPhoneNumber } : {}),
      ...(agentId ? { agent_id: agentId } : {}),
    });
    const fullUrl = `${wsUrl}?${queryParams.toString()}`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(fullUrl);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog("error", `Failed to create WebSocket: ${msg}`);
      setStatus("idle");
      // cleanup
      stream.getTracks().forEach((t) => t.stop());
      await audioCtx.close();
      return;
    }

    ws.onopen = () => {
      addLog("system", "WebSocket connection opened.");
      setStatus("listening");
      drawVisualizer();
    };

    ws.onmessage = handleServerMessage;

    ws.onclose = (e) => {
      addLog("system", `WebSocket closed. Code: ${e.code}, reason: ${e.reason || "none"}`);
      setStatus("idle");
      
      // Fully release mic and audio resources on connection close
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      stopAIAudio();
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch {
          // ignore
        }
        audioCtxRef.current = null;
      }
      stopVisualizer();
      analyserRef.current = null;
    };

    ws.onerror = () => {
      addLog("error", "WebSocket error. Is the backend running?");
      setStatus("idle");
      
      // Fully release mic and audio resources on connection error
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      stopAIAudio();
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch {
          // ignore
        }
        audioCtxRef.current = null;
      }
      stopVisualizer();
      analyserRef.current = null;
    };
  }, [
    wsUrl,
    language,
    addLog,
    drawVisualizer,
    stopVisualizer,
    initStreamingPlayback,
    finishStreamingPlayback,
    handleTTSChunk,
    stopAIAudio,
    selectedDeviceId,
    refreshDevices,
  ]);

  // ── End call ──────────────────────────────────────────────────────────────
  const endCall = useCallback(async () => {
    addLog("system", "Ending call…");

    // Stop WS
    if (wsRef.current) {
      wsRef.current.close(1000, "User ended call");
      wsRef.current = null;
    }

    // Stop mic
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    // Disconnect processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Stop AI audio
    stopAIAudio();

    // Close AudioContext
    if (audioCtxRef.current) {
      try {
        await audioCtxRef.current.close();
      } catch {
        // ignore
      }
      audioCtxRef.current = null;
    }

    // Stop visualizer
    stopVisualizer();
    analyserRef.current = null;

    // Reset bytes counter
    setTotalBytesSent(0);
    pcmAccumRef.current = [];

    setStatus("idle");
    addLog("system", "Call ended. All resources released.");
  }, [addLog, stopAIAudio, stopVisualizer]);

  // ── Start test call (WAV file) ─────────────────────────────────────────────
  const startTestCall = useCallback(async () => {
    addLog("system", "Starting test call using real_voice.wav…");
    setStatus("connecting");
    isAISpeakingRef.current = false;

    // 1. Create AudioContext
    const audioCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    audioCtxRef.current = audioCtx;
    if (audioCtx.state === "suspended") await audioCtx.resume();

    addLog("debug", `AudioContext created. Native sample rate: ${audioCtx.sampleRate} Hz`);

    // 2. Fetch and decode real_voice.wav
    let audioBuffer: AudioBuffer;
    try {
      addLog("debug", "Fetching /real_voice.wav…");
      const res = await fetch("/real_voice.wav");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      addLog("debug", "Decoding /real_voice.wav…");
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      addLog("debug", `Decoded audio: ${audioBuffer.duration.toFixed(2)}s, sampleRate=${audioBuffer.sampleRate}Hz`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog("error", `Failed to load test audio: ${msg}`);
      setStatus("idle");
      await audioCtx.close();
      return;
    }

    // 3. Connect buffer source -> analyser (for visualizer)
    const sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    analyserRef.current = analyser;
    sourceNode.connect(analyser);

    // 4. ScriptProcessorNode for PCM capture + downsampling
    const processor = audioCtx.createScriptProcessor(
      PROCESSOR_BUFFER_SIZE,
      1,
      1
    );
    processorRef.current = processor;
    analyser.connect(processor);
    processor.connect(audioCtx.destination);

    // 5. Open WebSocket
    if (testPhoneNumber.trim()) {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(testPhoneNumber.trim())) {
        addLog("error", "Invalid test phone number. Must be in E.164 format, e.g. +919999999999");
        toast.error("Invalid test phone number format");
        setStatus("idle");
        await audioCtx.close();
        return;
      }
    }

    const queryParams = new URLSearchParams({
      language,
      ...(userId ? { user_id: userId } : {}),
      ...(testPhoneNumber ? { caller_number: testPhoneNumber } : {}),
      ...(agentId ? { agent_id: agentId } : {}),
    });
    const fullUrl = `${wsUrl}?${queryParams.toString()}`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(fullUrl);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog("error", `Failed to create WebSocket: ${msg}`);
      setStatus("idle");
      await audioCtx.close();
      return;
    }

    // Set up PCM sending (reused from onaudioprocess)
    pcmAccumRef.current = [];
    let totalSamplesAccum = 0;
    const SEND_INTERVAL_SAMPLES = TARGET_SAMPLE_RATE * 0.25;

    processor.onaudioprocess = (e: AudioProcessingEvent) => {
      const currentWs = wsRef.current;
      if (!currentWs || currentWs.readyState !== WebSocket.OPEN) return;

      const inputData = e.inputBuffer.getChannelData(0);
      const downsampled = downsampleBuffer(
        inputData,
        audioCtx.sampleRate,
        TARGET_SAMPLE_RATE
      );
      pcmAccumRef.current.push(downsampled);
      totalSamplesAccum += downsampled.length;

      if (totalSamplesAccum >= SEND_INTERVAL_SAMPLES) {
        const totalLen = pcmAccumRef.current.reduce((acc, c) => acc + c.length, 0);
        const flat = new Int16Array(totalLen);
        let offset = 0;
        for (const chunk of pcmAccumRef.current) {
          flat.set(chunk, offset);
          offset += chunk.length;
        }
        pcmAccumRef.current = [];
        totalSamplesAccum = 0;

        const pcmBuffer = flat.buffer;
        currentWs.send(pcmBuffer);
        
        setTotalBytesSent((prev) => prev + pcmBuffer.byteLength);
      }
    };

    ws.onopen = () => {
      addLog("system", "WebSocket connection opened. Playing test WAV…");
      setStatus("listening");
      drawVisualizer();
      
      // Start playback of the test WAV
      sourceNode.start(0);
      addLog("debug", "Playback started. Streaming audio…");
      
      sourceNode.onended = () => {
        addLog("debug", "Test WAV playback ended. Streaming silence to trigger VAD…");
      };
    };

    ws.onmessage = handleServerMessage;

    ws.onclose = (e) => {
      addLog("system", `WebSocket closed. Code: ${e.code}, reason: ${e.reason || "none"}`);
      setStatus("idle");
      try {
        sourceNode.stop();
      } catch {}
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      stopAIAudio();
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch {}
        audioCtxRef.current = null;
      }
      stopVisualizer();
      analyserRef.current = null;
    };

    ws.onerror = () => {
      addLog("error", "WebSocket error.");
      setStatus("idle");
    };

  }, [
    wsUrl,
    language,
    addLog,
    drawVisualizer,
    stopVisualizer,
    initStreamingPlayback,
    finishStreamingPlayback,
    handleTTSChunk,
    stopAIAudio,
  ]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      // Synchronous cleanup only (can't await in useEffect return)
      if (wsRef.current) wsRef.current.close(1000);
      if (mediaStreamRef.current)
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      if (processorRef.current) processorRef.current.disconnect();
      if (audioCtxRef.current) audioCtxRef.current.close();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      // Remove audio element
      const el = document.getElementById("tts-audio-el");
      if (el) el.remove();
    };
  }, []);

  // ── Canvas resize ─────────────────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      if (canvasRef.current) {
        canvasRef.current.width =
          canvasRef.current.parentElement?.clientWidth ?? 300;
        canvasRef.current.height =
          canvasRef.current.parentElement?.clientHeight ?? 80;
        stopVisualizer();
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [stopVisualizer]);

  // ── Derived state ─────────────────────────────────────────────────────────

  const statusMeta = STATUS_META[status];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight text-foreground"
            style={{
              fontFamily:
                'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif',
            }}
          >
            Developer Voice Console
          </h1>
          <p className="text-xs text-muted-foreground font-sans mt-0.5">
            Real-time sandbox testing environment. Monitor live transcripts, tool calls, and RAG contexts.
          </p>
        </div>
        {agentId && (
          <Badge className="bg-[#f5a623]/10 text-black border border-[#f5a623]/30 px-3 py-1 text-xs font-semibold rounded-full font-sans">
            Testing Agent: {agentId.slice(0, 8)}...
          </Badge>
        )}
      </div>

      {/* ── 3-Column Developer Terminal Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── Column 1: Controls & Status ── */}
        <div className="flex flex-col gap-6">
          {/* Connection Settings Card */}
          <Card className="border border-border/60 rounded-xl bg-card shadow-none">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-sm font-semibold text-foreground font-sans">
                Sandbox Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ws-url" className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wide">
                  WebSocket URL
                </Label>
                <Input
                  id="ws-url"
                  value={wsUrl}
                  onChange={(e) => setWsUrl(e.target.value)}
                  disabled={isCallActive || status === "connecting"}
                  className="font-mono text-xs h-9 rounded-lg border-border/70 bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ws-lang" className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wide">
                    Language
                  </Label>
                  <select
                    id="ws-lang"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled={isCallActive || status === "connecting"}
                    className="h-9 rounded-lg border border-border/70 bg-background px-3 text-xs font-sans"
                  >
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ws-mic-boost" className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wide">
                    Mic Boost
                  </Label>
                  <select
                    id="ws-mic-boost"
                    value={micBoost}
                    onChange={(e) => setMicBoost(e.target.value)}
                    disabled={isCallActive || status === "connecting"}
                    className="h-9 rounded-lg border border-border/70 bg-background px-3 text-xs font-sans"
                  >
                    <option value="auto">Auto-Boost (Recommended)</option>
                    <option value="1">1x (No Boost)</option>
                    <option value="10">10x</option>
                    <option value="100">100x</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ws-mic" className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wide">
                  Input Device
                </Label>
                <select
                  id="ws-mic"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  onFocus={refreshDevices}
                  disabled={isCallActive || status === "connecting"}
                  className="h-9 rounded-lg border border-border/70 bg-background px-3 text-xs font-sans text-ellipsis overflow-hidden"
                >
                  {devices.length === 0 ? (
                    <option value="">Default Microphone</option>
                  ) : (
                    devices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Mic ${device.deviceId.slice(0, 5)}...`}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="test-phone" className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wide">
                  Test Phone / WhatsApp Number
                </Label>
                <Input
                  id="test-phone"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                  disabled={isCallActive || status === "connecting"}
                  className="text-xs h-9 rounded-lg border-border/70 bg-background"
                  placeholder="e.g. +919999999999"
                />
                <span className="text-[10px] text-muted-foreground font-sans leading-normal">
                  Alert logs, appointments and Stage 2 notifications will be routed here.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Call Control Card */}
          <Card className="border border-border/60 rounded-xl bg-card shadow-none">
            <CardContent className="p-5 flex flex-col gap-4">
              {/* Telemetry Stats Bar */}
              <div className="flex flex-col gap-2 p-3.5 rounded-lg border border-border/60 bg-background">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-sans">Status</span>
                  <span className={`text-xs font-semibold font-sans ${statusMeta.color} flex items-center gap-1.5`}>
                    <span className={`inline-block size-2 rounded-full ${statusMeta.dotColor} ${isCallActive ? "animate-pulse" : ""}`} />
                    {statusMeta.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-sans">AI State</span>
                  <Badge className="bg-[#f5a623]/10 text-black border border-[#f5a623]/30 px-2 py-0.5 text-[10px] font-sans font-semibold uppercase">
                    {aiState}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-sans">Duration</span>
                  <span className="text-xs font-semibold font-mono text-foreground">
                    {Math.floor(callDuration / 60)}m {callDuration % 60}s
                  </span>
                </div>
                {latencyMs !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-sans">Turn Latency</span>
                    <Badge className="text-[10px] font-medium bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] rounded-full px-2 py-0.5">
                      {latencyMs} ms
                    </Badge>
                  </div>
                )}
              </div>

              {/* Waveform Visualizer */}
              <div className="relative h-20 rounded-lg border border-border/60 bg-[#f5f5f0] overflow-hidden">
                {!isCallActive && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-muted-foreground font-sans font-semibold tracking-wider uppercase">
                      Waveform Monitor
                    </span>
                  </div>
                )}
                <canvas ref={canvasRef} className="w-full h-full block" />
              </div>

              {/* Action Trigger Buttons */}
              {!isCallActive && status !== "connecting" ? (
                <div className="flex flex-col gap-2 w-full">
                  <Button
                    onClick={startCall}
                    className="w-full rounded-full bg-[#f5a623] hover:bg-[#e09510] text-black font-semibold font-sans text-xs h-10 gap-2 shadow-sm transition-colors"
                  >
                    <Mic className="size-3.5" />
                    Start Session (Microphone)
                  </Button>
                  <Button
                    onClick={startTestCall}
                    variant="outline"
                    className="w-full rounded-full border-border/70 text-foreground font-semibold font-sans text-xs h-10 gap-2 transition-colors"
                  >
                    <Play className="size-3.5" />
                    Stream Test Audio (WAV)
                  </Button>
                </div>
              ) : status === "connecting" ? (
                <Button
                  disabled
                  className="w-full rounded-full bg-[#f5a623]/60 text-black font-semibold font-sans text-xs h-10 gap-2 cursor-not-allowed shadow-none"
                >
                  <Wifi className="size-3.5 animate-pulse" />
                  Connecting Sandbox...
                </Button>
              ) : (
                <Button
                  onClick={endCall}
                  variant="outline"
                  className="w-full rounded-full border-[#ef4444]/40 text-[#ef4444] hover:bg-[#fef2f2] hover:border-[#ef4444] font-semibold font-sans text-xs h-10 gap-2 transition-colors"
                >
                  <MicOff className="size-3.5" />
                  End Session
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Column 2: Live Transcripts ── */}
        <div className="flex flex-col gap-6">
          <Card className="border border-border/60 rounded-xl bg-card shadow-none flex-1 flex flex-col min-h-[460px]">
            <CardHeader className="px-5 pt-5 pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-semibold text-foreground font-sans">
                Live Conversation Feed
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 flex-1 overflow-y-auto max-h-[420px] flex flex-col gap-4">
              {logs.filter(l => l.level === "user" || l.level === "ai").length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground gap-2">
                  <Bot className="size-8 opacity-40 animate-bounce" />
                  <p className="text-xs font-sans">Sandbox is idle. Start a call to begin speaking with your receptionist.</p>
                </div>
              ) : (
                logs
                  .filter(l => l.level === "user" || l.level === "ai")
                  .map((log) => {
                    const isUser = log.level === "user";
                    return (
                      <div
                        key={log.id}
                        className={`flex flex-col max-w-[85%] ${
                          isUser ? "self-end items-end" : "self-start items-start"
                        }`}
                      >
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase font-sans mb-1 px-1">
                          {isUser ? "You" : "AI Receptionist"}
                        </span>
                        <div
                          className={`p-3.5 rounded-2xl text-xs font-sans leading-relaxed ${
                            isUser
                              ? "bg-[#f5a623]/10 text-foreground border border-[#f5a623]/30 rounded-tr-none"
                              : "bg-muted text-foreground border border-border/40 rounded-tl-none"
                          }`}
                        >
                          {log.message}
                        </div>
                      </div>
                    );
                  })
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Column 3: Developer Tracing & Telemetry matched logs ── */}
        <div className="flex flex-col gap-6">
          <Card className="border border-border/60 rounded-xl bg-card shadow-none flex-1 flex flex-col min-h-[460px]">
            <CardHeader className="px-5 pt-5 pb-3 border-b border-border/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-foreground font-sans">
                  Developer Tracing
                </CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTelemetryLogs([])}
                className="h-7 px-3 text-[10px] font-sans font-semibold rounded-full hover:bg-muted"
              >
                Clear
              </Button>
            </CardHeader>
            <CardContent className="p-5 flex-1 overflow-y-auto max-h-[420px] flex flex-col gap-3 font-mono text-[10px]">
              {telemetryLogs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground gap-2">
                  <Wifi className="size-8 opacity-40" />
                  <p className="text-[10px] font-sans">No trace telemetry captured yet.</p>
                </div>
              ) : (
                telemetryLogs.map((log, idx) => {
                  let badgeColor = "bg-muted text-muted-foreground";
                  if (log.type === "rag") badgeColor = "bg-purple-100 text-purple-700 border border-purple-200";
                  if (log.type === "tool_call" || log.type === "tool_result") badgeColor = "bg-blue-100 text-blue-700 border border-blue-200";
                  if (log.type === "booking") badgeColor = "bg-emerald-100 text-emerald-700 border border-emerald-200";
                  if (log.type === "error") badgeColor = "bg-rose-100 text-rose-700 border border-rose-200";

                  return (
                    <div key={idx} className="p-3.5 rounded-lg bg-muted/30 border border-border/60 flex flex-col gap-1.5 leading-normal">
                      <div className="flex items-center justify-between">
                        <Badge className={`px-2 py-0.5 rounded-full text-[8px] font-semibold tracking-wider font-sans uppercase ${badgeColor}`}>
                          {log.type}
                        </Badge>
                        <span className="text-[9px] text-muted-foreground">{log.timestamp}</span>
                      </div>
                      <p className="text-foreground/90 break-all">{log.message}</p>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}


