import { describe, expect, it } from "vitest";
import { findTool, scopedInput, toolCatalog, toolPrefix } from "@/lib/tool-catalog";
import { parseChatRequest } from "@/lib/chat-request";
import { buildKaliPrompt } from "@/lib/kali-prompt";

describe("tool workspaces", () => {
  it("contains exactly the requested ten tools in ranked order", () => {
    expect(toolCatalog.map(tool => tool.id)).toEqual(["nmap", "wireshark", "metasploit", "burp", "aircrack-ng", "john", "hashcat", "sqlmap", "gobuster", "nikto"]);
    expect(toolCatalog.map(tool => tool.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
  it.each(toolCatalog)("provides exactly five commands or functions for $name", tool => {
    expect(tool.commands).toHaveLength(5);
  });
  it("distinguishes Burp shell commands from GUI functions", () => {
    expect(findTool("burp")?.commands.map(item => item.type)).toEqual(["shell", "shell", "shell", "gui", "gui"]);
    expect(findTool("burp")?.exampleType).toBe("gui");
  });
  it("distinguishes Metasploit shell startup from console commands", () => {
    expect(findTool("metasploit")?.commands.map(item => item.type)).toEqual(["shell", "console", "console", "console", "console"]);
  });
  it("uses Kali documented Burp version invocation", () => {
    expect(findTool("burp")?.commands[2]?.command).toBe("burpsuite --version");
  });
  it("uses the supported Gobuster DNS domain option", () => {
    expect(findTool("gobuster")?.commands[3]?.command).toBe("gobuster dns --domain example.test -w subdomains.txt");
  });
  it("supplies administrator permissions for monitor capture and process checks", () => {
    expect(findTool("aircrack-ng")?.commands[2]?.command).toBe("sudo airmon-ng check");
    expect(findTool("aircrack-ng")?.commands[3]?.command).toBe("sudo airodump-ng wlan0mon");
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