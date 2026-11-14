import { createFileRoute } from "@tanstack/react-router";
import { streamMessage, GatewayError } from "@lovable.dev/ai-gateway";
import { KALI_SYSTEM_PROMPT } from "@/lib/kali-prompt";

type ChatMsg = { role: "user" | "assistant"; content: string };

function parseMessages(body: unknown): ChatMsg[] | null {
  if (!body || typeof body !== "object" || !Array.isArray((body as { messages?: unknown }).messages)) return null;
  const raw = (body as { messages: unknown[] }).messages.slice(-30);
  const out: ChatMsg[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") return null;
    const { role, content } = m as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    if (content.length > 8000) return null;
    out.push({ role, content });
  }
  return out.length && out.at(-1)?.role === "user" ? out : null;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const messages = parseMessages(await request.json().catch(() => null));
        if (!messages) return new Response("Neplatný požadavek", { status: 400 });

        let stream;
        try {
          stream = await streamMessage(
            {
              model: "anthropic/claude-sonnet-5",
              max_tokens: 2048,
              system: KALI_SYSTEM_PROMPT,
              messages,
            },
            { signal: request.signal },
          );
        } catch (err) {
          console.error("AI request failed", err);
          const status = err instanceof GatewayError && err.httpStatus ? err.httpStatus : 500;
          const msg =
            status === 429 ? "Příliš mnoho požadavků, zkuste to za chvíli." :
            status === 402 ? "Došly AI kredity." : "AI teď neodpovídá.";
          return new Response(msg, { status });
        }

        const encoder = new TextEncoder();
        const body = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              for await (const ev of stream) {
                const e = ev as { type?: string; delta?: { type?: string; text?: string } };
                if (e.type === "content_block_delta" && e.delta?.type === "text_delta" && e.delta.text) {
                  controller.enqueue(encoder.encode(e.delta.text));
                }
              }
            } catch (err) {
              console.error("AI stream failed", err);
              controller.enqueue(encoder.encode("\n\n_[Odpověď byla přerušena.]_"));
            }
            controller.close();
          },
        });
        return new Response(body, {
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
        });
      },
    },
  },
});
