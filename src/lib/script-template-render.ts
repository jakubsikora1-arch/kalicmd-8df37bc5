import { SCRIPT_FILENAME } from "./bash-script";
import { quotePosix } from "./param-validators";
import type { ParsedTemplate } from "./script-template-format";
import { validateTemplateValue } from "./script-template-validation";

export type RenderResult =
  { ok: true; script: string; filename: string } | { ok: false; errors: Record<string, string> };

export function templateFilename(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return slug ? `kalicmd-${slug}.sh` : SCRIPT_FILENAME;
}

// Deterministic: only NAME={{NAME}} lines change, each to a single-quoted literal.
export function renderScriptTemplate(
  template: ParsedTemplate,
  values: Record<string, string>,
  title: string,
): RenderResult {
  const errors: Record<string, string> = {};
  const resolved: Record<string, string> = {};
  for (const p of template.params) {
    const value = values[p.name] ?? "";
    const effective = value === "" ? (p.defaultValue ?? "") : value;
    if (effective === "") {
      if (p.required) errors[p.name] = "Toto pole je povinné.";
      resolved[p.name] = "";
      continue;
    }
    const e = validateTemplateValue(p.type, effective);
    if (e) errors[p.name] = e;
    else resolved[p.name] = effective;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  const safeTitle = title.replace(/[^\p{L}\p{N} _.,:()-]/gu, "").slice(0, 80);
  const body = template.body.map((line, i) => {
    const p = template.params.find((x) => template.placeholderLines[x.name] === i);
    return p ? `${p.name}=${quotePosix(resolved[p.name] ?? "")}` : line;
  });
  return {
    ok: true,
    script:
      [template.shebang, `# Vygenerováno KaliCmd ze šablony „${safeTitle}“`, ...body].join("\n") +
      "\n",
    filename: templateFilename(title),
  };
}

// Heuristic only: flags risky uses of parameters elsewhere in the script; never blocks.
export function templateWarnings(template: ParsedTemplate): string[] {
  const warnings = new Set<string>();
  template.body.forEach((line) => {
    const code = line.trimStart();
    if (code.startsWith("#")) return;
    if (/\beval\b/.test(code))
      warnings.add("Skript používá eval – hodnoty parametrů mohou být znovu interpretovány.");
    if (/\b(?:bash|sh)\s+-c\b/.test(code))
      warnings.add("Skript spouští bash -c / sh -c – ověř, že do něj nevkládá parametry.");
    for (const p of template.params) {
      for (const m of code.matchAll(new RegExp(`\\$\\{?${p.name}\\b`, "g"))) {
        if ((code.slice(0, m.index).match(/"/g) ?? []).length % 2 === 0)
          warnings.add(`Parametr ${p.name} je použit bez uvozovek; doporučeno "$${p.name}".`);
      }
    }
  });
  return [...warnings];
}
