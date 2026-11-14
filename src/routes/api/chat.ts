import { createFileRoute } from "@tanstack/react-router";
import { streamMessage, GatewayError } from "@lovable.dev/ai-gateway";
import { KALI_SCRIPT_PROMPT, KALI_SYSTEM_PROMPT } from "@/lib/kali-prompt";
import { parseChatRequest } from "@/lib/chat-request";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const data = parseChatRequest(await request.json().catch(() => null));
        if (!data) return new Response("Neplatný požadavek", { status: 400 });

        let stream;
        try {
          stream = await streamMessage(
            {
              model: "anthropic/claude-sonnet-5",
              max_tokens: 2048,
              system: data.mode === "script" ? KALI_SCRIPT_PROMPT : KALI_SYSTEM_PROMPT,
              messages: data.messages,
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
