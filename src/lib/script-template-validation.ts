import { clean, validHost, validPorts, validUrl } from "./param-validators";

export const templateTypeNames = [
  "host",
  "cidr",
  "url",
  "port",
  "ports",
  "int",
  "path",
  "iface",
  "enum",
  "text",
] as const;
export type TemplateTypeName = (typeof templateTypeNames)[number];
export type TemplateType =
  | { name: Exclude<TemplateTypeName, "int" | "enum"> }
  | { name: "int"; min: number; max: number }
  | { name: "enum"; options: string[] };

const enumOption = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,31}$/;

export function parseTemplateType(raw: string): TemplateType | null {
  const int = raw.match(/^int:(\d{1,9})\.\.(\d{1,9})$/);
  if (int) {
    const min = Number(int[1]),
      max = Number(int[2]);
    return min <= max ? { name: "int", min, max } : null;
  }
  if (raw.startsWith("enum:")) {
    const options = raw.slice(5).split(",");
    if (
      options.length < 1 ||
      options.length > 20 ||
      !options.every((o) => enumOption.test(o)) ||
      new Set(options).size !== options.length
    )
      return null;
    return { name: "enum", options };
  }
  return (["host", "cidr", "url", "port", "ports", "path", "iface", "text"] as const).find(
    (n) => n === raw,
  )
    ? { name: raw as "host" }
    : null;
}

export function formatTemplateType(t: TemplateType): string {
  if (t.name === "int") return `int:${t.min}..${t.max}`;
  if (t.name === "enum") return `enum:${t.options.join(",")}`;
  return t.name;
}

function validPath(s: string): boolean {
  const rest = s.startsWith("./") ? s.slice(2) : s;
  return (
    s.length <= 240 &&
    /^\/?[a-zA-Z0-9_][a-zA-Z0-9_./-]*$/.test(rest) &&
    rest
      .replace(/^\//, "")
      .split("/")
      .every((p) => p !== ".." && p !== "." && p !== "")
  );
}

// Returns a Czech error, or null when the value is allowed for the declared type.
export function validateTemplateValue(t: TemplateType, value: string): string | null {
  if (value.length > 512 || !clean(value) || /[()\n\r]/.test(value))
    return "Hodnota obsahuje nepovolené znaky (např. ; & | $ ` < > ( ) uvozovky nebo nový řádek).";
  if (value.startsWith("-") && t.name !== "int" && t.name !== "port")
    return "Hodnota nesmí začínat pomlčkou, aby se nevložila jako přepínač.";
  switch (t.name) {
    case "host":
      return validHost(value) ? null : "Zadej platný hostname, IPv4 nebo IPv6 adresu.";
    case "cidr":
      return value.includes("/") && validHost(value, true)
        ? null
        : "Zadej rozsah CIDR nejvýš /24 (IPv4) nebo /120 (IPv6).";
    case "url":
      return validUrl(value) ? null : "Zadej platnou http(s) URL bez přihlašovacích údajů.";
    case "port":
      return /^\d{1,5}$/.test(value) && Number(value) >= 1 && Number(value) <= 65535
        ? null
        : "Port musí být číslo 1–65535.";
    case "ports":
      return validPorts(value) ? null : "Zadej porty jako 22,80,443 nebo 1-1024.";
    case "int":
      return /^\d{1,9}$/.test(value) && Number(value) >= t.min && Number(value) <= t.max
        ? null
        : `Zadej celé číslo ${t.min}–${t.max}.`;
    case "path":
      return validPath(value) ? null : "Zadej cestu bez .., mezer a speciálních znaků.";
    case "iface":
      return /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,31}$/.test(value)
        ? null
        : "Zadej název rozhraní, např. eth0 nebo wlan0.";
    case "enum":
      return t.options.includes(value) ? null : `Vyber jednu z hodnot: ${t.options.join(", ")}.`;
    case "text":
      return /^[\p{L}\p{N} _.,:@+=/-]{1,120}$/u.test(value)
        ? null
        : "Text smí mít nejvýš 120 písmen, číslic a znaků _ . , : @ + = / -.";
  }
}
