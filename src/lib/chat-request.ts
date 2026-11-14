import { findTool, type ToolId } from "./tool-catalog";

export type GenerationMode = "command" | "script";
type ChatMsg = { role: "user" | "assistant"; content: string };

export function parseChatRequest(body: unknown): { messages: ChatMsg[]; mode: GenerationMode; tool?: ToolId } | null {
  if (!body || typeof body !== "object") return null;
  const { messages, mode = "command", tool } = body as Record<string, unknown>;
  const selected = findTool(tool);
  if (tool !== undefined && !selected) return null;
  if (!Array.isArray(messages) || (mode !== "command" && mode !== "script")) return null;
  const out: ChatMsg[] = [];
  const recent = messages.slice(-30);
  if (recent.length % 2 === 0) recent.shift(); // history must start with a user turn
  for (const [index, message] of recent.entries()) {
    if (!message || typeof message !== "object") return null;
    const { role, content } = message as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string" || content.length > 8000) return null;
    // Roles must strictly alternate user/assistant; callers cannot inject consecutive or leading assistant turns.
    if (role !== (index % 2 === 0 ? "user" : "assistant")) return null;
    out.push({ role, content });
  }
  return out.length && out.at(-1)?.role === "user" ? { messages: out, mode, ...(selected ? { tool: selected.id } : {}) } : null;
}