// Server-only: streams model text, falling back to the owner's OpenAI (ChatGPT API) key
// when Lovable AI is unavailable or out of credits. Keys never reach the browser.
import { streamMessage, GatewayError } from "@lovable.dev/ai-gateway";

type Msg = { role: "user" | "assistant"; content: string };
type Opts = { system: string; messages: Msg[]; maxTokens: number; signal: AbortSignal };

const enc = new TextEncoder();
const headers = (provider: string) => ({ "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-ai-provider": provider });

export function shouldFallback(status: number): boolean {
  return status === 402 || status === 429 || status >= 500;
}

export async function streamAiText(opts: Opts): Promise<Response> {
  let status = 500;
  try {
    const stream = await streamMessage(
      { model: "anthropic/claude-sonnet-5", max_tokens: opts.maxTokens, system: opts.system, messages: opts.messages },
      { signal: opts.signal },
    );
    const body = new ReadableStream<Uint8Array>({
      async start(c) {
        try {
          for await (const ev of stream) {
            const e = ev as { type?: string; delta?: { type?: string; text?: string } };
            if (e.type === "content_block_delta" && e.delta?.type === "text_delta" && e.delta.text) c.enqueue(enc.encode(e.delta.text));
          }
        } catch (err) {
          console.error("AI stream failed", err);
          c.enqueue(enc.encode("\n\n_[Odpověď byla přerušena.]_"));
        }
        c.close();
      },
    });
    return new Response(body, { headers: headers("lovable") });
  } catch (err) {
    console.error("Lovable AI request failed", err);
    status = err instanceof GatewayError && err.httpStatus ? err.httpStatus : 500;
  }

  const key = process.env["OPENAI_API_KEY"];
  if (key && shouldFallback(status)) {
    const fallback = await streamOpenAi(key, opts).catch(err => { console.error("OpenAI fallback failed", err); return null; });
    if (fallback) return fallback;
  }
  const msg = status === 429 ? "Příliš mnoho požadavků, zkuste to za chvíli." : status === 402 ? "Došly AI kredity." : "AI teď neodpovídá.";
  return new Response(msg, { status });
}

async function streamOpenAi(key: string, opts: Opts): Promise<Response | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: opts.signal,
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env["OPENAI_MODEL"] || "gpt-4o",
      stream: true,
      max_tokens: opts.maxTokens,
      messages: [{ role: "system", content: opts.system }, ...opts.messages],
    }),
  });
  if (!res.ok || !res.body) { console.error("OpenAI fallback status", res.status); return null; }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  const body = new ReadableStream<Uint8Array>({
    async start(c) {
      let buf = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            const data = line.startsWith("data:") ? line.slice(5).trim() : "";
            if (!data || data === "[DONE]") continue;
            try {
              const text = (JSON.parse(data) as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content;
              if (text) c.enqueue(enc.encode(text));
            } catch { /* ignore partial line */ }
          }
        }
      } catch (err) {
        console.error("OpenAI stream failed", err);
        c.enqueue(enc.encode("\n\n_[Odpověď byla přerušena.]_"));
      }
      c.close();
    },
  });
  return new Response(body, { headers: headers("openai") });
}
