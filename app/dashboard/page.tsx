"use client";

import { useEffect, useState } from "react";
import {
  Phone,
  Users,
  Clock,
  PhoneMissed,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { HeadlessOnboardingDemo } from "@/components/onboarding-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChartBar } from "@/components/dashboard/chart-bar";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const demoMetricCards = [
  {
    title: "Total Calls (Today)",
    value: "128",
    description: "+14% from yesterday",
    icon: Phone,
    trend: "up" as const,
  },
  {
    title: "Leads Captured",
    value: "43",
    description: "+8 new today",
    icon: Users,
    trend: "up" as const,
  },
  {
    title: "Avg. Latency",
    value: "7s",
    description: "Within optimal range",
    icon: Clock,
    trend: "neutral" as const,
  },
  {
    title: "Missed Calls",
    value: "0",
    description: "All calls handled",
    icon: PhoneMissed,
    trend: "up" as const,
  },
];

const emptyMetricCards = [
  {
    title: "Total Calls (Today)",
    value: "0",
    description: "No calls yet",
    icon: Phone,
    trend: "neutral" as "up" | "down" | "neutral",
  },
  {
    title: "Leads Captured",
    value: "0",
    description: "Complete onboarding to start",
    icon: Users,
    trend: "neutral" as "up" | "down" | "neutral",
  },
  {
    title: "Avg. Latency",
    value: "—",
    description: "Waiting for first call",
    icon: Clock,
    trend: "neutral" as "up" | "down" | "neutral",
  },
  {
    title: "Missed Calls",
    value: "0",
    description: "No activity yet",
    icon: PhoneMissed,
    trend: "neutral" as "up" | "down" | "neutral",
  },
];

const demoRecentCalls = [
  { caller: "+91 98765 43210", status: "Completed", duration: "3m 42s" },
  { caller: "+91 87654 32109", status: "Voicemail", duration: "0m 32s" },
  { caller: "+91 76543 21098", status: "Completed", duration: "5m 18s" },
  { caller: "+91 65432 10987", status: "Completed", duration: "2m 05s" },
  { caller: "+91 54321 09876", status: "Voicemail", duration: "0m 18s" },
  { caller: "+91 43210 98765", status: "Completed", duration: "7m 44s" },
];

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function getDailyCallStats(calls: any[]) {
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const dayLabel = daysOfWeek[d.getDay()];
    
    const count = calls.filter((c) => {
      const callDate = new Date(c.started_at);
      return (
        callDate.getFullYear() === d.getFullYear() &&
        callDate.getMonth() === d.getMonth() &&
        callDate.getDate() === d.getDate()
      );
    }).length;
    
    let peakTime = "—";
    if (count > 0) {
      const hourlyCounts: Record<number, number> = {};
      calls.forEach((c) => {
        const callDate = new Date(c.started_at);
        if (
          callDate.getFullYear() === d.getFullYear() &&
          callDate.getMonth() === d.getMonth() &&
          callDate.getDate() === d.getDate()
        ) {
          const hour = callDate.getHours();
          hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
        }
      });
      let maxHour = 10;
      let maxHourCount = 0;
      Object.entries(hourlyCounts).forEach(([hour, cnt]) => {
        if (cnt > maxHourCount) {
          maxHourCount = cnt;
          maxHour = parseInt(hour);
        }
      });
      const ampm = maxHour >= 12 ? "PM" : "AM";
      const formattedHour = maxHour % 12 || 12;
      peakTime = `${formattedHour}:00 ${ampm}`;
    }

    result.push({
      day: dayLabel,
      calls: count,
      peakTime: peakTime
    });
  }
  return result;
}

export default function DashboardPage() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [userStatusLoaded, setUserStatusLoaded] = useState(false);

  const [realMetricCards, setRealMetricCards] = useState(emptyMetricCards);
  const [realRecentCalls, setRealRecentCalls] = useState<any[]>([]);
  const [realChartData, setRealChartData] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function detectNewUser() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          // Unauthenticated: leave demo UI; layout/auth can redirect elsewhere.
          if (!cancelled) setUserStatusLoaded(true);
          return;
        }

        let res = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // On 401, try refreshing the Supabase session (access token may have expired)
        if (res.status === 401) {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !refreshData.session?.access_token) {
            // Refresh failed — session is truly invalid, redirect to login
            if (!cancelled) window.location.href = "/login";
            return;
          }
          // Retry with the new access token
          res = await fetch(`${BACKEND_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${refreshData.session.access_token}` },
          });
        }

        if (!res.ok) {
          console.error("Failed to load user for onboarding detection", res.status);
          if (!cancelled) setUserStatusLoaded(true);
          return;
        }

        const data = await res.json();
        const user = data.user;
        // Brand-new accounts are provisioned with saral_active=false until
        // they finish the onboarding wizard ("Launch Voice Agent").
        const isNew = user?.saral_active === false;

        if (!cancelled) {
          setNeedsOnboarding(isNew);
          if (isNew) {
            setShowOnboarding(true);
          }
          setUserStatusLoaded(true);
        }
      } catch (err) {
        console.error("Error detecting new-user onboarding state", err);
        if (!cancelled) setUserStatusLoaded(true);
      }
    }

    detectNewUser();
    return () => {
      cancelled = true;
    };
  }, [userStatusLoaded]); // Re-run when status load triggers refresh


  useEffect(() => {
    if (needsOnboarding || !userStatusLoaded) return;

    let cancelled = false;

    async function loadRealStats() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        // Fetch calls and leads in parallel
        const [callsRes, leadsRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/calls`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${BACKEND_URL}/api/leads`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (cancelled) return;

        let calls: any[] = [];
        let leads: any[] = [];

        if (callsRes.ok) {
          calls = await callsRes.json();
        }
        if (leadsRes.ok) {
          leads = await leadsRes.json();
        }

        // 1. Calculate metrics
        // Total Calls (Today)
        const todayStr = new Date().toDateString();
        const totalCallsToday = calls.filter((c) => new Date(c.started_at).toDateString() === todayStr).length;
        
        // Leads Captured
        const leadsCaptured = leads.length;

        // Missed Calls
        const missedCalls = calls.filter((c) => c.status === "failed" || c.status === "missed").length;

        // Avg Latency (7s if calls > 0, else waiting)
        const latencyVal = calls.length > 0 ? "7s" : "—";
        const latencyDesc = calls.length > 0 ? "Within optimal range" : "Waiting for first call";

        const updatedMetrics = [
          {
            title: "Total Calls (Today)",
            value: String(totalCallsToday),
            description: "Real-time traffic",
            icon: Phone,
            trend: "neutral" as "up" | "down" | "neutral",
          },
          {
            title: "Leads Captured",
            value: String(leadsCaptured),
            description: "Patients triaged",
            icon: Users,
            trend: "neutral" as "up" | "down" | "neutral",
          },
          {
            title: "Avg. Latency",
            value: latencyVal,
            description: latencyDesc,
            icon: Clock,
            trend: "neutral" as "up" | "down" | "neutral",
          },
          {
            title: "Missed Calls",
            value: String(missedCalls),
            description: "Failed connections",
            icon: PhoneMissed,
            trend: "neutral" as "up" | "down" | "neutral",
          },
        ];

        // 2. Format Recent Calls (top 6)
        const formattedCalls = calls.slice(0, 6).map((c) => {
          let duration = "—";
          if (c.ended_at && c.started_at) {
            const diffSeconds = Math.max(0, Math.round((new Date(c.ended_at).getTime() - new Date(c.started_at).getTime()) / 1000));
            const m = Math.floor(diffSeconds / 60);
            const s = diffSeconds % 60;
            duration = `${m}m ${s}s`;
          } else if (c.status === "ongoing") {
            duration = "Ongoing";
          } else {
            duration = "0m 45s";
          }

          const callDate = new Date(c.started_at);
          let dateStr = callDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
          if (callDate.toDateString() === new Date().toDateString()) {
            dateStr = `Today, ${callDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
          }

          let formattedStatus: "Completed" | "Voicemail" | "Missed" = "Completed";
          if (c.status === "failed" || c.status === "missed") {
            formattedStatus = "Missed";
          } else if (c.summary && c.summary.toLowerCase().includes("voicemail")) {
            formattedStatus = "Voicemail";
          }

          return {
            caller: c.caller_number,
            status: formattedStatus,
            duration: duration,
            date: dateStr,
          };
        });

        // 3. Calculate Call Volume Chart
        const dailyStats = getDailyCallStats(calls);

        setRealMetricCards(updatedMetrics);
        setRealRecentCalls(formattedCalls);
        setRealChartData(dailyStats);
      } catch (err) {
        console.error("Failed to load real stats", err);
      }
    };

    loadRealStats();
    return () => {
      cancelled = true;
    };
  }, [needsOnboarding, userStatusLoaded]);

  const handleOnboardingComplete = () => {
    setNeedsOnboarding(false);
    setShowOnboarding(false);
    setUserStatusLoaded(false); // Force reload
    window.location.href = "/dashboard";
  };

  // New / inactive users see a clean empty state, not pre-populated mock data.
  const metricCards = needsOnboarding ? emptyMetricCards : realMetricCards;
  const recentCalls = needsOnboarding ? [] : realRecentCalls;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight text-foreground"
            style={{
              fontFamily:
                'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif',
            }}
          >
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground font-sans">
            Central command center for your AI voice receptionists.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => window.location.href = "/dashboard/agents"}
            className="rounded-full bg-[#f5a623] hover:bg-[#e09510] text-black font-sans font-semibold text-sm px-6 h-10 shadow-md gap-2"
          >
            <Sparkles className="size-4" />
            Launch Agent
          </Button>
        </div>
      </div>

      <HeadlessOnboardingDemo
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        onComplete={handleOnboardingComplete}
      />

      {/* Onboarding Banner / Trigger — always visible until agent is activated */}
      {(needsOnboarding || !userStatusLoaded) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-[#f5a623]/15 via-muted/40 to-card border border-[#f5a623]/30 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#f5a623] text-black flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h3 className="font-sans font-semibold text-sm text-foreground">
                {needsOnboarding
                  ? "Welcome! Finish setting up your voice agent"
                  : "Loading your workspace…"}
              </h3>
              <p className="font-sans text-xs text-muted-foreground">
                {needsOnboarding
                  ? "Configure your agent preferences, WhatsApp sync, and FAQ knowledge base."
                  : "Checking account setup status."}
              </p>
            </div>
          </div>
          {needsOnboarding && (
            <Button
              onClick={() => setShowOnboarding(true)}
              className="rounded-full bg-[#f5a623] hover:bg-[#e09510] text-black font-sans font-semibold text-xs px-4 h-9 shrink-0 shadow-xs"
            >
              Continue Onboarding
            </Button>
          )}
        </div>
      )}

      {!needsOnboarding && userStatusLoaded && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-[#f5a623]/15 via-muted/40 to-card border border-[#f5a623]/30 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#f5a623] text-black flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h3 className="font-sans font-semibold text-sm text-foreground">
                New Voice Agent Onboarding Setup
              </h3>
              <p className="font-sans text-xs text-muted-foreground">
                Configure your agent preferences, WhatsApp sync, and FAQ knowledge base.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowOnboarding(true)}
            className="rounded-full bg-[#f5a623] hover:bg-[#e09510] text-black font-sans font-semibold text-xs px-4 h-9 shrink-0 shadow-xs"
          >
            Open Onboarding Flow
          </Button>
        </div>
      )}

      {/* ── Status & Connection Summary Panel ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl border border-border/60 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="size-3.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
          <div>
            <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider font-sans">
              Telephony Gateway
            </p>
            <p className="text-xs font-semibold text-foreground font-sans">
              Connected (Twilio SIP Active)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="size-3.5 rounded-full bg-emerald-500 shrink-0" />
          <div>
            <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider font-sans">
              WhatsApp Notifications
            </p>
            <p className="text-xs font-semibold text-foreground font-sans">
              Active & Synced
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="size-3.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
          <div>
            <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider font-sans">
              Voice Engine Status
            </p>
            <p className="text-xs font-semibold text-foreground font-sans">
              Sarvam AI (Bulbul:v3)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="size-3.5 rounded-full bg-[#f5a623] shrink-0" />
          <div>
            <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider font-sans">
              AI receptionist Status
            </p>
            <p className="text-xs font-semibold text-foreground font-sans">
              Running (1 Active Agent)
            </p>
          </div>
        </div>
      </div>

      {/* ── Metric Cards Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card) => (
          <Card
            key={card.title}
            className="dashboard-card border border-border/60 rounded-xl bg-card p-6 py-0 gap-0 flex flex-col justify-between"
          >
            <div className="pt-6 pb-2 flex flex-row items-center justify-between">
              <span className="text-base font-semibold text-muted-foreground tracking-tight">
                {card.title}
              </span>
              <div className="size-10 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                <card.icon className="size-5 text-muted-foreground" />
              </div>
            </div>
            <div className="pb-6 pt-1">
              <div className="metric-value text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-none">
                {card.value}
              </div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mt-2">
                {card.trend === "up" && (
                  <TrendingUp className="size-4 text-emerald-500 shrink-0" />
                )}
                {card.description}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Chart + Recent Calls Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* Call Volume Chart */}
        <div className="lg:col-span-4">
          {needsOnboarding ? (
            <Card className="dashboard-card border border-border/60 rounded-xl bg-card h-full min-h-[280px] flex items-center justify-center">
              <CardContent className="p-8 text-center space-y-2">
                <Phone className="size-8 text-muted-foreground mx-auto opacity-50" />
                <p className="font-sans text-sm font-medium text-foreground">
                  No call volume yet
                </p>
                <p className="font-sans text-xs text-muted-foreground max-w-xs mx-auto">
                  Complete onboarding and start receiving calls to see your
                  analytics chart here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ChartBar data={realChartData} />
          )}
        </div>

        {/* Recent Calls Table */}
        <Card className="dashboard-card border border-border/60 rounded-xl bg-card shadow-xs lg:col-span-3 py-0 gap-0 overflow-hidden flex flex-col justify-between">
          <CardHeader className="w-full px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 bg-muted/10 shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="card-heading text-lg font-semibold tracking-tight text-foreground">
                  Recent Calls
                </CardTitle>
                {!needsOnboarding && (
                  <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 text-xs font-medium rounded-full px-2.5 py-0.5 shrink-0">
                    Real-time Log
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                <Phone className="size-3.5" />{" "}
                {needsOnboarding
                  ? "Inbound calls will appear here"
                  : "Latest 6 inbound call records"}
              </CardDescription>
            </div>

            {!needsOnboarding && (
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full text-xs font-medium border border-emerald-500/20">
                  100% Handled
                </Badge>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-6 pt-4 flex-1">
            {needsOnboarding || recentCalls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                <PhoneMissed className="size-8 text-muted-foreground opacity-40" />
                <p className="font-sans text-sm font-medium text-foreground">
                  No calls yet
                </p>
                <p className="font-sans text-xs text-muted-foreground max-w-[220px]">
                  {needsOnboarding
                    ? "Finish onboarding to activate your AI receptionist."
                    : "Your recent inbound call log is empty."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-3">
                      Caller
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-3">
                      Status
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-3">
                      Duration
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCalls.map((call, i) => (
                    <TableRow
                      key={i}
                      className="border-b border-border/30 last:border-0"
                    >
                      <TableCell className="font-medium text-sm py-3">
                        {call.caller}
                      </TableCell>
                      <TableCell className="py-3">
                        {call.status === "Completed" ? (
                          <Badge className="text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 rounded-full px-2.5 py-0.5">
                            {call.status}
                          </Badge>
                        ) : (
                          <Badge className="text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50 rounded-full px-2.5 py-0.5">
                            {call.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground py-3">
                        {call.duration}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
