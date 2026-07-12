"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import {
  Bot,
  Play,
  Pause,
  Square,
  Trash2,
  Settings,
  Plus,
  PhoneCall,
  Volume2,
  Calendar,
  Layers,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface Agent {
  id: string;
  name: string;
  voice_id: string;
  status: string;
  languages: string[];
  created_at: string;
  updated_at: string;
}

export default function AgentManagementPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const loadAgents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error("Please log in to manage your agents");
        setLoading(false);
        return;
      }

      const res = await fetch(`${BACKEND_URL}/api/agents`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      } else {
        toast.error("Failed to load agents");
      }
    } catch (err) {
      console.error("Failed to fetch agents", err);
      toast.error("Network error loading agents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, [supabase]);

  const handleCreateAgent = async () => {
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error("Session expired. Please log in again.");
        setCreating(false);
        return;
      }

      const agentNum = agents.length + 1;
      const res = await fetch(`${BACKEND_URL}/api/agents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: `Receptionist Agent ${agentNum}`,
        }),
      });

      if (res.ok) {
        const newAgent = await res.json();
        toast.success("Agent created successfully!");
        // Redirect directly to configuration page
        window.location.href = `/dashboard/agents/${newAgent.id}`;
      } else {
        const errData = await res.json();
        toast.error(`Error: ${errData.detail || "Failed to create agent"}`);
      }
    } catch (err) {
      console.error("Failed to create agent", err);
      toast.error("Network error creating agent");
    } finally {
      setCreating(false);
    }
  };

  const handleLifecycleAction = async (agentId: string, action: "pause" | "resume" | "stop" | "deploy") => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error("Session expired");
        return;
      }

      const endpoint = `${BACKEND_URL}/api/agents/${agentId}/${action}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        toast.success(`Agent ${action}d successfully!`);
        loadAgents();
      } else {
        const errData = await res.json();
        toast.error(`Error: ${errData.detail || `Failed to ${action} agent`}`);
      }
    } catch (err) {
      console.error(`Failed to ${action} agent`, err);
      toast.error(`Network error performing ${action}`);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm("Are you sure you want to delete this agent? This cannot be undone.")) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error("Session expired");
        return;
      }

      const res = await fetch(`${BACKEND_URL}/api/agents/${agentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        toast.success("Agent deleted successfully!");
        loadAgents();
      } else {
        const errData = await res.json();
        toast.error(`Error: ${errData.detail || "Failed to delete agent"}`);
      }
    } catch (err) {
      console.error("Failed to delete agent", err);
      toast.error("Network error deleting agent");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Running":
        return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5 font-sans font-medium">Running</Badge>;
      case "Paused":
        return <Badge className="bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5 font-sans font-medium">Paused</Badge>;
      case "Stopped":
        return <Badge className="bg-rose-50 text-rose-700 border border-rose-200 rounded-full px-2.5 py-0.5 font-sans font-medium">Stopped</Badge>;
      case "Configured":
        return <Badge className="bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5 font-sans font-medium">Configured</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground border border-border rounded-full px-2.5 py-0.5 font-sans font-medium">Draft</Badge>;
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
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* ── Creating overlay ── */}
      {creating && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-8 rounded-2xl border border-border/60 bg-card shadow-lg max-w-xs w-full text-center">
            <div className="size-14 rounded-full bg-[#f5a623]/10 flex items-center justify-center">
              <Loader2 className="size-7 text-[#f5a623] animate-spin" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground font-sans">Creating your agent…</p>
              <p className="text-xs text-muted-foreground font-sans mt-1">Setting up configuration and workspace</p>
            </div>
          </div>
        </div>
      )}
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-3xl tracking-tight text-foreground font-bold"
            style={{
              fontFamily:
                'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif',
            }}
          >
            My Agents
          </h1>
          <p className="mt-1 text-sm text-muted-foreground font-sans">
            Deploy, monitor, and manage your AI receptionists and communication settings.
          </p>
        </div>
        <Button
          onClick={handleCreateAgent}
          disabled={creating}
          className="rounded-full bg-[#f5a623] hover:bg-[#e09510] text-black font-sans font-semibold text-sm px-5 h-10 gap-1.5 shadow-sm transition-colors shrink-0"
        >
          <Plus className="size-4" />
          {creating ? "Creating..." : "Create Agent"}
        </Button>
      </div>

      {agents.length === 0 ? (
        <Card className="border border-border/60 rounded-xl bg-card shadow-none flex flex-col items-center justify-center p-12 text-center">
          <div className="size-16 rounded-full bg-[#f5a623]/10 text-[#f5a623] flex items-center justify-center mb-4">
            <Bot className="size-8" />
          </div>
          <h2
            className="text-xl font-semibold mb-2"
            style={{
              fontFamily: 'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif',
            }}
          >
            No active receptionists
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mb-6 font-sans">
            Start by creating a new AI receptionist to automate your physiotherapy clinic booking and triage workflow.
          </p>
          <Button
            onClick={handleCreateAgent}
            className="rounded-full bg-[#f5a623] hover:bg-[#e09510] text-black font-sans font-semibold text-sm px-6 h-10 gap-1.5 transition-colors"
          >
            <Plus className="size-4" />
            Create First Agent
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Card key={agent.id} className="border border-border/60 rounded-xl bg-card shadow-none flex flex-col justify-between overflow-hidden">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-foreground font-sans leading-tight">
                      {agent.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                      Created {new Date(agent.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  {getStatusBadge(agent.status)}
                </div>
              </CardHeader>

              <CardContent className="px-5 py-3 flex flex-col gap-3 flex-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-sans">
                  <Volume2 className="size-3.5 shrink-0" />
                  <span>Voice: <strong>{agent.voice_id.toUpperCase()}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-sans">
                  <Layers className="size-3.5 shrink-0" />
                  <span>Languages: {agent.languages.join(", ")}</span>
                </div>
              </CardContent>

              <CardFooter className="p-4 bg-muted/20 border-t border-border/40 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {/* Status controls */}
                  {agent.status === "Running" ? (
                    <Button
                      size="icon"
                      variant="outline"
                      title="Pause Agent"
                      onClick={() => handleLifecycleAction(agent.id, "pause")}
                      className="rounded-full size-8 shrink-0"
                    >
                      <Pause className="size-3.5" />
                    </Button>
                  ) : agent.status === "Paused" ? (
                    <Button
                      size="icon"
                      variant="outline"
                      title="Resume Agent"
                      onClick={() => handleLifecycleAction(agent.id, "resume")}
                      className="rounded-full size-8 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shrink-0"
                    >
                      <Play className="size-3.5" />
                    </Button>
                  ) : null}

                  {agent.status === "Running" || agent.status === "Paused" ? (
                    <Button
                      size="icon"
                      variant="outline"
                      title="Stop Agent"
                      onClick={() => handleLifecycleAction(agent.id, "stop")}
                      className="rounded-full size-8 text-rose-600 hover:bg-rose-50 shrink-0"
                    >
                      <Square className="size-3.5" />
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      variant="outline"
                      title="Deploy Agent"
                      onClick={() => handleLifecycleAction(agent.id, "deploy")}
                      className="rounded-full size-8 bg-[#f5a623]/10 hover:bg-[#f5a623]/20 text-black shrink-0"
                    >
                      <Play className="size-3.5" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="icon"
                    variant="outline"
                    asChild
                    title="Configure Agent"
                    className="rounded-full size-8 shrink-0"
                  >
                    <Link href={`/dashboard/agents/${agent.id}`}>
                      <Settings className="size-3.5" />
                    </Link>
                  </Button>

                  <Button
                    size="icon"
                    variant="outline"
                    asChild
                    title="Test Console"
                    className="rounded-full size-8 bg-blue-50 text-blue-600 hover:bg-blue-100 shrink-0"
                  >
                    <Link href={`/dashboard/test-agent?agent_id=${agent.id}`}>
                      <PhoneCall className="size-3.5" />
                    </Link>
                  </Button>

                  <Button
                    size="icon"
                    variant="outline"
                    title="Delete Agent"
                    onClick={() => handleDeleteAgent(agent.id)}
                    className="rounded-full size-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 shrink-0"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
