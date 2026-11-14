export type GenerationMode = "command" | "script";
type ChatMsg = { role: "user" | "assistant"; content: string };

export function parseChatRequest(body: unknown): { messages: ChatMsg[]; mode: GenerationMode } | null {
  if (!body || typeof body !== "object") return null;
  const { messages, mode = "command" } = body as Record<string, unknown>;
  if (!Array.isArray(messages) || (mode !== "command" && mode !== "script")) return null;
  const out: ChatMsg[] = [];
  for (const message of messages.slice(-30)) {
    if (!message || typeof message !== "object") return null;
    const { role, content } = message as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string" || content.length > 8000) return null;
    out.push({ role, content });
  }
  return out.length && out.at(-1)?.role === "user" ? { messages: out, mode } : null;
}