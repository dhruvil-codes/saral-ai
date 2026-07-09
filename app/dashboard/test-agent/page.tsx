"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Mic, MicOff, Phone, PhoneOff, Wifi, WifiOff } from "lucide-react";
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
  // ── UI state ──────────────────────────────────────────────────────────────
  const [status, setStatus] = useState<CallStatus>("idle");
  const [wsUrl, setWsUrl] = useState("ws://127.0.0.1:8000/ws/call");
  const [language, setLanguage] = useState("en-IN");
  const [logs, setLogs] = useState<LogEntry[]>([]);
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
    const fullUrl = `${wsUrl}?language=${language}`;
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

    ws.onmessage = async (event: MessageEvent) => {
      if (typeof event.data === "string") {
        try {
          const data = JSON.parse(event.data) as Record<string, unknown>;

          if (data.status === "transcribed") {
            const text = String(data.text ?? "");
            addLog("user", text);
            stoppedSpeakingTimeRef.current = performance.now();
            addLog("debug", "Utterance transmitted. Awaiting AI response…");
          } else if (data.status === "tts_start") {
            isAISpeakingRef.current = true;
            setStatus("ai_speaking");
            addLog("ai", "TTS stream starting…");
            await initStreamingPlayback();
          } else if (data.status === "tts_end") {
            addLog("ai", "TTS stream complete.");
            finishStreamingPlayback();
          } else if (data.cache_hit) {
            addLog("debug", "Semantic cache HIT — serving cached response.");
          } else if (data.error) {
            addLog("error", `Server error: ${String(data.error)}`);
          } else {
            addLog("debug", `Server JSON: ${JSON.stringify(data)}`);
          }
        } catch {
          addLog("debug", `Raw text message: ${event.data}`);
        }
      } else if (event.data instanceof ArrayBuffer) {
        handleTTSChunk(event.data);
      }
    };

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
    const fullUrl = `${wsUrl}?language=${language}`;
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

    ws.onmessage = async (event: MessageEvent) => {
      if (typeof event.data === "string") {
        try {
          const data = JSON.parse(event.data) as Record<string, unknown>;
          if (data.status === "transcribed") {
            const text = String(data.text ?? "");
            addLog("user", text);
            stoppedSpeakingTimeRef.current = performance.now();
            addLog("debug", "Utterance transmitted. Awaiting AI response…");
          } else if (data.status === "tts_start") {
            isAISpeakingRef.current = true;
            setStatus("ai_speaking");
            addLog("ai", "TTS stream starting…");
            await initStreamingPlayback();
          } else if (data.status === "tts_end") {
            addLog("ai", "TTS stream complete.");
            finishStreamingPlayback();
          } else if (data.cache_hit) {
            addLog("debug", "Semantic cache HIT — serving cached response.");
          } else if (data.error) {
            addLog("error", `Server error: ${String(data.error)}`);
          }
        } catch {
          addLog("debug", `Raw text message: ${event.data}`);
        }
      } else if (event.data instanceof ArrayBuffer) {
        handleTTSChunk(event.data);
      }
    };

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
  const isCallActive =
    status === "connected" ||
    status === "listening" ||
    status === "ai_speaking";

  const statusMeta = STATUS_META[status];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div>
        <h1
          className="text-3xl tracking-tight text-foreground"
          style={{
            fontFamily:
              'var(--font-heading), "ITC Garamond Book Narrow", Georgia, serif',
            fontWeight: 700,
          }}
        >
          Test Your Agent
        </h1>
        <p className="mt-1 text-sm text-muted-foreground font-sans">
          Live browser-based voice testing portal. Connects directly to your
          FastAPI WebSocket engine.
        </p>
      </div>

      {/* ── Connection Config ────────────────────────────────────────────── */}
      <Card className="border border-border/60 rounded-xl bg-card shadow-none">
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="text-sm font-semibold text-foreground font-sans">
            Connection Settings
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground font-sans">
            Configure the WebSocket endpoint before starting a call.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-4">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="ws-url"
                  className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wide"
                >
                  WebSocket URL
                </Label>
                <Input
                  id="ws-url"
                  value={wsUrl}
                  onChange={(e) => setWsUrl(e.target.value)}
                  disabled={isCallActive || status === "connecting"}
                  className="font-mono text-sm h-9 rounded-lg border-border/70 bg-background"
                  placeholder="ws://localhost:8000/ws/call"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="ws-lang"
                  className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wide"
                >
                  Language
                </Label>
                <select
                  id="ws-lang"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={isCallActive || status === "connecting"}
                  className="h-9 rounded-lg border border-border/70 bg-background px-3 text-sm font-sans text-foreground outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-[#f5a623] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="ws-mic"
                  className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wide"
                >
                  Microphone Input Device
                </Label>
                <select
                  id="ws-mic"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  onFocus={refreshDevices}
                  disabled={isCallActive || status === "connecting"}
                  className="h-9 rounded-lg border border-border/70 bg-background px-3 text-sm font-sans text-foreground outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-[#f5a623] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {devices.length === 0 ? (
                    <option value="">Default System Microphone</option>
                  ) : (
                    devices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="ws-mic-boost"
                  className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wide"
                >
                  Microphone Boost
                </Label>
                <select
                  id="ws-mic-boost"
                  value={micBoost}
                  onChange={(e) => setMicBoost(e.target.value)}
                  disabled={isCallActive || status === "connecting"}
                  className="h-9 rounded-lg border border-border/70 bg-background px-3 text-sm font-sans text-foreground outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-[#f5a623] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="auto">Auto-Boost (Recommended)</option>
                  <option value="1">1x (No Boost)</option>
                  <option value="10">10x Boost</option>
                  <option value="100">100x Boost</option>
                  <option value="500">500x Boost</option>
                  <option value="1000">1000x Boost</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Call Control Card ────────────────────────────────────────────── */}
      <Card className="border border-border/60 rounded-xl bg-card shadow-none">
        <CardContent className="p-5 flex flex-col gap-5">
          {/* Status Bar */}
          <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-border/60 bg-background">
            <div className="flex items-center gap-2.5">
              <span
                className={`inline-block size-2 rounded-full shrink-0 ${statusMeta.dotColor} ${
                  status === "listening" || status === "ai_speaking"
                    ? "animate-pulse"
                    : ""
                }`}
              />
              <span
                className={`text-sm font-semibold font-sans ${statusMeta.color}`}
              >
                {statusMeta.label}
              </span>
            </div>
            {latencyMs !== null && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground font-sans">
                  Last latency:
                </span>
                <Badge className="text-xs font-medium bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] rounded-full px-2 py-0.5">
                  {latencyMs} ms
                </Badge>
              </div>
            )}
          </div>

          {/* Waveform Visualizer */}
          <div className="relative h-20 rounded-lg border border-border/60 bg-[#f5f5f0] overflow-hidden">
            {!isCallActive && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-xs text-muted-foreground font-sans font-medium">
                  Waveform Visualizer
                </span>
              </div>
            )}
            <canvas ref={canvasRef} className="w-full h-full block" />
          </div>

          {/* Stats Row */}
          {isCallActive && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-background border border-border/60">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground font-sans">
                  Audio Sent
                </span>
                <span className="text-sm font-semibold font-sans text-foreground">
                  {totalBytesSent >= 1024
                    ? `${(totalBytesSent / 1024).toFixed(1)} KB`
                    : `${totalBytesSent} B`}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-background border border-border/60">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground font-sans">
                  Stop-to-Play
                </span>
                <span className="text-sm font-semibold font-sans text-foreground">
                  {latencyMs !== null ? `${latencyMs} ms` : "—"}
                </span>
              </div>
            </div>
          )}

          {/* CTA Button */}
          {!isCallActive && status !== "connecting" ? (
            <div className="flex flex-col gap-2 w-full">
              <Button
                id="btn-start-call"
                onClick={startCall}
                className="w-full rounded-full bg-[#f5a623] hover:bg-[#e09510] text-black font-sans font-semibold text-sm h-11 gap-2.5 shadow-none transition-colors"
              >
                <Mic className="size-4" />
                Start Call (Mic)
              </Button>
              <Button
                id="btn-start-test-call"
                onClick={startTestCall}
                variant="outline"
                className="w-full rounded-full border-border/70 text-foreground hover:bg-[#f5f5f0] font-sans font-semibold text-sm h-11 gap-2.5 shadow-none transition-colors"
              >
                <Mic className="size-4" />
                Start Test Call (WAV File)
              </Button>
            </div>
          ) : status === "connecting" ? (
            <Button
              disabled
              className="w-full rounded-full bg-[#f5a623]/60 text-black font-sans font-semibold text-sm h-11 gap-2.5 cursor-not-allowed shadow-none"
            >
              <Wifi className="size-4 animate-pulse" />
              Connecting…
            </Button>
          ) : (
            <Button
              id="btn-end-call"
              onClick={endCall}
              variant="outline"
              className="w-full rounded-full border-[#ef4444]/40 text-[#ef4444] hover:bg-[#fef2f2] hover:border-[#ef4444] font-sans font-semibold text-sm h-11 gap-2.5 shadow-none transition-colors"
            >
              <MicOff className="size-4" />
              End Call
            </Button>
          )}

          {/* Mic permission hint */}
          {status === "idle" && (
            <p className="text-center text-[11px] text-muted-foreground font-sans">
              Your browser will request microphone access when you start a call.
            </p>
          )}

          {/* Barge-in hint */}
          {status === "ai_speaking" && (
            <p className="text-center text-[11px] text-muted-foreground font-sans flex items-center justify-center gap-1.5">
              <PhoneOff className="size-3" />
              Speak to interrupt — barge-in is active
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Debug Log ────────────────────────────────────────────────────── */}
      <Card className="border border-border/60 rounded-xl bg-card shadow-none">
        <CardHeader className="px-5 pt-5 pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-foreground font-sans">
              Debug Log
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-sans mt-0.5">
              Connection events, audio metrics, transcripts, and latency.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="text-[10px] font-semibold bg-muted text-muted-foreground border border-border/60 rounded-full px-2 py-0.5">
              {logs.length} entries
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLogs([])}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground font-sans rounded-full"
            >
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-4">
          <div
            ref={logContainerRef}
            className="h-56 overflow-y-auto rounded-lg border border-border/60 bg-[#f5f5f0] p-3 flex flex-col gap-1 scroll-smooth"
            style={{ scrollBehavior: "smooth" }}
          >
            {logs.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <span className="text-xs text-muted-foreground font-sans font-medium">
                  No events yet. Start a call to see logs.
                </span>
              </div>
            ) : (
              logs.map((entry) => {
                const meta = LOG_LEVEL_META[entry.level];
                return (
                  <div
                    key={entry.id}
                    className={`flex items-start gap-2 px-2 py-1.5 rounded-md ${meta.bg}`}
                  >
                    <span
                      className={`shrink-0 text-[9px] font-bold font-mono uppercase tracking-widest mt-px ${meta.color}`}
                    >
                      {entry.ts}
                    </span>
                    <span
                      className={`shrink-0 text-[9px] font-bold font-mono uppercase tracking-widest mt-px w-7 text-right ${meta.color}`}
                    >
                      {meta.label}
                    </span>
                    <span className="text-xs font-mono text-foreground/80 leading-relaxed break-all">
                      {entry.message}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <Card className="border border-border/60 rounded-xl bg-card shadow-none">
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="text-sm font-semibold text-foreground font-sans">
            How This Works
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <ol className="flex flex-col gap-3">
            {[
              {
                icon: <Mic className="size-3.5" />,
                title: "Mic Capture",
                body: "ScriptProcessorNode captures raw PCM, downsampled to 16kHz mono 16-bit — exactly what Sarvam STT expects.",
              },
              {
                icon: <Wifi className="size-3.5" />,
                title: "WebSocket Streaming",
                body: "250ms WAV chunks are streamed continuously to /ws/call. VAD on the backend gates STT invocation.",
              },
              {
                icon: <Phone className="size-3.5" />,
                title: "Playback",
                body: "AI audio arrives as MP3 chunks. Played via MediaSource (low latency) with Web Audio API fallback.",
              },
              {
                icon: <PhoneOff className="size-3.5" />,
                title: "Barge-in",
                body: "If you speak while the AI is playing audio, the frontend immediately stops playback so the backend can process your new input.",
              },
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="size-5 rounded-full bg-[#f5a623] text-black flex items-center justify-center shrink-0 mt-0.5">
                  {step.icon}
                </div>
                <div>
                  <span className="text-xs font-semibold text-foreground font-sans">
                    {step.title}
                  </span>
                  <p className="text-xs text-muted-foreground font-sans mt-0.5 leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
