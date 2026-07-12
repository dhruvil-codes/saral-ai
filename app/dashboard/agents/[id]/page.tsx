"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import {
  Bot,
  Mic,
  Save,
  Sparkles,
  Volume2,
  ArrowLeft,
  RotateCcw,
  History,
  FileText,
  Clock,
  BookOpen,
  AlertTriangle,
  Play,
  Square,
  BadgeAlert,
  BadgeCheck,
  Rocket,
  ExternalLink,
  Plus,
  Trash2,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const VOICE_LIBRARY = [
  {
    id: "shruti",
    name: "Shruti",
    gender: "Female",
    description: "Melodious & highly conversational Hinglish. Perfect for general receptions.",
    sampleText: "नमस्ते! मैं आपकी क्या सहायता कर सकती हूँ? मैं आज आपकी अपॉइंटमेंट बुक कर देती हूँ।"
  },
  {
    id: "asha",
    name: "Asha",
    gender: "Female",
    description: "Clear, natural and professional voice. Great for healthcare support.",
    sampleText: "हेलो, निरामय क्लिनिक में आपका स्वागत है। बताइए मैं आपकी क्या सहायता करूँ?"
  },
  {
    id: "ankur",
    name: "Ankur",
    gender: "Male",
    description: "Friendly, direct and professional. Best for quick response.",
    sampleText: "नमस्ते! बताइए, आज आपकी किस प्रकार सहायता की जा सकती है?"
  },
  {
    id: "saurabh",
    name: "Saurabh",
    gender: "Male",
    description: "Empathic, calm and trustworthy. Great for clinics.",
    sampleText: "नमस्कार, बताइए आज आपकी क्या सेवा की जा सकती है? मैं डॉक्टर की स्लॉट चेक कर लेता हूँ।"
  },
  {
    id: "deepa",
    name: "Deepa",
    gender: "Female",
    description: "Warm, empathetic and polite. Best for patient care receptionists.",
    sampleText: "हेलो जी, मैं आपकी अपॉइंटमेंट बुक करने में मदद कर देती हूँ। क्या टाइम सही रहेगा?"
  }
];

const DEFAULT_PROMPT = "You are a friendly AI receptionist for City Physiotherapy Clinic. Your name is Shruti. Always be warm, professional, and speak in a mix of Hindi and English (Hinglish) when appropriate.";

const PROMPT_TEMPLATES = [
  {
    name: "Hinglish Receptionist (Recommended)",
    description: "Warm Hinglish receptionist optimized for booking and answering general clinic FAQs.",
    prompt: "You are a friendly AI receptionist for City Physiotherapy Clinic. Your name is Shruti. Always be warm, professional, and speak in a mix of Hindi and English (Hinglish) when appropriate. Your job is to check availability, hold appointments, and confirm bookings."
  },
  {
    name: "FAQ & Support Only",
    description: "Support agent focused purely on addressing clinic enquiries without booking capabilities.",
    prompt: "You are an informational assistant for City Physiotherapy Clinic. Your name is Shruti. Answer patient queries politely using business FAQs. Do not attempt to book slots. If a patient insists on booking, instruct them to contact the manager directly."
  },
  {
    name: "Urgent Medical Triage",
    description: "Agent designed to identify emergencies early and redirect callers to emergency services.",
    prompt: "You are a clinic triage receptionist. Your first priority is to understand the urgency of the patient's complaint. If the patient has severe emergency symptoms (chest pain, breathing issues), instruct them to visit the emergency room immediately. Otherwise, answer questions and route callback alerts."
  }
];

export default function AgentConfigDetailsPage() {
  const params = useParams();
  const agentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [activePreview, setActivePreview] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);

  // Agent Settings States
  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [voiceId, setVoiceId] = useState("shruti");
  const [status, setStatus] = useState("Draft");
  const [languages, setLanguages] = useState<string[]>(["en-IN", "hi-IN"]);
  const [workingHours, setWorkingHours] = useState({ start: "09:00", end: "20:00" });
  const [appointmentDuration, setAppointmentDuration] = useState(30);
  const [escalationRules, setEscalationRules] = useState("");
  
  // Versions
  const [versions, setVersions] = useState<any[]>([]);

  // Deployment simulation states
  const [deploymentLogs, setDeploymentLogs] = useState<string[]>([]);
  const [deployedNumber, setDeployedNumber] = useState<string | null>(null);

  // FAQ Knowledge Base states
  const [faqs, setFaqs] = useState<{id: string; question: string; answer: string}[]>([]);
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [savingFaq, setSavingFaq] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const loadAgentData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error("Session expired");
        return;
      }

      // Load agent details
      const agentRes = await fetch(`${BACKEND_URL}/api/agents/${agentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (agentRes.ok) {
        const data = await agentRes.json();
        setName(data.name);
        setSystemPrompt(data.system_prompt || DEFAULT_PROMPT);
        setVoiceId(data.voice_id || "shruti");
        setStatus(data.status);
        setLanguages(data.languages || ["en-IN", "hi-IN"]);
        setWorkingHours(data.working_hours || { start: "09:00", end: "20:00" });
        setAppointmentDuration(data.appointment_duration || 30);
        setEscalationRules(data.escalation_rules || "");
      } else {
        toast.error("Failed to load agent configuration");
      }

      // Load version history
      const versionRes = await fetch(`${BACKEND_URL}/api/agents/${agentId}/versions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (versionRes.ok) {
        const vData = await versionRes.json();
        setVersions(vData);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading agent data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgentData();
    loadFaqs();
  }, [agentId, supabase]);

  const loadFaqs = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch(`${BACKEND_URL}/api/faqs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFaqs(data.map((f: any) => ({ id: f.id, question: f.question, answer: f.answer })));
      }
    } catch (err) {
      console.error("Failed to load FAQs", err);
    }
  };

  const handleAddFaq = async () => {
    if (!faqQuestion.trim() || !faqAnswer.trim()) {
      toast.error("Please fill in both question and answer.");
      return;
    }
    setSavingFaq(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch(`${BACKEND_URL}/api/faqs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: faqQuestion.trim(), answer: faqAnswer.trim() }),
      });
      if (res.ok) {
        const created = await res.json();
        setFaqs(prev => [...prev, { id: created.id, question: created.question, answer: created.answer }]);
        setFaqQuestion("");
        setFaqAnswer("");
        toast.success("FAQ added to knowledge base!");
      } else {
        toast.error("Failed to add FAQ");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error adding FAQ");
    } finally {
      setSavingFaq(false);
    }
  };

  const handleDeleteFaq = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch(`${BACKEND_URL}/api/faqs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFaqs(prev => prev.filter(f => f.id !== id));
        toast.success("FAQ removed.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch(`${BACKEND_URL}/api/agents/${agentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          system_prompt: systemPrompt,
          voice_id: voiceId,
          languages,
          working_hours: workingHours,
          appointment_duration: appointmentDuration,
          escalation_rules: escalationRules,
        }),
      });

      if (res.ok) {
        toast.success("Draft saved successfully!");
        loadAgentData();
      } else {
        const err = await res.json();
        toast.error(`Save failed: ${err.detail}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Save error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVersion = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch(`${BACKEND_URL}/api/agents/${agentId}/versions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: systemPrompt,
        }),
      });

      if (res.ok) {
        toast.success("New prompt version checkpoint created!");
        loadAgentData();
      } else {
        const err = await res.json();
        toast.error(`Failed to create version: ${err.detail}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error creating checkpoint");
    } finally {
      setSaving(false);
    }
  };

  const handleDeploy = async () => {
    if (!systemPrompt.trim() || systemPrompt.length < 15) {
      toast.error("Prompt must be at least 15 characters to deploy.");
      return;
    }

    setDeploying(true);
    setDeploymentLogs([
      "Initiating deployment checks...",
      "Validating LLM system prompt...",
      "Verifying voice synthesis configs..."
    ]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      // Simulate deployment delay steps
      await new Promise(r => setTimeout(r, 1000));
      setDeploymentLogs(prev => [...prev, "Provisioning Twilio SIP connection...", "Mapping WhatsApp webhook endpoints..."]);
      
      await new Promise(r => setTimeout(r, 1000));
      setDeploymentLogs(prev => [...prev, "Syncing business FAQs embeddings database..."]);

      const res = await fetch(`${BACKEND_URL}/api/agents/${agentId}/deploy`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setDeployedNumber(data.phone_number);
        setDeploymentLogs(prev => [...prev, `Telephony provisioned successfully: ${data.phone_number}`, "Agent is now RUNNING!"]);
        toast.success("Agent successfully deployed to production!");
        setStatus("Running");
      } else {
        const err = await res.json();
        setDeploymentLogs(prev => [...prev, `Deployment failed: ${err.detail}`]);
        toast.error("Deployment failed");
      }
    } catch (err) {
      console.error(err);
      setDeploymentLogs(prev => [...prev, "Deployment terminated due to network error"]);
    } finally {
      setDeploying(false);
    }
  };

  const handlePreviewVoice = async (speaker: string, text: string) => {
    if (activePreview === speaker) {
      if (previewAudio) {
        previewAudio.pause();
      }
      setActivePreview(null);
      setPreviewAudio(null);
      return;
    }

    setActivePreview(speaker);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Call dynamic TTS preview endpoint
      const res = await fetch(`${BACKEND_URL}/api/agents/preview-tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          text,
          language: "hi-IN",
          speaker,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        setPreviewAudio(audio);
        audio.play().catch((err) => {
          // Ignore AbortError when play is interrupted by pause()
          if (err.name !== "AbortError") {
            console.error("Audio play failed:", err);
          }
        });
        audio.onended = () => {
          setActivePreview(null);
          setPreviewAudio(null);
        };
      } else {
        // Fallback to standard speech synthesis if backend TTS fails
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "hi-IN";
        utterance.onend = () => {
          setActivePreview(null);
          setPreviewAudio(null);
        };
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error(err);
      setActivePreview(null);
      setPreviewAudio(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f5a623]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="rounded-full size-8 shrink-0">
          <Link href="/dashboard/agents">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1
              className="text-2xl font-bold tracking-tight text-foreground"
              style={{
                fontFamily: 'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif',
              }}
            >
              Configure Agent
            </h1>
            <Badge className="rounded-full bg-[#f5a623]/10 text-black border border-[#f5a623]/30 font-medium">
              {status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-sans">
            Customize voice parameters, instructions, prompt templates and business settings.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Prompt & Voice */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Agent Identity */}
          <Card className="border border-border/60 rounded-xl bg-card shadow-none">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-semibold font-sans">Identity</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="agent-name" className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wide">
                  Agent Name
                </Label>
                <Input
                  id="agent-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Clinic Receptionist Shruti"
                  className="rounded-lg h-9 border-border/70 text-sm font-sans"
                />
              </div>
            </CardContent>
          </Card>

          {/* Voice Selector */}
          <Card className="border border-border/60 rounded-xl bg-card shadow-none">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-semibold font-sans">Select Voice</CardTitle>
              <CardDescription className="text-xs font-sans text-muted-foreground">
                Select a high-fidelity Indian Hindi/English voice powered by Sarvam AI.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {VOICE_LIBRARY.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => setVoiceId(v.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      voiceId === v.id
                        ? "border-[#f5a623] bg-[#f5a623]/5"
                        : "border-border/60 bg-muted/10 hover:bg-muted/20"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-foreground font-sans">{v.name}</span>
                        <Badge className="rounded-full bg-background border border-border text-[10px] font-sans">
                          {v.gender}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-normal font-sans">
                        {v.description}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewVoice(v.id, v.sampleText);
                      }}
                      className="rounded-full text-xs font-sans mt-1 gap-1.5 h-8 w-full border-border/60"
                    >
                      {activePreview === v.id ? (
                        <>
                          <Square className="size-3 text-red-500 fill-red-500" /> Stop Preview
                        </>
                      ) : (
                        <>
                          <Volume2 className="size-3" /> Listen Preview
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Prompt Editor */}
          <Card className="border border-border/60 rounded-xl bg-card shadow-none">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold font-sans">System Prompt Editor</CardTitle>
                  <CardDescription className="text-xs font-sans text-muted-foreground">
                    Define guidelines, receptionist persona, and response tone.
                  </CardDescription>
                </div>

                {/* Templates Selector */}
                <select
                  onChange={(e) => {
                    const prompt = e.target.value;
                    if (prompt) {
                      setSystemPrompt(prompt);
                      toast.info("Prompt template applied");
                    }
                  }}
                  className="h-8 rounded-full border border-border/70 bg-background px-3 text-xs font-sans text-foreground outline-none focus:ring-1 focus:ring-[#f5a623]"
                >
                  <option value="">Apply Prompt Template...</option>
                  {PROMPT_TEMPLATES.map((tpl) => (
                    <option key={tpl.name} value={tpl.prompt}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0 flex flex-col gap-4">
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Write system instructions here..."
                rows={8}
                className="font-mono text-sm leading-relaxed border-border/70 bg-background rounded-lg resize-y"
              />

              {/* Version checkpoints dropdown */}
              {versions.length > 0 && (
                <div className="flex items-center gap-2 justify-end">
                  <History className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-sans text-muted-foreground">Restore Checkpoint:</span>
                  <select
                    onChange={(e) => {
                      const ver = versions.find(v => v.id === e.target.value);
                      if (ver) {
                        setSystemPrompt(ver.prompt);
                        toast.info(`Restored version checkpoint #${ver.version}`);
                      }
                    }}
                    className="h-7 rounded-full border border-border/70 bg-background px-2 text-[11px] font-sans text-foreground"
                  >
                    <option value="">Select version history...</option>
                    {versions.map((v) => (
                      <option key={v.id} value={v.id}>
                        Version #{v.version} ({new Date(v.created_at).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </CardContent>
            <CardFooter className="p-4 bg-muted/20 border-t border-border/40 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSystemPrompt(DEFAULT_PROMPT)}
                  className="rounded-full text-xs font-sans gap-1"
                >
                  <RotateCcw className="size-3" /> Reset to Default
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="rounded-full text-xs font-sans gap-1"
                >
                  <FileText className="size-3" /> Save Draft
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveVersion}
                  disabled={saving}
                  className="rounded-full text-xs bg-[#f5a623] hover:bg-[#e09510] text-black font-semibold font-sans gap-1"
                >
                  <Save className="size-3" /> Save Version Checkpoint
                </Button>
              </div>
            </CardFooter>
          </Card>
          {/* FAQ Knowledge Base */}
          <Card className="border border-border/60 rounded-xl bg-card shadow-none">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-semibold font-sans flex items-center gap-2">
                <MessageSquare className="size-4 text-[#f5a623]" />
                FAQ Knowledge Base
              </CardTitle>
              <CardDescription className="text-xs font-sans text-muted-foreground">
                Add Q&A pairs your agent will use to answer caller queries.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 flex flex-col gap-4">
              {/* Add new FAQ form */}
              <div className="flex flex-col gap-2 p-4 rounded-xl border border-border/60 bg-muted/10">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide font-sans">Question</Label>
                <Input
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                  placeholder="e.g. What are your clinic hours?"
                  className="h-9 text-sm rounded-lg border-border/70"
                />
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide font-sans mt-1">Answer</Label>
                <Textarea
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                  placeholder="e.g. We are open Monday to Saturday, 9 AM to 8 PM."
                  rows={3}
                  className="text-sm rounded-lg border-border/70 resize-none"
                />
                <Button
                  size="sm"
                  onClick={handleAddFaq}
                  disabled={savingFaq}
                  className="rounded-full self-end bg-[#f5a623] hover:bg-[#e09510] text-black font-semibold font-sans gap-1.5 mt-1"
                >
                  {savingFaq ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                  Add to Knowledge Base
                </Button>
              </div>

              {/* Existing FAQs list */}
              {faqs.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider font-sans">
                    {faqs.length} FAQ{faqs.length !== 1 ? "s" : ""} in knowledge base
                  </span>
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                    {faqs.map((faq) => (
                      <div key={faq.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border/50 bg-background text-xs font-sans">
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                          <span className="font-semibold text-foreground truncate">{faq.question}</span>
                          <span className="text-muted-foreground line-clamp-2 leading-relaxed">{faq.answer}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteFaq(faq.id)}
                          className="shrink-0 text-muted-foreground hover:text-red-500 transition-colors mt-0.5"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 py-4 text-center">
                  <BookOpen className="size-6 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground font-sans">No FAQs yet. Add your first Q&A above.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Business Settings & Deployment */}
        <div className="flex flex-col gap-6">
          {/* Business Hours & Appointment Settings */}
          <Card className="border border-border/60 rounded-xl bg-card shadow-none">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-semibold font-sans">Business Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 flex flex-col gap-4">
              {/* Working Hours */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wide">
                  Working Hours
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold font-sans">Start</span>
                    <Input
                      type="time"
                      value={workingHours.start}
                      onChange={(e) => setWorkingHours(prev => ({ ...prev, start: e.target.value }))}
                      className="h-8 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold font-sans">End</span>
                    <Input
                      type="time"
                      value={workingHours.end}
                      onChange={(e) => setWorkingHours(prev => ({ ...prev, end: e.target.value }))}
                      className="h-8 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Slot Duration */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="duration" className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wide">
                  Appointment Duration (Minutes)
                </Label>
                <select
                  id="duration"
                  value={appointmentDuration}
                  onChange={(e) => setAppointmentDuration(Number(e.target.value))}
                  className="h-9 rounded-lg border border-border/70 bg-background px-3 text-sm font-sans"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes (Recommended)</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>

              {/* Escalation Rules */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="escalation" className="text-xs font-semibold text-muted-foreground font-sans uppercase tracking-wide">
                  Escalation & Emergency Rules
                </Label>
                <Textarea
                  id="escalation"
                  value={escalationRules}
                  onChange={(e) => setEscalationRules(e.target.value)}
                  placeholder="E.g. Redirect severe pain or bone fractures to contact the manager."
                  rows={4}
                  className="text-xs border-border/70 bg-background rounded-lg resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Telephony & WhatsApp Deploy Console */}
          <Card className="border border-border/60 rounded-xl bg-card shadow-none">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-semibold font-sans">Telephony Deployment</CardTitle>
              <CardDescription className="text-xs font-sans text-muted-foreground">
                Deploy config and provision active Twilio SIP trunk telephony.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 flex flex-col gap-4">
              <Button
                onClick={handleDeploy}
                disabled={deploying}
                className="rounded-full w-full bg-[#f5a623] hover:bg-[#e09510] text-black font-semibold font-sans gap-2 h-10 transition-colors shadow-sm"
              >
                <Rocket className="size-4 animate-bounce" />
                {deploying ? "Deploying..." : "Deploy Agent to Production"}
              </Button>

              {/* Validation Status */}
              <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 flex flex-col gap-2">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider font-sans">
                  Validation Checklist
                </span>
                <div className="flex items-center justify-between text-xs font-sans text-foreground">
                  <span className="flex items-center gap-1.5">
                    {systemPrompt.trim().length >= 15 ? (
                      <BadgeCheck className="size-4 text-emerald-500 shrink-0" />
                    ) : (
                      <BadgeAlert className="size-4 text-amber-500 shrink-0" />
                    )}
                    Prompt length (min 15 chars)
                  </span>
                  <span>{systemPrompt.trim().length} chars</span>
                </div>
                <div className="flex items-center justify-between text-xs font-sans text-foreground">
                  <span className="flex items-center gap-1.5">
                    {voiceId ? (
                      <BadgeCheck className="size-4 text-emerald-500 shrink-0" />
                    ) : (
                      <BadgeAlert className="size-4 text-amber-500 shrink-0" />
                    )}
                    Voice selected
                  </span>
                  <span className="font-semibold">{voiceId.toUpperCase()}</span>
                </div>
              </div>

              {/* Logs */}
              {deploymentLogs.length > 0 && (
                <div className="p-3 rounded-lg bg-black text-emerald-400 font-mono text-[10px] leading-relaxed flex flex-col gap-1 overflow-y-auto max-h-[140px]">
                  {deploymentLogs.map((log, i) => (
                    <div key={i} className="flex items-start gap-1">
                      <span className="text-emerald-600 shrink-0">&gt;</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              )}

              {deployedNumber && (
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex flex-col gap-2">
                  <span className="text-[10px] uppercase font-semibold text-emerald-800 tracking-wider font-sans">
                    Live Telephony Number
                  </span>
                  <span className="text-sm font-bold text-emerald-900 font-sans tracking-wide">
                    {deployedNumber}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-sans leading-normal">
                    This number is active and connected.
                  </span>
                  <a
                    href={`/dashboard/test-agent?agent_id=${agentId}`}
                    className="mt-1 flex items-center justify-center gap-2 h-9 w-full rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold font-sans text-xs transition-colors"
                  >
                    <ExternalLink className="size-3.5" />
                    Test Agent in Browser
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
