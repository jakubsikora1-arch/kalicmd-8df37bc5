import { useMemo, useState } from "react";
import { Check, Copy, Download, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { downloadScript } from "@/lib/bash-script";
import { parseScriptTemplate } from "@/lib/script-template-format";
import { renderScriptTemplate, templateWarnings } from "@/lib/script-template-render";
import { readPentestTemplate, renderPentestLab } from "@/lib/pentest-template";
import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  open: boolean;
  title: string;
  script: string;
  onClose: () => void;
  onCopy: (text: string) => Promise<void> | void;
  onDownload?: () => void;
};

export function ScriptTemplateForm({ open, title, script, onClose, onCopy, onDownload }: Props) {
  const parsed = useMemo(() => parseScriptTemplate(script), [script]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const pentest = script.includes("# kalicmd-pentest-scenario:");
  const scenario = pentest ? readPentestTemplate(script) : null;
  const result = pentest
    ? renderPentestLab(script, title, values, authorized)
    : parsed.ok
      ? renderScriptTemplate(parsed.template, values, title)
      : null;
  const warnings = parsed.ok ? templateWarnings(parsed.template) : [];
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Vyplnit šablonu</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        {!parsed.ok ? (
          <ul role="alert" className="error-notice list-disc pl-6 text-xs">
            {parsed.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : (
          <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
            {parsed.template.params.map((p) => {
              const id = `fill-${p.name}`;
              const err = result && !result.ok ? result.errors[p.name] : undefined;
              return (
                <div key={p.name} className="space-y-1">
                  <label htmlFor={id} className="text-sm text-foreground">
                    {p.label}
                    {p.required && " *"}{" "}
                    <code className="text-xs text-muted-foreground">{p.name}</code>
                  </label>
                  {p.type.name === "enum" ? (
                    <select
                      id={id}
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
                      value={values[p.name] ?? p.defaultValue ?? ""}
                      onChange={(e) => {
                        setAuthorized(false);
                        setValues((v) => ({ ...v, [p.name]: e.target.value }));
                      }}
                    >
                      {!p.defaultValue && <option value="">— vyber —</option>}
                      {p.type.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id={id}
                      value={values[p.name] ?? ""}
                      placeholder={p.defaultValue ?? ""}
                      aria-invalid={Boolean(err)}
                      aria-describedby={err ? `${id}-err` : undefined}
                      onChange={(e) => {
                        setAuthorized(false);
                        setValues((v) => ({ ...v, [p.name]: e.target.value }));
                      }}
                    />
                  )}
                  {err && (
                    <p id={`${id}-err`} className="text-xs text-destructive">
                      {err}
                    </p>
                  )}
                </div>
              );
            })}
            {pentest && (
              <>
                <p className="text-sm text-muted-foreground">
                  .sh provede pouze omezenou TCP kontrolu Nmap. Příkazy AI jsou komentáře, nikoli
                  spustitelné kroky.
                </p>
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={authorized}
                    onCheckedChange={(v) => setAuthorized(v === true)}
                  />
                  Mám aktuální písemné oprávnění a potvrzený rozsah i časové okno pro tento
                  laboratorní cíl.
                </label>
                {scenario && (
                  <details>
                    <summary className="cursor-pointer text-sm">Původní rozsah a omezení</summary>
                    <p className="mt-2 break-words text-xs text-muted-foreground">
                      {scenario.scope.inScope.join(", ")} · {scenario.constraints.rateLimit} · ROE:{" "}
                      {scenario.authorization.reference} · {scenario.authorization.from} –{" "}
                      {scenario.authorization.to}
                    </p>
                  </details>
                )}
              </>
            )}
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-primary" />
              Používej jen na vlastních nebo výslovně autorizovaných systémech. Skript se nespouští
              automaticky.
            </p>
            {warnings.length > 0 && (
              <ul className="list-disc pl-6 text-xs text-muted-foreground" aria-label="Upozornění">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
            {result?.ok && (
              <pre
                aria-label="Náhled skriptu"
                className="max-h-72 overflow-auto rounded-md border border-border bg-muted p-3 text-xs whitespace-pre-wrap break-all"
              >
                {result.script}
              </pre>
            )}
          </form>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            disabled={!result?.ok}
            onClick={() => {
              if (result?.ok) {
                void onCopy(result.script);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }
            }}
          >
            {copied ? <Check /> : <Copy />}Kopírovat
          </Button>
          <Button
            disabled={!result?.ok}
            onClick={() => {
              if (result?.ok) {
                downloadScript(result.script, result.filename);
                onDownload?.();
              }
            }}
          >
            <Download />
            Stáhnout .sh
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
