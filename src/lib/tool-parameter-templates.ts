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
  | "username"
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

const labUrl = (path = "") =>
  field("url", "Autorizovaná URL v laboratoři", "url", `http://192.168.56.101${path}`);
const labWordlist = field("wordlist", "Slovník", "path", "/usr/share/wordlists/dirb/common.txt");

// IDs reference the catalog; names, icons and categories never live here.
export const toolParameterTemplates: Partial<Record<ToolId, ParameterTemplate>> = {
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
  hydra: {
    actions: [
      {
        id: "docs",
        label: "Dokumentace modulu služby (bez připojení)",
        fields: [
          choice("service", "Služba", [
            ["ssh", "SSH"],
            ["ftp", "FTP"],
            ["telnet", "Telnet"],
            ["http-get", "HTTP GET"],
            ["http-post-form", "HTTP POST formulář"],
          ]),
        ],
      },
      {
        id: "filter",
        label: "Filtrace vlastního slovníku (pw-inspector)",
        fields: [
          field("file", "Vstupní slovník", "path", "wordlist.txt"),
          field("out", "Výstupní soubor", "path", "filtered.txt"),
          limit("min", "Minimální délka hesla", 8, 1, 64),
          limit("max", "Maximální délka hesla", 16, 1, 64),
        ],
      },
    ],
  },
  reaver: {
    actions: [
      {
        id: "read",
        label: "Wash: offline rozbor vlastního záznamu",
        fields: [field("file", "Vlastní PCAP soubor", "path", "capture.pcap")],
      },
    ],
  },
  bettercap: {
    actions: [{ id: "info", label: "Verze a nápověda spouštěče", fields: [] }],
  },
  wpscan: {
    actions: [
      {
        id: "passive",
        label: "Pasivní detekce WordPressu",
        fields: [
          labUrl("/wordpress"),
          limit("throttle", "Prodleva mezi požadavky (ms)", 1000, 100, 5000),
          limit("seconds", "Časový limit požadavku (s)", 30, 5, 60),
        ],
      },
    ],
  },
  wpprobe: {
    actions: [
      {
        id: "help",
        label: "Nápověda podřízeného příkazu",
        fields: [
          choice("sub", "Podřízený příkaz", [
            ["scan", "scan"],
            ["search", "search"],
            ["list", "list"],
          ]),
        ],
      },
    ],
  },
  arjun: {
    actions: [
      {
        id: "params",
        label: "Hledání HTTP parametrů",
        fields: [
          labUrl("/search"),
          choice("method", "Metoda", [
            ["GET", "GET"],
            ["POST", "POST"],
            ["JSON", "JSON"],
          ]),
          field("wordlist", "Vlastní slovník parametrů", "path", "params.txt"),
          limit("threads", "Počet vláken", 1, 1, 4),
          limit("delay", "Prodleva (s)", 2, 1, 10),
          field("out", "JSON report", "path", "arjun.json"),
        ],
      },
    ],
  },
  dirbuster: {
    actions: [
      {
        id: "launch",
        label: "GUI s cílem / omezený headless průzkum",
        fields: [
          labUrl("/"),
          labWordlist,
          field("out", "Textový report (od úrovně Expert)", "path", "dirbuster.txt"),
        ],
      },
    ],
  },
  dirb: {
    actions: [
      {
        id: "scan",
        label: "Nerekurzivní průzkum cest",
        fields: [
          labUrl("/"),
          labWordlist,
          limit("delay", "Prodleva mezi požadavky (ms)", 500, 0, 10000),
          field("out", "Výstupní soubor (od úrovně Expert)", "path", "dirb.txt"),
        ],
      },
    ],
  },
  sherlock: {
    actions: [
      {
        id: "user",
        label: "Kontrola vlastního uživatelského jména",
        fields: [
          field("username", "Vlastní uživatelské jméno", "username", "muj_lab_ucet"),
          field("site", "Jedna služba", "term", "GitHub", { optional: true }),
          limit("seconds", "Časový limit požadavku (s)", 10, 1, 60),
          field("out", "Výstupní soubor (od úrovně Expert)", "path", "sherlock.txt"),
        ],
      },
    ],
  },
  legion: {
    actions: [{ id: "audit", label: "Kontrola dostupnosti nástrojů", fields: [] }],
  },
};

export function getParameterActions(tool: ToolId): readonly ParameterAction[] {
  return toolParameterTemplates[tool]?.actions ?? [];
}
export function hasParameterTemplate(tool: ToolId): boolean {
  return getParameterActions(tool).length > 0;
}
export function getParameterDefaults(
  tool: ToolId,
  actionId?: string,
): Record<string, string | boolean> {
  const action =
    getParameterActions(tool).find((a) => a.id === actionId) ?? getParameterActions(tool)[0];
  return Object.fromEntries(action?.fields.map((f) => [f.id, f.default]) ?? []);
}
