import { describe, it, expect } from "vitest";
import { formatRupee, formatPercent, formatScore, formatNumber } from "@/lib/format";

describe("Format helpers", () => {
  it("formats score correctly", () => {
    expect(formatScore(92.4)).toBe("92");
    expect(formatScore(null)).toBe("–");
  });

  it("formats percent with one decimal place", () => {
    expect(formatPercent(0.964)).toBe("96.4%");
  });

  it("formats number with grouping", () => {
    expect(formatNumber(1234567)).toContain("12");
  });

  it("formats Indian rupees with currency symbol", () => {
    const formatted = formatRupee(50000);
    expect(formatted).toMatch(/₹|Rs/);
  });
});
