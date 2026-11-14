const SESSION_KEY = "kalicmd-session-id";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Identifies this browser so saved scripts stay private to it. No account, no e-mail.
export function getSessionId(): string {
  const stored = readStoredSessionId();
  if (stored) return stored;
  const fresh = crypto.randomUUID();
  storeSessionId(fresh);
  return fresh;
}

export function readStoredSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(SESSION_KEY);
    return stored && UUID_RE.test(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function storeSessionId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SESSION_KEY, id);
  } catch {
    // Private browsing or a blocked storage: the id simply lives only in memory.
  }
}
