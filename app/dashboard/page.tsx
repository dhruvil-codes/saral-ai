"use client";

import {
  Phone,
  Users,
  Clock,
  PhoneMissed,
  TrendingUp,
} from "lucide-react";
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
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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

const callVolumeData = [
  { day: "Mon", calls: 89 },
  { day: "Tue", calls: 112 },
  { day: "Wed", calls: 97 },
  { day: "Thu", calls: 134 },
  { day: "Fri", calls: 128 },
  { day: "Sat", calls: 72 },
  { day: "Sun", calls: 54 },
];

const chartConfig = {
  calls: {
    label: "Calls",
    color: "oklch(0.55 0.15 250)",
  },
} satisfies ChartConfig;

const recentCalls = [
  { caller: "+91 98765 43210", status: "Completed", duration: "3m 42s" },
  { caller: "+91 87654 32109", status: "Voicemail", duration: "0m 32s" },
  { caller: "+91 76543 21098", status: "Completed", duration: "5m 18s" },
  { caller: "+91 65432 10987", status: "Completed", duration: "2m 05s" },
  { caller: "+91 54321 09876", status: "Voicemail", duration: "0m 18s" },
  { caller: "+91 43210 98765", status: "Completed", duration: "7m 44s" },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* ── Metric Cards Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card) => (
          <Card
            key={card.title}
            className="dashboard-card border-0 rounded-xl"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-6">
              <CardTitle className="text-sm font-medium text-muted-foreground tracking-wide">
                {card.title}
              </CardTitle>
              <div className="size-8 rounded-lg bg-muted/50 flex items-center justify-center">
                <card.icon className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
              <div className="metric-value">{card.value}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                {card.trend === "up" && (
                  <TrendingUp className="size-3 text-emerald-500" />
                )}
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Chart + Recent Calls Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* Call Volume Chart */}
        <Card className="dashboard-card border-0 rounded-xl lg:col-span-4">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="card-heading">Call Volume</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-0.5">
              Last 7 days of inbound calls
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0">
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <BarChart accessibilityLayer data={callVolumeData}>
                <CartesianGrid vertical={false} stroke="oklch(0.92 0 0)" />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "oklch(0.556 0 0)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 12, fill: "oklch(0.556 0 0)" }}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dashed" />}
                />
                <Bar
                  dataKey="calls"
                  fill="var(--color-calls)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Recent Calls Table */}
        <Card className="dashboard-card border-0 rounded-xl lg:col-span-3">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="card-heading">Recent Calls</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-0.5">
              Latest 6 inbound calls
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0">
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
