import { describe, expect, it } from "vitest";
import { KALI_SYSTEM_PROMPT } from "@/lib/kali-prompt";

describe("Kali assistant rules", () => {
  it("answers in Czech", () => expect(KALI_SYSTEM_PROMPT).toContain("Odpovídej česky"));
  it("reminds about authorized testing", () => expect(KALI_SYSTEM_PROMPT).toContain("oprávnění"));
});
