import { describe, expect, it } from "vitest";
import { shouldFallback } from "@/lib/ai-text-stream.server";

describe("ChatGPT fallback rule", () => {
  it("falls back when Lovable AI credits run out", () => expect(shouldFallback(402)).toBe(true));
  it("falls back when Lovable AI is rate limited", () => expect(shouldFallback(429)).toBe(true));
  it("falls back when Lovable AI is down", () => expect(shouldFallback(503)).toBe(true));
  it("does not fall back on a bad request", () => expect(shouldFallback(400)).toBe(false));
});
