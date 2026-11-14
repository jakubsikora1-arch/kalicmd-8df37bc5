import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tool } from "@/lib/tool-catalog";

export function ToolGuide({ tool, copied, onCopy }: { tool: Tool; copied: string | null; onCopy: (id: string, command: string) => void }) {
  return <section className="tool-guide" aria-label={`Přehled ${tool.name}`}>
    <div className="flex items-center gap-3 text-primary"><tool.icon size={28} /><h1 className="font-sans text-3xl font-bold">{tool.name}</h1></div>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">{tool.info}</p>
    <h2 className="mt-6 text-sm font-semibold text-primary">TOP 5 PŘÍKAZŮ</h2>
    <ol className="tool-commands">{tool.commands.map((item, i) => {
      const id = `${tool.id}-${i}`;
      return <li key={id} className="border-b border-border py-4">
        <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">{i + 1}. {item.title}</h3><Button variant="ghost" size="icon-sm" title="Kopírovat příkaz" aria-label={`Kopírovat: ${item.title}`} onClick={() => onCopy(id, item.command)}>{copied === id ? <Check className="text-primary" /> : <Copy />}</Button></div>
        <pre className="overflow-x-auto rounded-md border border-border bg-card p-3 text-xs leading-6 text-primary"><code>{item.command}</code></pre>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.description}</p>
      </li>;
    })}</ol>
  </section>;
}