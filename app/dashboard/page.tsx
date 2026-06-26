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
    color: "var(--chart-1)",
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
    <div className="flex flex-col gap-4 py-4">
      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                {card.trend === "up" && (
                  <TrendingUp className="size-3 text-emerald-500" />
                )}
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts + Table Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Call Volume Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Call Volume</CardTitle>
            <CardDescription>Last 7 days of inbound calls</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart accessibilityLayer data={callVolumeData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dashed" />}
                />
                <Bar dataKey="calls" fill="var(--color-calls)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Recent Calls Table */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Calls</CardTitle>
            <CardDescription>Latest 6 inbound calls</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caller</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCalls.map((call, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{call.caller}</TableCell>
                    <TableCell>
                      <Badge
                        variant={call.status === "Completed" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {call.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
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
