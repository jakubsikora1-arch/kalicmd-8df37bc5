import { describe, expect, it } from "vitest";
import { findTool, scopedInput, toolCatalog, toolPrefix } from "@/lib/tool-catalog";
import { parseChatRequest } from "@/lib/chat-request";
import { buildKaliPrompt } from "@/lib/kali-prompt";

describe("tool workspaces", () => {
  it.each(["nmap", "hashcat", "wireshark", "metasploit"])("provides exactly five commands for %s", id => {
    expect(findTool(id)?.commands).toHaveLength(5);
  });
  it("keeps the general composer empty", () => expect(toolPrefix()).toBe(""));
  it("adds and preserves the selected tool marker", () => {
    const tool = findTool("nmap");
    expect(scopedInput("Zjisti porty", tool)).toBe("[Nmap] Zjisti porty");
    expect(scopedInput("[hashcat] Zjisti porty", tool)).toBe("[Nmap] Zjisti porty");
    expect(scopedInput("[Nmap] Zjisti porty", tool)).toBe("[Nmap] Zjisti porty");
  });
  it.each(toolCatalog)("validates and scopes $name requests", tool => {
    expect(parseChatRequest({ messages: [{ role: "user", content: "test" }], tool: tool.id })?.tool).toBe(tool.id);
    expect(buildKaliPrompt("command", tool.id)).toContain(`Generuj Bash pouze pro ${tool.name}`);
  });
  it("rejects unsupported tools", () => expect(parseChatRequest({ messages: [{ role: "user", content: "test" }], tool: "unknown" })).toBeNull());
  it("selects a tool for a general goal", () => expect(buildKaliPrompt("command")).toContain("podle cíle vyber vhodný nástroj"));
  it("preserves standalone script rules in a tool workspace", () => expect(buildKaliPrompt("script", "nmap")).toContain("#!/usr/bin/env bash"));
});