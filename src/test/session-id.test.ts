import { beforeEach, describe, expect, it } from "vitest";
import { getSessionId, readStoredSessionId } from "@/lib/session-id";

const KEY = "kalicmd-session-id";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("browser session id", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("creates a valid id on first use and keeps the same one", () => {
    const first = getSessionId();
    expect(first).toMatch(UUID_RE);
    expect(getSessionId()).toBe(first);
    expect(window.localStorage.getItem(KEY)).toBe(first);
  });

  it("replaces a stored value that is not a valid id", () => {
    window.localStorage.setItem(KEY, "not-an-id");
    const next = getSessionId();
    expect(next).toMatch(UUID_RE);
    expect(next).not.toBe("not-an-id");
  });

  it("reports no id when nothing usable is stored", () => {
    expect(readStoredSessionId()).toBeNull();
  });
});
