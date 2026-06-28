"use client";

import { useState } from "react";
import {
  Phone,
  Users,
  Clock,
  PhoneMissed,
  TrendingUp,
  Sparkles,
} from "lucide-react";
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

const metricCards = [
  {
    title: "Total Calls (Today)",
    value: "128",
    description: "+14% from yesterday",
    icon: Phone,
    trend: "up",
  },
  {
    title: "Leads Captured",
    value: "43",
    description: "+8 new today",
    icon: Users,
    trend: "up",
  },
  {
    title: "Avg. Latency",
    value: "2.2s",
    description: "Within optimal range",
    icon: Clock,
    trend: "neutral",
  },
  {
    title: "Missed Calls",
    value: "0",
    description: "All calls handled",
    icon: PhoneMissed,
    trend: "up",
  },
];


const recentCalls = [
  { caller: "+91 98765 43210", status: "Completed", duration: "3m 42s" },
  { caller: "+91 87654 32109", status: "Voicemail", duration: "0m 32s" },
  { caller: "+91 76543 21098", status: "Completed", duration: "5m 18s" },
  { caller: "+91 65432 10987", status: "Completed", duration: "2m 05s" },
  { caller: "+91 54321 09876", status: "Voicemail", duration: "0m 18s" },
  { caller: "+91 43210 98765", status: "Completed", duration: "7m 44s" },
];

export default function DashboardPage() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <HeadlessOnboardingDemo open={showOnboarding} onOpenChange={setShowOnboarding} />

      {/* Onboarding Banner / Trigger */}
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
              <div className="metric-value text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-none">{card.value}</div>
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
          <ChartBar />
        </div>

        {/* Recent Calls Table */}
        <Card className="dashboard-card border border-border/60 rounded-xl bg-card shadow-xs lg:col-span-3 py-0 gap-0 overflow-hidden flex flex-col justify-between">
          <CardHeader className="w-full px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 bg-muted/10 shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="card-heading text-lg font-semibold tracking-tight text-foreground">
                  Recent Calls
                </CardTitle>
                <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 text-xs font-medium rounded-full px-2.5 py-0.5 shrink-0">
                  Real-time Log
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                <Phone className="size-3.5" /> Latest 6 inbound call records
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full text-xs font-medium border border-emerald-500/20">
                100% Handled
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-4 flex-1">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
