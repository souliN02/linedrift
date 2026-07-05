"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { formatChartTime } from "@/lib/format";
import type { ChartSeries, Outcome } from "@/lib/match-history";

export type OddsChartProps = {
  series: Record<Outcome, ChartSeries>;
  homeTeam: string;
  awayTeam: string;
  /** Kickoff (epoch ms). When set, a reference line separates pre-kickoff
   * movement from in-play snapshots on finished matches. */
  kickoffMs?: number;
};

// The theme's --chart-* tokens are all grayscale, which is unreadable with
// several overlapping lines, so the bookmaker lines use distinct hues instead.
const LINE_COLORS = [
  "#60a5fa", // blue
  "#f87171", // red
  "#34d399", // emerald
  "#fbbf24", // amber
  "#a78bfa", // violet
  "#f472b6", // pink
  "#22d3ee", // cyan
  "#a3e635", // lime
];

export function OddsChart({
  series,
  homeTeam,
  awayTeam,
  kickoffMs,
}: OddsChartProps) {
  const [outcome, setOutcome] = useState<Outcome>("home");

  const tabs: { value: Outcome; label: string }[] = [
    { value: "home", label: homeTeam },
    { value: "draw", label: "Draw" },
    { value: "away", label: awayTeam },
  ];

  const active = series[outcome];

  return (
    <section aria-label="Odds movement">
      <div
        role="group"
        aria-label="Outcome"
        className="mb-3 flex flex-wrap gap-1.5"
      >
        {tabs.map((tab) => {
          const selected = tab.value === outcome;
          return (
            <Button
              key={tab.value}
              size="sm"
              variant={selected ? "default" : "outline"}
              aria-pressed={selected}
              onClick={() => setOutcome(tab.value)}
            >
              {tab.label}
            </Button>
          );
        })}
      </div>

      <div className="h-72 w-full">
        {active.points.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-border bg-card text-sm text-muted-foreground">
            No odds recorded for this outcome yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={active.points}
              margin={{ top: 8, right: 12, bottom: 4, left: -8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(t: number) => formatChartTime(t)}
                stroke="var(--muted-foreground)"
                tick={{ fontSize: 11 }}
                minTickGap={32}
              />
              <YAxis
                domain={["auto", "auto"]}
                tickFormatter={(v: number) => v.toFixed(2)}
                stroke="var(--muted-foreground)"
                tick={{ fontSize: 11 }}
                width={44}
              />
              <Tooltip
                labelFormatter={(t) => formatChartTime(Number(t))}
                formatter={(value) => Number(value).toFixed(2)}
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  fontSize: "0.75rem",
                  color: "var(--popover-foreground)",
                }}
                labelStyle={{ color: "var(--muted-foreground)" }}
              />
              {kickoffMs !== undefined && (
                <ReferenceLine
                  x={kickoffMs}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  ifOverflow="extendDomain"
                  label={{
                    value: "Kickoff",
                    position: "insideTopRight",
                    fill: "var(--muted-foreground)",
                    fontSize: 11,
                  }}
                />
              )}
              {active.bookmakers.map((bookmaker, i) => (
                <Line
                  key={bookmaker.key}
                  type="monotone"
                  dataKey={bookmaker.key}
                  name={bookmaker.title}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {active.bookmakers.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {active.bookmakers.map((bookmaker, i) => (
            <li
              key={bookmaker.key}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  backgroundColor: LINE_COLORS[i % LINE_COLORS.length],
                }}
              />
              {bookmaker.title}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
