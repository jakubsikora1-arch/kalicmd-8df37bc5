import { describe, expect, it } from "vitest";
import { KALI_SYSTEM_PROMPT } from "@/lib/kali-prompt";

describe("Kali assistant rules", () => {
  it("answers in Czech", () => expect(KALI_SYSTEM_PROMPT).toContain("Odpovídej česky"));
  it("reminds about authorized testing", () => expect(KALI_SYSTEM_PROMPT).toContain("oprávnění"));
});

import { parseChatRequest } from "@/lib/chat-request";
describe("chat role validation", () => {
  const u = (content: string) => ({ role: "user", content });
  const a = (content: string) => ({ role: "assistant", content });
  it("accepts alternating history", () => expect(parseChatRequest({ messages: [u("1"), a("2"), u("3")] })).not.toBeNull());
  it("rejects leading assistant", () => expect(parseChatRequest({ messages: [a("x"), u("y")] })?.messages[0]?.role).toBe("user"));
  it("rejects consecutive assistant turns", () => expect(parseChatRequest({ messages: [u("1"), a("2"), a("3"), u("4"), u("5")] })).toBeNull());
});
