// Date/time formatting helpers. Pure functions so they are unit-testable and
// safe to call from server components. Kickoff times are always shown in
// Europe/Copenhagen (CLAUDE.md), regardless of the server's timezone.

const kickoffFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Copenhagen",
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** Format a kickoff time, e.g. "Fri, 19 Jun, 20:00", in Europe/Copenhagen. */
export function formatKickoff(date: Date): string {
  return kickoffFormatter.format(date);
}

const chartTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Copenhagen",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Compact label for chart axis ticks and tooltips, e.g. "19 Jun, 20:00", in
 * Europe/Copenhagen. Accepts a Date or epoch-ms (chart points carry ms).
 */
export function formatChartTime(value: number | Date): string {
  return chartTimeFormatter.format(value);
}

/**
 * Format a 0–1 ratio as a percentage, e.g. `0.495 -> "49.5%"`. Used for implied
 * probabilities, no-vig probabilities, and overround.
 */
export function formatPercent(value: number, fractionDigits = 1): string {
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

/**
 * Like {@link formatPercent} but always signed, e.g. `0.042 -> "+4.2%"`,
 * `-0.01 -> "-1.0%"`. Used for edge badges where the sign carries the meaning.
 */
export function formatSignedPercent(value: number, fractionDigits = 1): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(fractionDigits)}%`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Human-readable "time ago" for the last-snapshot indicator, e.g.
 * "just now", "12 minutes ago", "3 hours ago", "2 days ago". `now` is
 * injectable so the output is deterministic in tests. A future date (clock
 * skew) is clamped to "just now".
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diff = now.getTime() - date.getTime();
  if (diff < MINUTE) return "just now";

  if (diff < HOUR) {
    const minutes = Math.floor(diff / MINUTE);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }
  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
  const days = Math.floor(diff / DAY);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}
