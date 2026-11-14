import { describe, expect, it } from "vitest";
import { extractBashScript, SCRIPT_FILENAME } from "@/lib/bash-script";
import { parseChatRequest } from "@/lib/chat-request";

describe("downloadable Kali scripts", () => {
  it("exports only the standalone script, not its launch command", () => {
    expect(extractBashScript('```bash\n#!/usr/bin/env bash\nprintf "hello\\n"\n```\n```bash\nbash ./kalicmd-script.sh\n```')).toBe('#!/usr/bin/env bash\nprintf "hello\\n"\n');
    expect(SCRIPT_FILENAME).toBe("kalicmd-script.sh");
  });
  it("does not export incomplete or ordinary command blocks", () => {
    expect(extractBashScript("```bash\n#!/usr/bin/env bash\necho hello")).toBeNull();
    expect(extractBashScript("```bash\necho hello\n```")).toBeNull();
  });
  it("normalizes Windows line endings for Kali", () => {
    expect(extractBashScript("```sh\r\n#!/bin/bash\r\necho hello\r\n```")).toBe("#!/bin/bash\necho hello\n");
  });
  it("accepts script mode and defaults existing requests to command mode", () => {
    const messages = [{ role: "user", content: "hello" }];
    expect(parseChatRequest({ messages, mode: "script" })?.mode).toBe("script");
    expect(parseChatRequest({ messages })?.mode).toBe("command");
    expect(parseChatRequest({ messages, mode: "execute" })).toBeNull();
  });
});