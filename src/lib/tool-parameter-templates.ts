import type { ToolId } from "./tool-catalog";

export const parameterLevels = [
  { id: "beginner", label: "Začátečník" },
  { id: "advanced", label: "Pokročilý" },
  { id: "expert", label: "Expert" },
] as const;
export type ParameterLevel = (typeof parameterLevels)[number]["id"];
export type ParameterKind =
  | "host"
  | "url"
  | "ports"
  | "interface"
  | "path"
  | "capture-filter"
  | "display-filter"
  | "term"
  | "module"
  | "parameter"
  | "number"
  | "select"
  | "boolean";
export type ParameterField = {
  id: string;
  label: string;
  kind: ParameterKind;
  default: string | boolean;
  optional?: boolean;
  min?: number;
  max?: number;
  options?: readonly { value: string; label: string }[];
};
export type ParameterAction = { id: string; label: string; fields: readonly ParameterField[] };
export type ParameterTemplate = { actions: readonly ParameterAction[] };
const field = (
  id: string,
  label: string,
  kind: ParameterKind,
  value: string | boolean,
  extra: Partial<ParameterField> = {},
): ParameterField => ({ id, label, kind, default: value, ...extra });
const choice = (
  id: string,
  label: string,
  options: readonly [string, string][],
  value = options[0]?.[0] ?? "",
): ParameterField =>
  field(id, label, "select", value, {
    options: options.map(([value, label]) => ({ value, label })),
  });
const limit = (id: string, label: string, value: number, min: number, max: number) =>
  field(id, label, "number", String(value), { min, max });
const hashFile = field("file", "Vlastní soubor hashů", "path", "hashes.txt");
const wordlist = field("wordlist", "Vlastní slovník", "path", "wordlist.txt");
const url = field("url", "Autorizovaná URL", "url", "http://127.0.0.1");
const runtime = limit("seconds", "Časový limit (s)", 60, 1, 300);
const johnFormat = choice("format", "Formát hashů", [
  ["raw-md5", "MD5"],
  ["raw-sha256", "SHA-256"],
  ["bcrypt", "bcrypt"],
  ["sha512crypt", "SHA-512 crypt"],
]);
const hashcatFormat = choice("format", "Typ hashe", [
  ["0", "MD5 (0)"],
  ["1400", "SHA-256 (1400)"],
  ["3200", "bcrypt (3200)"],
  ["1800", "SHA-512 crypt (1800)"],
]);

// IDs reference the catalog; names, icons and categories never live here.
export const toolParameterTemplates = {
  nmap: {
    actions: [
      {
        id: "scan",
        label: "Síťová diagnostika",
        fields: [
          field("host", "Vlastní host / IP / CIDR", "host", "192.168.1.1"),
          choice("scan", "Typ skenu", [
            ["connect", "TCP connect"],
            ["discovery", "Pouze dostupnost (-sn)"],
          ]),
          field("ports", "TCP porty", "ports", "22,80,443"),
          field("versions", "Detekce verzí služeb", "boolean", false),
          field("os", "Detekce OS (vyžaduje oprávnění)", "boolean", false),
        ],
      },
    ],
  },
  wireshark: {
    actions: [
      {
        id: "capture",
        label: "TShark: omezené zachytávání",
        fields: [
          field("interface", "Vlastní síťové rozhraní", "interface", "eth0"),
          field("filter", "Capture filtr (BPF)", "capture-filter", "port 53", { optional: true }),
          runtime,
        ],
      },
      {
        id: "read",
        label: "TShark: čtení PCAP",
        fields: [
          field("file", "Vlastní PCAP soubor", "path", "capture.pcap"),
          field("filter", "Display filtr", "display-filter", "dns", { optional: true }),
        ],
      },
    ],
  },
  metasploit: {
    actions: [
      {
        id: "search",
        label: "Vyhledat informace o modulech",
        fields: [field("term", "Výraz v názvu modulu", "term", "smb")],
      },
      {
        id: "info",
        label: "Dokumentace modulu (bez výběru)",
        fields: [field("module", "Cesta modulu", "module", "auxiliary/scanner/smb/smb_version")],
      },
      { id: "options", label: "Zobrazit parametry již vybraného modulu", fields: [] },
    ],
  },
  burp: {
    actions: [
      { id: "proxy", label: "Proxy: pasivní prohlížení provozu", fields: [url] },
      { id: "repeater", label: "Repeater: příprava vlastního požadavku", fields: [url] },
    ],
  },
  "aircrack-ng": {
    actions: [
      {
        id: "monitor",
        label: "Pasivní zobrazení na monitorovacím rozhraní",
        fields: [
          field("interface", "Vlastní monitorovací rozhraní", "interface", "wlan0mon"),
          limit("channel", "Pevný kanál", 6, 1, 165),
        ],
      },
      {
        id: "read",
        label: "Pasivní čtení vlastního záznamu",
        fields: [field("file", "Vlastní capture soubor", "path", "capture.cap")],
      },
    ],
  },
  john: {
    actions: [
      {
        id: "audit",
        label: "Omezený slovníkový audit",
        fields: [hashFile, wordlist, johnFormat, runtime],
      },
      { id: "show", label: "Již nalezené výsledky", fields: [hashFile, johnFormat] },
    ],
  },
  hashcat: {
    actions: [
      {
        id: "audit",
        label: "Omezený slovníkový audit",
        fields: [
          hashFile,
          wordlist,
          hashcatFormat,
          runtime,
          choice("device", "Typ výpočetního zařízení", [
            ["1", "CPU"],
            ["2", "GPU"],
          ]),
        ],
      },
      { id: "show", label: "Již nalezené výsledky", fields: [hashFile, hashcatFormat] },
    ],
  },
  sqlmap: {
    actions: [
      {
        id: "check",
        label: "Konzervativní kontrola parametru",
        fields: [
          field("url", "Autorizovaná URL s parametrem", "url", "http://127.0.0.1/test.php?id=1"),
          field("parameter", "Testovaný query parametr", "parameter", "id"),
          limit("delay", "Prodleva mezi požadavky (s)", 2, 1, 10),
        ],
      },
    ],
  },
  gobuster: {
    actions: [
      {
        id: "dir",
        label: "HTTP cesty",
        fields: [
          url,
          wordlist,
          limit("threads", "Počet souběžných požadavků", 1, 1, 4),
          limit("delay", "Prodleva vlákna (s)", 2, 1, 10),
        ],
      },
      {
        id: "dns",
        label: "Laboratorní DNS subdomény",
        fields: [
          field("host", "Vlastní laboratorní doména", "host", "example.test"),
          wordlist,
          limit("threads", "Počet souběžných dotazů", 1, 1, 4),
          limit("delay", "Prodleva vlákna (s)", 2, 1, 10),
        ],
      },
      {
        id: "vhost",
        label: "HTTP virtuální hosty",
        fields: [
          url,
          wordlist,
          limit("threads", "Počet souběžných požadavků", 1, 1, 4),
          limit("delay", "Prodleva vlákna (s)", 2, 1, 10),
        ],
      },
    ],
  },
  nikto: {
    actions: [
      {
        id: "check",
        label: "Omezená kontrola konfigurace",
        fields: [
          url,
          field("tls", "Použít TLS / HTTPS", "boolean", false),
          limit("pause", "Prodleva mezi testy (s)", 2, 1, 10),
          runtime,
        ],
      },
    ],
  },
} satisfies Record<ToolId, ParameterTemplate>;

export function getParameterActions(tool: ToolId): readonly ParameterAction[] {
  return toolParameterTemplates[tool].actions;
}
export function getParameterDefaults(
  tool: ToolId,
  actionId?: string,
): Record<string, string | boolean> {
  const action =
    getParameterActions(tool).find((a) => a.id === actionId) ?? getParameterActions(tool)[0];
  return Object.fromEntries(action?.fields.map((f) => [f.id, f.default]) ?? []);
}
