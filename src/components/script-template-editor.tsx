import { useMemo, useState } from "react";
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
import {
  createTemplateText,
  suggestTemplateParams,
  type TemplateSelection,
} from "@/lib/script-template-format";
import {
  parseTemplateType,
  templateTypeNames,
  type TemplateType,
  type TemplateTypeName,
} from "@/lib/script-template-validation";

type Row = {
  use: boolean;
  typeName: TemplateTypeName;
  options: string;
  label: string;
  defaultValue: string;
  required: boolean;
};
const typeLabels: Record<TemplateTypeName, string> = {
  host: "Host / IP",
  cidr: "Rozsah CIDR",
  url: "URL",
  port: "Port",
  ports: "Porty",
  int: "Číslo (0–100000)",
  path: "Cesta",
  iface: "Rozhraní",
  enum: "Výběr z hodnot",
  text: "Krátký text",
};
const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground";

function toType(row: Row): TemplateType | null {
  if (row.typeName === "int") return { name: "int", min: 0, max: 100000 };
  if (row.typeName === "enum") return parseTemplateType(`enum:${row.options.replace(/\s/g, "")}`);
  return { name: row.typeName } as TemplateType;
}

type Props = {
  open: boolean;
  title: string;
  script: string;
  saving: boolean;
  error: string;
  onCancel: () => void;
  onSave: (title: string, text: string) => void;
};

export function ScriptTemplateEditor({
  open,
  title,
  script,
  saving,
  error,
  onCancel,
  onSave,
}: Props) {
  const suggestions = useMemo(() => suggestTemplateParams(script), [script]);
  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(
      suggestions.map((s) => [
        s.name,
        {
          use: false,
          typeName: s.type.name,
          options: s.type.name === "enum" ? s.type.options.join(",") : "",
          label: s.name,
          defaultValue: s.defaultValue,
          required: s.defaultValue === "",
        },
      ]),
    ),
  );
  const update = (name: string, patch: Partial<Row>) =>
    setRows((prev) => ({ ...prev, [name]: { ...prev[name]!, ...patch } }));
  const result = useMemo(() => {
    const selection: TemplateSelection[] = [];
    for (const s of suggestions) {
      const row = rows[s.name];
      if (!row?.use) continue;
      const type = toType(row);
      if (!type)
        return {
          ok: false as const,
          errors: [`${s.name}: zadej hodnoty výběru oddělené čárkou (písmena, číslice, _ -).`],
        };
      selection.push({
        name: s.name,
        line: s.line,
        type,
        label: row.label,
        defaultValue: row.defaultValue,
        required: row.required,
      });
    }
    return createTemplateText(script, selection);
  }, [rows, script, suggestions]);
  const newTitle = `${title.slice(0, 69)} (šablona)`;
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !saving) onCancel();
      }}
    >
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Udělat šablonu</DialogTitle>
          <DialogDescription>
            Zaškrtni proměnné, které se mají vyplňovat formulářem. Šablona se uloží jako nový
            skript, původní zůstane beze změny.
          </DialogDescription>
        </DialogHeader>
        {suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ve skriptu nejsou přiřazení ve tvaru NAZEV=hodnota na samostatném řádku, ze kterých by
            šlo udělat parametry.
          </p>
        ) : (
          <div className="space-y-3">
            {suggestions.map((s) => {
              const row = rows[s.name]!;
              const id = `tpl-${s.name}`;
              return (
                <fieldset key={s.name} className="min-w-0 space-y-2 rounded-md border border-border p-3">
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={row.use}
                      onChange={(e) => update(s.name, { use: e.target.checked })}
                    />
                    <code className="text-primary">{s.name}</code>
                    <span className="text-xs text-muted-foreground">řádek {s.line + 1}</span>
                  </label>
                  {row.use && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="text-xs text-muted-foreground" htmlFor={`${id}-type`}>
                        Typ
                        <select
                          id={`${id}-type`}
                          className={selectClass}
                          value={row.typeName}
                          onChange={(e) =>
                            update(s.name, { typeName: e.target.value as TemplateTypeName })
                          }
                        >
                          {templateTypeNames.map((t) => (
                            <option key={t} value={t}>
                              {typeLabels[t]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-muted-foreground" htmlFor={`${id}-label`}>
                        Popisek
                        <Input
                          id={`${id}-label`}
                          maxLength={80}
                          value={row.label}
                          onChange={(e) => update(s.name, { label: e.target.value })}
                        />
                      </label>
                      {row.typeName === "enum" && (
                        <label
                          className="text-xs text-muted-foreground sm:col-span-2"
                          htmlFor={`${id}-opts`}
                        >
                          Hodnoty výběru (oddělené čárkou)
                          <Input
                            id={`${id}-opts`}
                            value={row.options}
                            onChange={(e) => update(s.name, { options: e.target.value })}
                          />
                        </label>
                      )}
                      <label className="text-xs text-muted-foreground" htmlFor={`${id}-default`}>
                        Výchozí hodnota
                        <Input
                          id={`${id}-default`}
                          value={row.defaultValue}
                          onChange={(e) => update(s.name, { defaultValue: e.target.value })}
                        />
                      </label>
                      <label className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          className="size-4 accent-primary"
                          checked={row.required}
                          onChange={(e) => update(s.name, { required: e.target.checked })}
                        />
                        Povinné
                      </label>
                    </div>
                  )}
                </fieldset>
              );
            })}
            {result.ok ? (
              <pre
                aria-label="Náhled šablony"
                className="max-h-60 overflow-auto rounded-md border border-border bg-muted p-3 text-xs whitespace-pre-wrap break-all"
              >
                {result.text}
              </pre>
            ) : (
              <ul role="alert" className="error-notice list-disc pl-6 text-xs">
                {result.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="error-notice text-sm">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" disabled={saving} onClick={onCancel}>
            Zrušit
          </Button>
          <Button
            disabled={saving || !result.ok}
            onClick={() => {
              if (result.ok) onSave(newTitle, result.text);
            }}
          >
            {saving ? "Ukládám…" : "Uložit šablonu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
