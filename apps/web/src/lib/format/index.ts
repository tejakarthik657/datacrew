/**
 * Number, currency, percentage, and date formatters for DataCrew.
 * All currency in Indian Rupees (₹) with Indian digit grouping.
 */

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const INR_COMPACT = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const NUM_IN = new Intl.NumberFormat("en-IN");

const PCT = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/** Format rupees: ₹12,34,567 */
export function formatRupee(amount: number): string {
  return INR.format(amount);
}

/** Format rupees compact: ₹12.3L */
export function formatRupeeCompact(amount: number): string {
  return INR_COMPACT.format(amount);
}

/** Format number with Indian grouping: 12,34,567 */
export function formatNumber(n: number): string {
  return NUM_IN.format(n);
}

/** Format percent: 0..1 → "96.4%" */
export function formatPercent(n: number): string {
  return PCT.format(n);
}

/** Format a health score 0..100 */
export function formatScore(n: number | null | undefined): string {
  if (n == null) return "–";
  return Math.round(n).toString();
}

/** Format date as DD-MMM-YYYY (e.g. 05-Oct-2026) */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Format ISO date-time to relative "2 hours ago" */
export function formatRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}
