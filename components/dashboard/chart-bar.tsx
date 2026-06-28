"use client";

import React, { useState } from "react";
import { TrendingUp, PhoneCall, Calendar } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";

export const chartData = [
  { day: "Mon", calls: 85, peakTime: "10:00 AM" },
  { day: "Tue", calls: 112, peakTime: "02:30 PM" },
  { day: "Wed", calls: 98, peakTime: "11:15 AM" },
  { day: "Thu", calls: 138, peakTime: "04:00 PM" },
  { day: "Fri", calls: 130, peakTime: "03:45 PM" },
  { day: "Sat", calls: 72, peakTime: "01:00 PM" },
  { day: "Sun", calls: 54, peakTime: "12:30 PM" },
];

const chartConfig = {
  calls: {
    label: "Inbound Calls",
    color: "#f5a623",
  },
} satisfies ChartConfig;

export function ChartBar() {
  const totalCalls = chartData.reduce((acc, curr) => acc + curr.calls, 0);
  const avgCalls = Math.round(totalCalls / chartData.length);
  const peakDay = [...chartData].sort((a, b) => b.calls - a.calls)[0];

  return (
    <Card className="dashboard-card border border-border/60 rounded-xl bg-card shadow-xs transition-all duration-200 py-0 gap-0 overflow-hidden">
      <CardHeader className="w-full px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 bg-muted/10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="card-heading text-lg font-semibold tracking-tight text-foreground">
              Call Volume Overview
            </CardTitle>
            <Badge className="bg-[#f5a623]/15 text-[#b87508] dark:text-[#f5a623] border border-[#f5a623]/30 text-xs font-medium rounded-full px-2.5 py-0.5 shrink-0">
              Live Metrics
            </Badge>
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <Calendar className="size-3.5" /> Last 7 days of inbound calls
          </CardDescription>
        </div>

        <div className="flex items-center gap-3 self-stretch sm:self-center justify-between sm:justify-end shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-muted-foreground">Total Inbound</div>
            <div className="text-base font-semibold font-mono text-foreground">{totalCalls} calls</div>
          </div>
          <div className="h-8 w-px bg-border/50 hidden sm:block" />
          <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full text-xs font-medium border border-emerald-500/20">
            <TrendingUp className="size-3.5" />
            <span>+18.4% vs last week</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-6">
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
          >
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f5a623" stopOpacity={1} />
                <stop offset="100%" stopColor="#e09510" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="currentColor" className="stroke-border/40" />
            <XAxis
              dataKey="day"
              tickLine={false}
              tickMargin={12}
              axisLine={false}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            />
            <ChartTooltip
              cursor={{ fill: "rgba(0,0,0,0.03)" }}
              content={
                <ChartTooltipContent
                  indicator="dashed"
                  formatter={(value, name) => (
                    <div className="flex items-center justify-between gap-4 w-full">
                      <div className="flex items-center gap-1.5">
                        <PhoneCall className="size-3.5 text-[#f5a623]" />
                        <span className="text-muted-foreground font-medium">{name}:</span>
                      </div>
                      <span className="font-mono font-semibold text-foreground">{value} calls</span>
                    </div>
                  )}
                />
              }
            />
            <Bar
              dataKey="calls"
              radius={[6, 6, 0, 0]}
              animationDuration={1000}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill="url(#barGradient)"
                  className="transition-all duration-200 cursor-pointer hover:opacity-85"
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        {/* Dynamic Summary Footer */}
        <div className="mt-4 pt-4 border-t border-border/40 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground">Daily Average</span>
            <span className="font-mono font-medium text-foreground">{avgCalls} calls / day</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground">Peak Day</span>
            <span className="font-mono font-medium text-foreground">{peakDay.day} ({peakDay.calls} calls)</span>
          </div>
          <div className="flex flex-col gap-0.5 col-span-2 sm:col-span-1">
            <span className="text-muted-foreground">Highest Activity</span>
            <span className="font-mono font-medium text-foreground">{peakDay.peakTime}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ChartBar;
