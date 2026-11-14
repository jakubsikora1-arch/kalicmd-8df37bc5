import { z } from "zod";
import { findTool, type ToolId } from "./tool-catalog";
import {
  getParameterActions,
  type ParameterField,
  type ParameterLevel,
} from "./tool-parameter-templates";
import { clean, quotePosix, validHost, validPorts, validUrl } from "./param-validators";

export type ParameterOutput = {
  type: "shell" | "metasploit-console" | "gui-instructions";
  content: string;
  explanation: string[];
  warning: string;
};
export type ParameterBuildResult =
  { ok: true; output: ParameterOutput } | { ok: false; errors: Record<string, string> };
export { quotePosix };
// Intentionally narrow grammars: no arbitrary BPF or Wireshark expression fragments.
function validFilter(s: string, capture: boolean): boolean {
  if (!clean(s) || s.length > 160) return false;
  if (capture)
    return s.split(/\s+(?:and|or)\s+/).every((term) => {
      if (/^(tcp|udp|icmp|arp)$/.test(term)) return true;
      const port = term.match(/^(?:(?:src|dst) )?port (\d+)$/);
      if (port) return validPorts(port[1] ?? "");
      const host = term.match(/^(?:(?:src|dst) )?host (\S+)$/);
      return Boolean(host && validHost(host[1] ?? ""));
    });
  return s.split(/\s+(?:and|or)\s+/).every((term) => {
    if (/^(dns|tcp|udp|http|tls|icmp|arp)$/.test(term)) return true;
    const port = term.match(/^(?:tcp|udp)\.(?:srcport|dstport|port) == (\d+)$/);
    if (port) return validPorts(port[1] ?? "");
    const host = term.match(/^ip\.(?:src|dst|addr) == (\S+)$/);
    return Boolean(
      host && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host[1] ?? "") && validHost(host[1] ?? ""),
    );
  });
}
function validField(f: ParameterField, s: string, allowCidr = false): boolean {
  if (f.optional && s === "") return true;
  if (!s || !clean(s)) return false;
  switch (f.kind) {
    case "host":
      return validHost(s, allowCidr);
    case "url":
      return validUrl(s);
    case "ports":
      return validPorts(s);
    case "interface":
      return /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,31}$/.test(s);
    case "path":
      return (
        s.length <= 240 &&
        /^\/?[a-zA-Z0-9_][a-zA-Z0-9_./ -]*$/.test(s) &&
        s
          .replace(/^\//, "")
          .split("/")
          .every((p) => p !== ".." && p !== "." && p !== "") &&
        !s.endsWith("/")
      );
    case "capture-filter":
      return validFilter(s, true);
    case "display-filter":
      return validFilter(s, false);
    case "term":
      return /^[a-zA-Z0-9_][a-zA-Z0-9_-]{0,63}$/.test(s);
    case "module":
      return /^(?:auxiliary|exploit|post|payload|encoder|nop|evasion)\/[a-zA-Z0-9_]+(?:\/[a-zA-Z0-9_]+)+$/.test(
        s,
      );
    case "parameter":
      return /^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/.test(s);
    case "number":
      return /^\d+$/.test(s) && Number(s) >= (f.min ?? 0) && Number(s) <= (f.max ?? 300);
    case "select":
      return Boolean(f.options?.some((o) => o.value === s));
    default:
      return false;
  }
}
const messages: Partial<Record<ParameterField["kind"], string>> = {
  host: "Zadej platný hostname, IPv4 nebo IPv6; CIDR je podporován jen pro Nmap.",
  url: "Zadej HTTP/HTTPS URL bez přihlašovacích údajů, fragmentu, kódovaných znaků či relativních cest.",
  ports: "Porty musí být 1–65535, např. 22,80,443 nebo 80-100.",
  interface: "Rozhraní smí obsahovat jen písmena, číslice a znaky _ . : - (max. 32 znaků).",
  path: "Použij cestu bez .., uvozovek a shell znaků; mezery uvnitř názvu jsou podporované.",
  "capture-filter":
    "Podporujeme tcp/udp/icmp/arp, [src/dst] port N a [src/dst] host IP; spojení and/or.",
  "display-filter":
    "Podporujeme dns/tcp/udp/http/tls/icmp/arp, tcp/udp.port == N a ip.addr == IPv4; také src/dst a and/or.",
};
const requestSchema = z
  .object({
    tool: z.string(),
    action: z.string().max(32),
    level: z.enum(["beginner", "advanced", "expert"]),
    values: z.record(z.string().max(32), z.union([z.string().max(512), z.boolean()])),
  })
  .strict();

/** Browser-only deterministic transformation. No network, persistence or execution. */
export function buildParameterCommand(input: unknown): ParameterBuildResult {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, errors: { form: "Neplatný požadavek nebo příliš dlouhá hodnota." } };
  const request = parsed.data;
  const tool = findTool(request.tool);
  if (!tool) return { ok: false, errors: { tool: "Neznámý nástroj." } };
  const action = getParameterActions(tool.id).find((a) => a.id === request.action);
  if (!action) return { ok: false, errors: { action: "Neznámá akce nástroje." } };
  const errors: Record<string, string> = {};
  const values: Record<string, string | boolean> = {};
  for (const key of Object.keys(request.values))
    if (!action.fields.some((f) => f.id === key))
      errors[key] = "Toto pole do zvolené akce nepatří.";
  for (const f of action.fields) {
    const value = request.values[f.id];
    if (f.kind === "boolean") {
      if (typeof value !== "boolean") errors[f.id] = "Zvol platnou hodnotu ano/ne.";
      else values[f.id] = value;
    } else if (typeof value !== "string" || !validField(f, value, tool.id === "nmap"))
      errors[f.id] =
        (tool.id === "nmap" && f.kind === "host"
          ? "Zadej platný hostname, jednotlivou IP nebo CIDR: IPv4 pouze /24–/32, IPv6 pouze /120–/128. Širší rozsahy nejsou povoleny."
          : messages[f.kind]) ??
        `Vyplň platnou hodnotu: ${f.label}${f.kind === "number" ? ` (${f.min}–${f.max})` : ""}.`;
    else values[f.id] = value;
  }
  // Contextual validations precede token assembly.
  if (tool.id === "nmap" && values["scan"] === "discovery" && (values["versions"] || values["os"]))
    errors["scan"] = "Pouhá dostupnost (-sn) nepodporuje detekci verzí ani OS.";
  if (tool.id === "nmap" && values["host"] && String(values["host"]).includes(":") && values["os"])
    errors["os"] = "Detekci OS pro IPv6 tato konzervativní šablona nepodporuje.";
  if (tool.id === "gobuster" && action.id === "dns" && !/^[a-zA-Z]/.test(String(values["host"])))
    errors["host"] = "DNS režim vyžaduje doménové jméno, nikoli IP či CIDR.";
  if (tool.id !== "nmap" && values["host"] && String(values["host"]).includes("/"))
    errors["host"] = "Tato akce nepodporuje CIDR.";
  if (
    tool.id === "sqlmap" &&
    !errors["url"] &&
    !errors["parameter"] &&
    !new URL(String(values["url"])).searchParams.has(String(values["parameter"]))
  )
    errors["parameter"] = "Parametr musí skutečně existovat v query části zadané URL.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, output: assemble(tool.id, action.id, request.level, values) };
}

function assemble(
  tool: ToolId,
  action: string,
  level: ParameterLevel,
  values: Record<string, string | boolean>,
): ParameterOutput {
  const s = (id: string) => String(values[id] ?? "");
  const advanced = level !== "beginner",
    expert = level === "expert";
  const args: string[] = [];
  const explanation: string[] = [];
  let type: ParameterOutput["type"] = "shell",
    content = "",
    program = "";
  const warning =
    "Pouze vlastní systémy nebo výslovně autorizované cíle. Nic se automaticky nespouští.";
  const add = (...tokens: string[]) => args.push(...tokens);
  switch (tool) {
    case "nmap":
      program = "nmap";
      if (s("host").includes(":")) add("-6");
      add(s("scan") === "discovery" ? "-sn" : "-sT");
      if (s("scan") !== "discovery") {
        add("-p", s("ports"));
        if (values["versions"]) add("-sV", "--version-light");
        if (values["os"]) add("-O", "--osscan-limit", "--max-os-tries", "1");
      }
      add("-T2", "--max-retries", "1", "--host-timeout", "60s");
      if (advanced) add("--reason");
      if (expert) add("-v", "--stats-every", "10s");
      add(s("host"));
      explanation.push(
        s("scan") === "discovery"
          ? "-sn zjišťuje dostupnost, nikoli porty; pole portů se nepoužije."
          : "-sT provede TCP connect na zadaných portech.",
        "-T2, jeden opakovaný pokus a 60s na host drží konzervativní tempo; velké rozsahy přesto generují provoz.",
      );
      if (values["versions"])
        explanation.push("-sV --version-light používá omezené sondy pro verze služeb.");
      if (values["os"])
        explanation.push(
          "-O vyžaduje oprávnění pro surové pakety; --osscan-limit a jeden pokus omezují diagnostiku.",
        );
      if (advanced) explanation.push("--reason uvádí důvod stavu portu/hostu.");
      if (expert) explanation.push("-v a --stats-every zobrazují průběh, nezvyšují agresivitu.");
      break;
    case "wireshark":
      program = "tshark";
      if (action === "capture") {
        add("-i", s("interface"), "-a", `duration:${s("seconds")}`, "-c", "100");
        if (s("filter")) add("-f", s("filter"));
      } else {
        add("-r", s("file"), "-c", "100");
        if (s("filter")) add("-Y", s("filter"));
      }
      add("-n");
      if (advanced) add("-t", "ad");
      if (expert) add("-V");
      explanation.push(
        action === "capture"
          ? "-i vybere vlastní rozhraní; -a duration a -c 100 omezí zachytávání. Vyžaduje oprávnění k rozhraní; nic neukládá."
          : "-r čte existující PCAP; žádné nové zachytávání. -c omezuje počet zpracovaných paketů.",
        "-f je capture BPF filtr; -Y display filtr. -n vypíná síťové překládání názvů.",
      );
      if (advanced) explanation.push("-t ad ukazuje absolutní čas s datem.");
      if (expert) explanation.push("-V vypíše detaily paketů; mohou obsahovat citlivá data.");
      break;
    case "metasploit":
      type = "metasploit-console";
      if (action === "search")
        content = `search name:${s("term")}${advanced ? " type:auxiliary" : ""}${expert ? " rank:normal" : ""}`;
      if (action === "info")
        content = `info ${expert ? "-d " : advanced ? "-j " : ""}${s("module")}`;
      if (action === "options")
        content = `show options${advanced ? " advanced" : ""}${expert ? " missing" : ""}`;
      explanation.push(
        "Zadává se do již otevřené msfconsole, nikoli do Bash. Žádné use, run ani exploit; modul se nevybírá ani nespouští.",
      );
      if (action === "search")
        explanation.push(
          "name filtruje název; Pokročilý přidává type:auxiliary, Expert také rank:normal. Jde jen o seznam informací.",
        );
      if (action === "info")
        explanation.push(
          "Začátečník čte text; Pokročilý -j JSON; Expert -d dokumentaci v prohlížeči (vyžaduje dostupný prohlížeč).",
        );
      if (action === "options")
        explanation.push(
          "options ukazuje běžné parametry, advanced pokročilé, missing nevyplněné. Platí pro již ručně vybraný modul; tento generátor jej nevybírá.",
        );
      break;
    case "burp":
      type = "gui-instructions";
      content =
        action === "proxy"
          ? `Burp Suite → Proxy → Intercept: Intercept off.\nV integrovaném prohlížeči otevři vlastní URL ${s("url")}.\nProxy → HTTP history: prohlédni zachycené požadavky.`
          : `Burp Suite → Proxy → HTTP history: vyber vlastní požadavek pro ${s("url")}.\nSend to Repeater → prohlédni požadavek; Send zatím nestiskni.`;
      if (advanced)
        content +=
          action === "proxy"
            ? `\nTarget → Scope: přidej pouze ${s("url")}.\nHTTP history → Filter: Show only in-scope items.`
            : "\nRepeater → Settings → Follow redirects: Never.";
      if (expert)
        content +=
          action === "proxy"
            ? "\nHTTP history → Filter → Filter by MIME type: HTML (ostatní typy vypni)."
            : "\nRepeater → Inspector → Request attributes: nastav protokol HTTP/1; ověř hlavičky a tělo bez odeslání.";
      explanation.push(
        "GUI workflow, nikoli shell příkaz. Aplikaci lze samostatně otevřít příkazem burpsuite; zde se kopírují pouze instrukce.",
        "Úrovně mění skutečné GUI filtry/nastavení. Scope ani filtr nejsou náhradou oprávnění; přechod na URL vytváří běžný HTTP provoz.",
      );
      break;
    case "aircrack-ng":
      program = "airodump-ng";
      if (action === "read") add("-r", s("file"));
      else add("--channel", s("channel"));
      if (advanced) add("--manufacturer");
      if (expert) add("--wps", "--uptime");
      if (action === "monitor") add(s("interface"));
      explanation.push(
        action === "read"
          ? "-r pouze čte vlastní existující záznam; žádný audit klíče."
          : "Pevný kanál omezuje pasivní zobrazení na existujícím monitorovacím rozhraní. Monitorovací režim nezapíná; vyžaduje oprávnění, ukonči Ctrl+C.",
        "Žádný deauth, injection, obnova klíče ani zapisování capture.",
      );
      if (advanced) explanation.push("--manufacturer zobrazuje výrobce dle OUI.");
      if (expert)
        explanation.push("--wps a --uptime čtou doplňující informace z beaconů, nezahajují útok.");
      break;
    case "john":
      program = "john";
      add(`--format=${s("format")}`);
      if (action === "audit") add(`--wordlist=${s("wordlist")}`, `--max-run-time=${s("seconds")}`);
      else add("--show");
      if (advanced) add(`--verbosity=${expert ? "5" : "4"}`);
      add(s("file"));
      explanation.push(
        action === "audit"
          ? "Slovníkový audit pouze vlastních hashů; --max-run-time omezuje čas. Výsledky se zapisují do john.pot a může vzniknout john.log."
          : "--show čte již nalezené výsledky z john.pot; neprovádí nový audit.",
        "--format používá vybraný formát Kali Jumbo; Pokročilý/Expert mění podrobnost na 4/5. Audit může zatížit CPU.",
      );
      break;
    case "hashcat":
      program = "hashcat";
      add("-m", s("format"));
      if (action === "audit") {
        add("-a", "0", "-w", "1", "-D", s("device"), `--runtime=${s("seconds")}`);
        if (advanced) add("--status", "--status-timer", "10");
        if (expert) add("--status-json");
        add(s("file"), s("wordlist"));
      } else {
        add("--show");
        if (advanced) add(`--outfile-format=${expert ? "1,2,3" : "1,2"}`);
        add(s("file"));
      }
      explanation.push(
        action === "audit"
          ? "-m vybírá typ hashe, -a 0 slovník, -w 1 nízké zatížení; -D vybírá CPU/GPU a --runtime omezuje čas. Zapisuje potfile; zařízení se přesto zatěžuje."
          : "--show čte potfile bez nového auditu. Pokročilý vypíše hash a heslo (1,2); Expert i hex hesla (1,2,3). Výstup může být citlivý.",
      );
      if (advanced && action === "audit")
        explanation.push("--status-timer 10 zobrazuje stav každých 10s.");
      if (expert && action === "audit")
        explanation.push("--status-json přepíná diagnostický stav do JSON bez vyšší zátěže.");
      break;
    case "sqlmap":
      program = "sqlmap";
      add(
        "-u",
        s("url"),
        "-p",
        s("parameter"),
        "--risk=1",
        "--level=1",
        "--technique=B",
        "--threads=1",
        `--delay=${s("delay")}`,
        "--timeout=10",
        "--retries=0",
      );
      if (advanced) add("--parse-errors");
      if (expert) add("-v", "3");
      explanation.push(
        "-p omezuje kontrolu na existující query parametr; risk/level 1, pouze boolean testy B, jedno vlákno, prodleva a žádné opakování. Nezapíná dump, mazání, OS shell ani --batch; otázky zůstávají interaktivní.",
        "Testovací HTTP požadavky mohou ovlivnit aplikaci i na risk=1; není to záruka neškodnosti. SQLmap může ukládat své lokální výsledky.",
      );
      if (advanced) explanation.push("--parse-errors čte databázové chyby z odpovědí.");
      if (expert)
        explanation.push("-v 3 zobrazuje payloady pro diagnostiku, nemění hloubku testu.");
      break;
    case "gobuster":
      program = "gobuster";
      add(
        action,
        action === "dns" ? "--domain" : "-u",
        action === "dns" ? s("host") : s("url"),
        "-w",
        s("wordlist"),
        "-t",
        s("threads"),
        "--delay",
        `${s("delay")}s`,
      );
      if (action !== "dns") add("--timeout", "10s");
      if (advanced) add("--no-progress");
      if (expert) add("--debug");
      explanation.push(
        "dir testuje HTTP cesty, dns subdomény, vhost mění Host hlavičku. Vhost očekává celé názvy v slovníku; --append-domain se nezapíná.",
        "1–4 vlákna a prodleva omezují provoz; velikost slovníku určuje celkový rozsah. DNS vyžaduje funkční laboratorní resolver.",
      );
      if (advanced) explanation.push("--no-progress vypne průběžný počítač pro čitelný výpis.");
      if (expert)
        explanation.push("--debug zobrazí podrobnější diagnostické výsledky (Gobuster 3.8+).");
      break;
    case "nikto": {
      program = "nikto";
      const target = new URL(s("url"));
      if (values["tls"]) target.protocol = "https:";
      add(
        "-h",
        target.href,
        "-Tuning",
        "23",
        "-Pause",
        s("pause"),
        "-maxtime",
        `${s("seconds")}s`,
        "-timeout",
        "10",
        "-nointeractive",
      );
      if (advanced) add("-Display", expert ? "1234" : "1");
      explanation.push(
        "HTTPS URL zapíná TLS; přepínač -ssl není potřeba. Tuning 23 omezuje kategorie na konfiguraci/defaultní soubory a informace; stále posílá testovací požadavky.",
        "-Pause, -maxtime a -timeout omezují tempo/čas. -nointeractive vypíná klávesové ovládání, nikoli bezpečnostní schválení.",
      );
      if (advanced)
        explanation.push(
          expert
            ? "Display 1234 uvádí přesměrování, cookies, OK odpovědi a URL s autentizací."
            : "Display 1 uvádí přesměrování.",
        );
      break;
    }
  }
  if (type === "shell") content = [program, ...args.map(quotePosix)].join(" ");
  return { type, content, explanation, warning };
}
