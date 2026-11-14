import { createFileRoute } from "@tanstack/react-router";
import { streamAiText } from "@/lib/ai-text-stream.server";
import { buildKaliPrompt } from "@/lib/kali-prompt";
import { parseChatRequest } from "@/lib/chat-request";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const data = parseChatRequest(await request.json().catch(() => null));
        if (!data) return new Response("Neplatný požadavek", { status: 400 });

        return streamAiText({ system: buildKaliPrompt(data.mode, data.tool), messages: data.messages, maxTokens: 2048, signal: request.signal });
      },
    },
  },
});
