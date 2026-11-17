import { useId, useState } from "react";
import { Check, Copy, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { findTool, toolCatalog, type ToolId } from "@/lib/tool-catalog";
import {
  getParameterActions,
  getParameterDefaults,
  hasParameterTemplate,
  parameterLevels,
  type ParameterLevel,
} from "@/lib/tool-parameter-templates";
import { buildParameterCommand, type ParameterOutput } from "@/lib/parameter-command-builder";

export function ParameterizedCommandGenerator({ initialTool }: { initialTool: ToolId }) {
  const [toolId, setToolId] = useState(initialTool);
  const actions = getParameterActions(toolId);
  const [actionId, setActionId] = useState(actions[0]?.id ?? "");
  const [level, setLevel] = useState<ParameterLevel>("beginner");
  const [values, setValues] = useState(getParameterDefaults(initialTool));
  const [output, setOutput] = useState<ParameterOutput | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const id = useId();
  const action = actions.find((a) => a.id === actionId);
  const tool = findTool(toolId);
  function clearResult() {
    setOutput(null);
    setErrors({});
    setCopied(false);
    setCopyError("");
  }
  function changeTool(next: string) {
    const selected = findTool(next);
    if (!selected || !hasParameterTemplate(selected.id)) return;
    setToolId(selected.id);
    setActionId(getParameterActions(selected.id)[0]?.id ?? "");
    setValues(getParameterDefaults(selected.id));
    setLevel("beginner");
    clearResult();
  }
  function changeAction(next: string) {
    if (!getParameterActions(toolId).some((item) => item.id === next)) return;
    setActionId(next);
    setValues(getParameterDefaults(toolId, next));
    clearResult();
  }
  function update(key: string, value: string | boolean) {
    setValues((previous) => ({ ...previous, [key]: value }));
    clearResult();
  }
  async function copy() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output.content);
      setCopied(true);
      setCopyError("");
    } catch {
      setCopyError("Kopírování se nezdařilo. Označ výstup a zkopíruj jej ručně.");
    }
  }
  return (
    <section aria-label="Parametrický generátor" className="min-w-0">
      <h2 className="mb-4 flex items-center gap-2 font-sans text-lg font-semibold text-primary">
        <SlidersHorizontal size={20} />
        Parametrický generátor
      </h2>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const result = buildParameterCommand({ tool: toolId, action: actionId, level, values });
          setCopied(false);
          setCopyError("");
          if (result.ok) {
            setOutput(result.output);
            setErrors({});
          } else {
            setOutput(null);
            setErrors(result.errors);
          }
        }}
      >
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor={`${id}-tool`} className="mb-2 block text-sm">
              Nástroj
            </label>
            <Select value={toolId} onValueChange={changeTool}>
              <SelectTrigger id={`${id}-tool`} className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {toolCatalog.filter((item) => hasParameterTemplate(item.id)).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0">
            <label htmlFor={`${id}-action`} className="mb-2 block text-sm">
              Akce
            </label>
            <Select value={actionId} onValueChange={changeAction}>
              <SelectTrigger id={`${id}-action`} className="min-h-11 whitespace-normal text-left">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {actions.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <fieldset className="my-4">
          <legend className="mb-2 text-sm">Úroveň</legend>
          <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-background p-1">
            {parameterLevels.map((item) => (
              <Button
                key={item.id}
                type="button"
                className="min-w-0 px-1 text-xs sm:text-sm"
                variant={level === item.id ? "secondary" : "ghost"}
                aria-pressed={level === item.id}
                onClick={() => {
                  setLevel(item.id);
                  clearResult();
                }}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </fieldset>
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          {action?.fields.map((field) => {
            const fieldId = `${id}-${field.id}`,
              errorId = `${fieldId}-error`;
            return (
              <div key={field.id} className="min-w-0">
                {field.kind === "boolean" ? (
                  <div className="flex min-h-11 items-center gap-2">
                    <Checkbox
                      id={fieldId}
                      className="size-11"
                      checked={values[field.id] === true}
                      aria-invalid={Boolean(errors[field.id])}
                      aria-describedby={errors[field.id] ? errorId : undefined}
                      onCheckedChange={(value) => update(field.id, value === true)}
                    />
                    <label htmlFor={fieldId} className="text-sm">
                      {field.label}
                    </label>
                  </div>
                ) : (
                  <>
                    <label htmlFor={fieldId} className="mb-2 block text-sm">
                      {field.label}
                      {field.optional ? " (volitelné)" : ""}
                    </label>
                    {field.kind === "select" ? (
                      <Select
                        value={String(values[field.id] ?? "")}
                        onValueChange={(value) => update(field.id, value)}
                      >
                        <SelectTrigger
                          id={fieldId}
                          aria-invalid={Boolean(errors[field.id])}
                          aria-describedby={errors[field.id] ? errorId : undefined}
                          className="min-h-11"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={fieldId}
                        className="min-h-11"
                        type={field.kind === "number" ? "number" : "text"}
                        inputMode={field.kind === "number" ? "numeric" : undefined}
                        min={field.min}
                        max={field.max}
                        maxLength={512}
                        autoComplete="off"
                        spellCheck={false}
                        value={String(values[field.id] ?? "")}
                        aria-invalid={Boolean(errors[field.id])}
                        aria-describedby={errors[field.id] ? errorId : undefined}
                        onChange={(event) => update(field.id, event.target.value)}
                      />
                    )}
                  </>
                )}
                {errors[field.id] && (
                  <p
                    id={errorId}
                    role="alert"
                    className="mt-2 break-words text-xs text-destructive"
                  >
                    {errors[field.id]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <p className="my-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <ShieldCheck size={16} className="mt-0.5 shrink-0" />
          Pouze vlastní systémy nebo výslovně autorizované cíle.
        </p>
        {Object.entries(errors)
          .filter(([key]) => !action?.fields.some((f) => f.id === key))
          .map(([key, message]) => (
            <p key={key} role="alert" className="mb-2 text-sm text-destructive">
              {message}
            </p>
          ))}
        <Button type="submit">
          <SlidersHorizontal />
          Sestavit výstup
        </Button>
      </form>
      {output && (
        <div className="mt-6 min-w-0 border-t border-border pt-4" aria-live="polite">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-primary">
              {tool?.name} ·{" "}
              {output.type === "shell"
                ? "Bash / CLI"
                : output.type === "metasploit-console"
                  ? "Konzole msfconsole (ne Bash)"
                  : "GUI workflow (ne Bash)"}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => {
                void copy();
              }}
              aria-label="Kopírovat sestavený výstup"
            >
              {copied ? <Check /> : <Copy />}
              {copied ? "Zkopírováno" : "Kopírovat"}
            </Button>
          </div>
          <pre
            className="max-h-64 overflow-auto rounded-md border border-border bg-card p-3 text-xs leading-6 text-primary"
            tabIndex={0}
          >
            <code>{output.content}</code>
          </pre>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
            {output.explanation.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">{output.warning}</p>
          {copyError && (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {copyError}
            </p>
          )}
          <span role="status" className="sr-only">
            {copied ? "Výstup zkopírován do schránky." : ""}
          </span>
        </div>
      )}
    </section>
  );
}
