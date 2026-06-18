import { describe, expect, it } from "vitest";

import { formatKickoff, formatRelativeTime } from "@/lib/format";

describe("formatRelativeTime", () => {
  const now = new Date("2026-06-18T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);

  const cases: [string, Date, string][] = [
    ["same instant", now, "just now"],
    ["30 seconds", ago(30_000), "just now"],
    ["1 minute", ago(60_000), "1 minute ago"],
    ["5 minutes", ago(5 * 60_000), "5 minutes ago"],
    ["59 minutes", ago(59 * 60_000), "59 minutes ago"],
    ["1 hour", ago(60 * 60_000), "1 hour ago"],
    ["3 hours", ago(3 * 60 * 60_000), "3 hours ago"],
    ["1 day", ago(24 * 60 * 60_000), "1 day ago"],
    ["2 days", ago(2 * 24 * 60 * 60_000), "2 days ago"],
    ["future (clock skew)", new Date(now.getTime() + 5_000), "just now"],
  ];

  it.each(cases)("%s -> %s", (_label, date, expected) => {
    expect(formatRelativeTime(date, now)).toBe(expected);
  });
});

describe("formatKickoff", () => {
  it("renders in Europe/Copenhagen (CEST = UTC+2 in June)", () => {
    // 18:00 UTC in June is 20:00 in Copenhagen.
    const result = formatKickoff(new Date("2026-06-19T18:00:00Z"));
    expect(result).toContain("20:00");
    expect(result).toContain("19");
    expect(result).toContain("Jun");
    expect(result).toContain("Fri");
  });

  it("applies the +1h winter offset (CET = UTC+1 in January)", () => {
    // 23:30 UTC in January is 00:30 the next day in Copenhagen.
    const result = formatKickoff(new Date("2026-01-15T23:30:00Z"));
    expect(result).toContain("00:30");
    expect(result).toContain("16");
  });
});
