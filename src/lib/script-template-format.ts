import {
  formatTemplateType,
  parseTemplateType,
  validateTemplateValue,
  type TemplateType,
} from "./script-template-validation";

export const TEMPLATE_MARKER = "# kalicmd-template: v1";
const PARAM_PREFIX = "# kalicmd-param:";
const END_MARKER = "# kalicmd-end";
export const MAX_TEMPLATE_LENGTH = 100_000;
export const MAX_PARAMS = 20;
const NAME = /^[A-Z][A-Z0-9_]{0,31}$/;
const RESERVED = new Set([
  "PATH",
  "IFS",
  "HOME",
  "SHELL",
  "USER",
  "PWD",
  "OLDPWD",
  "ENV",
  "CDPATH",
  "PS1",
  "PS2",
  "PS4",
  "PROMPT_COMMAND",
  "SHELLOPTS",
  "UID",
  "EUID",
  "TERM",
  "LANG",
  "TMPDIR",
]);
const SHEBANGS = ["#!/usr/bin/env bash", "#!/bin/bash"];

export type TemplateParam = {
  name: string;
  type: TemplateType;
  label: string;
  defaultValue?: string | undefined;
  required: boolean;
};
export type ParsedTemplate = {
  shebang: string;
  params: TemplateParam[];
  body: string[];
  placeholderLines: Record<string, number>;
};
export type ParseResult = { ok: true; template: ParsedTemplate } | { ok: false; errors: string[] };

export const isReservedName = (n: string) =>
  RESERVED.has(n) || n.startsWith("BASH") || n.startsWith("LD_");
export const validParamName = (n: string) => NAME.test(n) && !isReservedName(n);
const safeMeta = (s: string) =>
  s.length <= 80 &&
  !/[|\n\r]/.test(s) &&
  [...s].every((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127);
const lines = (s: string) => s.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");

export function isScriptTemplate(script: string): boolean {
  const l = lines(script);
  return SHEBANGS.includes(l[0] ?? "") && l[1] === TEMPLATE_MARKER;
}

// Marks heredoc bodies so placeholders inside them can be rejected.
function heredocLines(body: string[]): Set<number> {
  const inside = new Set<number>();
  let delimiter: { word: string; strip: boolean } | null = null;
  body.forEach((line, i) => {
    if (delimiter) {
      if ((delimiter.strip ? line.replace(/^\t+/, "") : line) === delimiter.word) delimiter = null;
      else inside.add(i);
      return;
    }
    const m = line.match(/<<(-?)\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?/);
    if (m && !line.includes("<<<")) delimiter = { word: m[2] ?? "", strip: m[1] === "-" };
  });
  return inside;
}

export function parseScriptTemplate(script: string): ParseResult {
  if (script.length > MAX_TEMPLATE_LENGTH)
    return { ok: false, errors: ["Šablona je delší než 100 000 znaků."] };
  const l = lines(script);
  const errors: string[] = [];
  if (!SHEBANGS.includes(l[0] ?? ""))
    return {
      ok: false,
      errors: ["Šablona musí začínat řádkem #!/usr/bin/env bash nebo #!/bin/bash."],
    };
  if (l[1] !== TEMPLATE_MARKER)
    return { ok: false, errors: ["Chybí značka # kalicmd-template: v1 hned za shebangem."] };
  const end = l.indexOf(END_MARKER, 2);
  if (end < 0) return { ok: false, errors: ["Chybí ukončení hlavičky # kalicmd-end."] };
  const params: TemplateParam[] = [];
  for (const raw of l.slice(2, end)) {
    if (!raw.startsWith(PARAM_PREFIX)) {
      errors.push(`Neznámý řádek v hlavičce: ${raw.slice(0, 60)}`);
      continue;
    }
    const [nameRaw, ...rest] = raw
      .slice(PARAM_PREFIX.length)
      .split("|")
      .map((p) => p.trim());
    const name = nameRaw ?? "";
    if (!validParamName(name)) {
      errors.push(`Neplatný nebo rezervovaný název parametru: ${name.slice(0, 40)}`);
      continue;
    }
    if (params.some((p) => p.name === name)) {
      errors.push(`Parametr ${name} je deklarován dvakrát.`);
      continue;
    }
    let type: TemplateType | null = null;
    let label = name;
    let defaultValue: string | undefined;
    let required = false;
    for (const part of rest) {
      if (part === "required") required = true;
      else if (part.startsWith("type=")) type = parseTemplateType(part.slice(5));
      else if (part.startsWith("label=") && safeMeta(part.slice(6))) label = part.slice(6);
      else if (part.startsWith("default=")) defaultValue = part.slice(8);
      else errors.push(`Parametr ${name}: neznámá vlastnost „${part.slice(0, 30)}“.`);
    }
    if (!type) {
      errors.push(`Parametr ${name}: chybí nebo je neznámý typ.`);
      continue;
    }
    if (defaultValue !== undefined) {
      const e = validateTemplateValue(type, defaultValue);
      if (e) errors.push(`Parametr ${name}: výchozí hodnota je neplatná. ${e}`);
    }
    params.push({ name, type, label, defaultValue, required });
  }
  if (params.length > MAX_PARAMS) errors.push(`Šablona smí mít nejvýš ${MAX_PARAMS} parametrů.`);
  const body = l.slice(end + 1);
  const heredoc = heredocLines(body);
  const placeholderLines: Record<string, number> = {};
  body.forEach((line, i) => {
    if (!line.includes("{{")) return;
    const m = line.match(/^([A-Z][A-Z0-9_]{0,31})=\{\{([A-Z][A-Z0-9_]{0,31})\}\}$/);
    if (!m || m[1] !== m[2] || heredoc.has(i)) {
      errors.push(
        `Řádek ${end + i + 2}: placeholder smí stát jen jako samostatné přiřazení NAME={{NAME}}.`,
      );
      return;
    }
    const n = m[1] ?? "";
    if (placeholderLines[n] !== undefined) errors.push(`Placeholder ${n} je použit vícekrát.`);
    else placeholderLines[n] = i;
  });
  for (const p of params)
    if (placeholderLines[p.name] === undefined)
      errors.push(`Parametr ${p.name} nemá řádek ${p.name}={{${p.name}}}.`);
  for (const n of Object.keys(placeholderLines))
    if (!params.some((p) => p.name === n))
      errors.push(`Placeholder ${n} nemá deklaraci v hlavičce.`);
  return errors.length
    ? { ok: false, errors }
    : { ok: true, template: { shebang: l[0] ?? "", params, body, placeholderLines } };
}

export type ParamSuggestion = {
  name: string;
  line: number;
  defaultValue: string;
  type: TemplateType;
};

function guessType(name: string, value: string): TemplateType {
  const tries: [TemplateType, RegExp][] = [
    [{ name: "url" }, /URL/],
    [{ name: "ports" }, /PORT/],
    [{ name: "cidr" }, /CIDR|RANGE|NET/],
    [{ name: "host" }, /TARGET|HOST|IP|DOMAIN/],
    [{ name: "iface" }, /IFACE|INTERFACE|NIC/],
    [{ name: "path" }, /DIR|FILE|PATH|WORDLIST|OUT/],
  ];
  for (const [t, re] of tries)
    if (re.test(name) && (value === "" || validateTemplateValue(t, value) === null)) return t;
  return { name: "text" };
}

// Proposes simple top-level assignments (NAME=value or NAME="${1:-value}") as parameters.
export function suggestTemplateParams(script: string): ParamSuggestion[] {
  const l = lines(script);
  if (!SHEBANGS.includes(l[0] ?? "") || isScriptTemplate(script)) return [];
  const heredoc = heredocLines(l);
  const seen = new Set<string>();
  const out: ParamSuggestion[] = [];
  l.forEach((line, i) => {
    const m = line.match(/^([A-Z][A-Z0-9_]{0,31})=(.*)$/);
    if (
      !m ||
      heredoc.has(i) ||
      seen.has(m[1] ?? "") ||
      !validParamName(m[1] ?? "") ||
      out.length >= MAX_PARAMS
    )
      return;
    const name = m[1] ?? "";
    const raw = (m[2] ?? "").trim();
    seen.add(name);
    const positional = raw.match(/^"?\$\{\d+:-([^}"$`]*)\}"?$/);
    const quoted = raw.match(/^(['"])([^'"$`\\]*)\1$/);
    const defaultValue = positional
      ? (positional[1] ?? "")
      : quoted
        ? (quoted[2] ?? "")
        : /^[a-zA-Z0-9_./:,@+=-]*$/.test(raw)
          ? raw
          : "";
    out.push({ name, line: i, defaultValue, type: guessType(name, defaultValue) });
  });
  return out;
}

export type TemplateSelection = {
  name: string;
  line: number;
  type: TemplateType;
  label: string;
  defaultValue: string;
  required: boolean;
};

export function createTemplateText(
  script: string,
  selection: TemplateSelection[],
): { ok: true; text: string } | { ok: false; errors: string[] } {
  if (isScriptTemplate(script)) return { ok: false, errors: ["Skript už je šablona."] };
  if (selection.length === 0) return { ok: false, errors: ["Vyber alespoň jeden parametr."] };
  const l = lines(script);
  const errors: string[] = [];
  const header = [TEMPLATE_MARKER];
  for (const s of selection) {
    if (!safeMeta(s.label) || !s.label.trim())
      errors.push(`${s.name}: popisek nesmí být prázdný ani obsahovat | nebo nový řádek.`);
    if (s.defaultValue) {
      const e = validateTemplateValue(s.type, s.defaultValue);
      if (e) errors.push(`${s.name}: ${e}`);
    }
    if (!(l[s.line] ?? "").startsWith(`${s.name}=`))
      errors.push(`${s.name}: řádek s přiřazením nebyl nalezen.`);
    header.push(
      `${PARAM_PREFIX} ${s.name} | type=${formatTemplateType(s.type)} | label=${s.label.trim()}${s.defaultValue ? ` | default=${s.defaultValue}` : ""}${s.required ? " | required" : ""}`,
    );
  }
  if (errors.length) return { ok: false, errors };
  header.push(END_MARKER);
  const body = l.slice(1).map((line, i) => {
    const s = selection.find((x) => x.line === i + 1);
    return s ? `${s.name}={{${s.name}}}` : line;
  });
  const text = [l[0], ...header, ...body].join("\n") + "\n";
  const parsed = parseScriptTemplate(text);
  return parsed.ok ? { ok: true, text } : { ok: false, errors: parsed.errors };
}
