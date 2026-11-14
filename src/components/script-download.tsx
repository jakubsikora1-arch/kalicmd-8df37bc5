import { Copy, Download, FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadScript, SCRIPT_FILENAME } from "@/lib/bash-script";

export function ScriptDownload({ script, onCopy }: { script: string; onCopy: (text: string) => void }) {
  const command = `chmod +x ./${SCRIPT_FILENAME}\n./${SCRIPT_FILENAME}`;
  return (
    <div className="script-download">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-xs"><FileCode2 size={16} className="shrink-0 text-primary" />{SCRIPT_FILENAME}</span>
        <Button size="sm" onClick={() => downloadScript(script)}><Download />Stáhnout .sh</Button>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <code className="min-w-0 whitespace-pre-wrap break-all text-xs text-primary">{command}</code>
        <Button variant="ghost" size="icon-sm" title="Kopírovat spuštění" aria-label="Kopírovat spuštění" onClick={() => onCopy(command)}><Copy /></Button>
      </div>
      <p className="text-xs text-muted-foreground">V terminálu otevři složku se staženým souborem. Před spuštěním ověř obsah; případné argumenty najdeš v odpovědi.</p>
    </div>
  );
}