import { describe, expect, it } from "vitest";
import { shouldFallback } from "@/lib/ai-text-stream.server";

describe("GPT fallback rule", () => {
  it("does not fall back when credits run out (same account)", () => expect(shouldFallback(402)).toBe(false));
  it("falls back when Lovable AI is rate limited", () => expect(shouldFallback(429)).toBe(true));
  it("falls back when Lovable AI is down", () => expect(shouldFallback(503)).toBe(true));
  it("does not fall back on a bad request", () => expect(shouldFallback(400)).toBe(false));
});
