import { describe, expect, it } from "vitest";
import { toolCatalog, type ToolId } from "@/lib/tool-catalog";
import { buildParameterCommand, quotePosix } from "@/lib/parameter-command-builder";
import {
  getParameterActions,
  getParameterDefaults,
  parameterLevels,
} from "@/lib/tool-parameter-templates";

function generate(
  tool: ToolId,
  action: string,
  level = "beginner",
  overrides: Record<string, string | boolean> = {},
) {
  return buildParameterCommand({
    tool,
    action,
    level,
    values: { ...getParameterDefaults(tool, action), ...overrides },
  });
}
function content(
  tool: ToolId,
  action: string,
  level = "beginner",
  overrides: Record<string, string | boolean> = {},
) {
  const result = generate(tool, action, level, overrides);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.output.content;
}
const actions = toolCatalog.flatMap((tool) =>
  getParameterActions(tool.id).map((action) => ({ tool: tool.id, action: action.id })),
);
describe("parameter templates", () => {
  it.each(actions)("validates all three levels for $tool / $action", ({ tool, action }) => {
    const outputs = parameterLevels.map((level) => {
      const first = generate(tool, action, level.id);
      expect(first.ok).toBe(true);
      expect(generate(tool, action, level.id)).toEqual(first);
      if (!first.ok) throw new Error("Invalid default");
      expect(first.output.type).toBe(
        tool === "burp"
          ? "gui-instructions"
          : tool === "metasploit"
            ? "metasploit-console"
            : "shell",
      );
      expect(first.output.warning).toContain("výslovně autorizované");
      return first.output.content;
    });
    expect(new Set(outputs).size).toBe(3);
  });
  it("Nmap uses bounded connect scans and optional version/OS diagnostics", () => {
    expect(content("nmap", "scan")).toBe(
      "nmap '-sT' '-p' '22,80,443' '-T2' '--max-retries' '1' '--host-timeout' '60s' '192.168.1.1'",
    );
    expect(content("nmap", "scan", "advanced")).toContain("'--reason'");
    expect(content("nmap", "scan", "expert")).toContain("'--stats-every' '10s'");
    expect(content("nmap", "scan", "beginner", { versions: true, os: true })).toContain(
      "'-sV' '--version-light' '-O' '--osscan-limit' '--max-os-tries' '1'",
    );
    expect(content("nmap", "scan", "beginner", { scan: "discovery" })).not.toContain("'-p'");
    expect(generate("nmap", "scan", "beginner", { scan: "discovery", os: true }).ok).toBe(false);
  });
  it("TShark separates bounded capture and offline display filtering", () => {
    expect(content("wireshark", "capture")).toContain(
      "'-a' 'duration:60' '-c' '100' '-f' 'port 53'",
    );
    expect(content("wireshark", "read")).toContain("'-r' 'capture.pcap' '-c' '100' '-Y' 'dns'");
    expect(content("wireshark", "read", "expert")).toContain("'-t' 'ad' '-V'");
  });
  it("Metasploit never selects or executes a module", () => {
    expect(content("metasploit", "search", "expert")).toBe(
      "search name:smb type:auxiliary rank:normal",
    );
    expect(content("metasploit", "info", "advanced")).toBe(
      "info -j auxiliary/scanner/smb/smb_version",
    );
    expect(content("metasploit", "info", "expert")).toBe(
      "info -d auxiliary/scanner/smb/smb_version",
    );
    expect(content("metasploit", "options", "expert")).toBe("show options advanced missing");
    for (const action of getParameterActions("metasploit"))
      for (const level of parameterLevels)
        expect(content("metasploit", action.id, level.id)).not.toMatch(/^(use|run|exploit|set)\b/m);
  });
  it("Burp changes actual GUI settings without sending Repeater", () => {
    expect(content("burp", "proxy", "beginner")).toContain("Intercept off");
    expect(content("burp", "proxy", "advanced")).toContain("Show only in-scope items");
    expect(content("burp", "proxy", "expert")).toContain("Filter by MIME type: HTML");
    expect(content("burp", "repeater", "expert")).toContain("Follow redirects: Never");
    expect(content("burp", "repeater", "expert")).toContain("HTTP/1");
  });
  it("Aircrack suite only reads captures or passively observes a fixed channel", () => {
    expect(content("aircrack-ng", "monitor", "expert")).toBe(
      "airodump-ng '--channel' '6' '--manufacturer' '--wps' '--uptime' 'wlan0mon'",
    );
    expect(content("aircrack-ng", "read")).toBe("airodump-ng '-r' 'capture.cap'");
  });
  it("John caps audit runtime and changes verbosity rather than attack intensity", () => {
    expect(content("john", "audit", "expert")).toBe(
      "john '--format=raw-md5' '--wordlist=wordlist.txt' '--max-run-time=60' '--verbosity=5' 'hashes.txt'",
    );
    expect(content("john", "show")).toContain("'--show'");
  });
  it("Hashcat caps workload and runtime, with JSON status at expert level", () => {
    expect(content("hashcat", "audit", "expert")).toContain(
      "'-a' '0' '-w' '1' '-D' '1' '--runtime=60' '--status' '--status-timer' '10' '--status-json'",
    );
    expect(content("hashcat", "show", "expert")).toContain("'--outfile-format=1,2,3'");
  });
  it("SQLmap only tests the supplied query parameter conservatively", () => {
    expect(content("sqlmap", "check", "expert")).toContain(
      "'-p' 'id' '--risk=1' '--level=1' '--technique=B' '--threads=1' '--delay=2' '--timeout=10' '--retries=0' '--parse-errors' '-v' '3'",
    );
    expect(generate("sqlmap", "check", "beginner", { parameter: "missing" }).ok).toBe(false);
  });
  it("Gobuster limits all modes and uses the supported domain option", () => {
    expect(content("gobuster", "dns", "expert")).toBe(
      "gobuster 'dns' '--domain' 'example.test' '-w' 'wordlist.txt' '-t' '1' '--delay' '2s' '--no-progress' '--debug'",
    );
    expect(content("gobuster", "vhost")).not.toContain("--append-domain");
    expect(content("gobuster", "dir")).toContain("'--timeout' '10s'");
  });
  it("Nikto restricts tuning and time while levels change displayed diagnostics", () => {
    expect(content("nikto", "check", "expert", { tls: true })).toBe(
      "nikto '-h' 'https://127.0.0.1/' '-Tuning' '23' '-Pause' '2' '-maxtime' '60s' '-timeout' '10' '-nointeractive' '-Display' '1234'",
    );
  });
  it.each(actions)("never enables dangerous flags for $tool / $action", ({ tool, action }) => {
    for (const level of parameterLevels)
      expect(content(tool, action, level.id)).not.toMatch(
        /--(?:dump|os-shell|os-pwn|batch|force|rules)|--deauth|aireplay|'-A'|'-T[345]'/,
      );
  });
});
describe("input validation and injection resistance", () => {
  const payloads = [
    ";touch evil",
    "&&id",
    "|id",
    "$(id)",
    "`id`",
    "\nid",
    '"id"',
    "'id'",
    "\rtest",
    "\\test",
    "\u0000",
  ];
  it.each(actions)(
    "rejects injections in every free field of $tool / $action",
    ({ tool, action }) => {
      for (const field of getParameterActions(tool).find((a) => a.id === action)?.fields ?? []) {
        if (field.kind === "boolean" || field.kind === "select") continue;
        for (const payload of payloads)
          expect(
            generate(tool, action, "beginner", { [field.id]: String(field.default) + payload }).ok,
          ).toBe(false);
      }
    },
  );
  it.each([
    "999.1.1.1",
    "192.168.1.1/33",
    "192.168.1.1/-1",
    "192.168.1.1/24/1",
    "evil host",
    "-bad.test",
    "2001:db8::1/129",
    "1.2.3",
    "host.test/24",
  ])("rejects invalid host %s", (host) =>
    expect(generate("nmap", "scan", "beginner", { host }).ok).toBe(false),
  );
  it.each(["192.168.1.0/24", "192.168.1.1", "lab.example.test", "::1", "2001:db8::/120"])(
    "accepts valid Nmap host %s",
    (host) => expect(generate("nmap", "scan", "beginner", { host }).ok).toBe(true),
  );
  it("uses IPv6 scan mode and rejects unsupported IPv6 OS detection", () => {
    expect(content("nmap", "scan", "beginner", { host: "::1" })).toContain("'-6'");
    expect(generate("nmap", "scan", "beginner", { host: "::1", os: true }).ok).toBe(false);
  });
  it.each(["0", "65536", "100-80", "80,,443", "-p-", "80 443"])(
    "rejects invalid ports %s",
    (ports) => expect(generate("nmap", "scan", "beginner", { ports }).ok).toBe(false),
  );
  it.each([
    "ftp://127.0.0.1",
    "http://user:pass@lab.test",
    "http://127.0.0.1:65536",
    "http://lab.test/../x",
    "http://lab.test/%2e%2e/x",
    "http://999.1.1.1",
    "http://lab.test/#x",
    "http://127.1",
    "http://lab.test:0",
  ])("rejects unsafe URL %s", (url) =>
    expect(generate("burp", "proxy", "beginner", { url }).ok).toBe(false),
  );
  it.each(["../hashes.txt", "/tmp/../hashes.txt", "a/../../b", "-option", "a//b", "./hashes.txt"])(
    "rejects unsafe path %s",
    (file) => expect(generate("john", "show", "beginner", { file }).ok).toBe(false),
  );
  it("supports safely quoted absolute paths and interior spaces", () => {
    expect(content("john", "show", "beginner", { file: "/home/kali/my hashes.txt" })).toContain(
      "'/home/kali/my hashes.txt'",
    );
    expect(quotePosix("a'b")).toBe("'a'\\''b'");
  });
  it("supports only explicitly bounded filter grammars", () => {
    expect(
      generate("wireshark", "capture", "beginner", { filter: "tcp and dst port 443" }).ok,
    ).toBe(true);
    expect(
      generate("wireshark", "read", "beginner", {
        filter: "ip.addr == 192.168.1.1 and tcp.port == 443",
      }).ok,
    ).toBe(true);
    expect(generate("wireshark", "read", "beginner", { filter: "dns or tls" }).ok).toBe(true);
    expect(generate("wireshark", "capture", "beginner", { filter: "tcp[0] == 0" }).ok).toBe(false);
    expect(generate("wireshark", "read", "beginner", { filter: "tcp.port == 65536" }).ok).toBe(
      false,
    );
  });
  it("rejects invalid selections, types, fields, tool/actions/levels and limits", () => {
    expect(generate("john", "audit", "beginner", { seconds: "301" }).ok).toBe(false);
    expect(generate("hashcat", "audit", "beginner", { device: "9" }).ok).toBe(false);
    expect(generate("nmap", "scan", "beginner", { os: "true" }).ok).toBe(false);
    expect(generate("nmap", "scan", "beginner", { raw: "-A" }).ok).toBe(false);
    expect(generate("nmap", "missing").ok).toBe(false);
    expect(generate("nmap", "scan", "missing").ok).toBe(false);
    expect(
      buildParameterCommand({ tool: "evil", action: "scan", level: "beginner", values: {} }).ok,
    ).toBe(false);
    expect(generate("gobuster", "dns", "beginner", { host: "192.168.1.1" }).ok).toBe(false);
    expect(generate("gobuster", "dns", "beginner", { host: "192.168.1.0/24" }).ok).toBe(false);
    expect(generate("metasploit", "info", "beginner", { module: "auxiliary/../evil" }).ok).toBe(
      false,
    );
  });
});
describe("Nmap CIDR scope guard", () => {
  it.each([
    "192.168.1.17/24",
    "192.168.1.17/25",
    "192.168.1.17/32",
    "2001:db8::17/120",
    "2001:db8::17/121",
    "2001:db8::17/128",
    "192.168.1.17",
    "2001:db8::17",
    "lab.example.test",
  ])("preserves the exact allowed target %s at every level and scan type", (host) => {
    for (const level of parameterLevels)
      for (const scan of ["connect", "discovery"])
        expect(content("nmap", "scan", level.id, { host, scan }).endsWith(quotePosix(host))).toBe(
          true,
        );
  });
  it.each([
    "192.168.1.17/0",
    "192.168.1.17/16",
    "192.168.1.17/23",
    "192.168.1.17/119",
    "192.168.1.17/33",
    "192.168.1.17/-1",
    "192.168.1.17/24.5",
    "192.168.1.17/",
    "2001:db8::17/0",
    "2001:db8::17/16",
    "2001:db8::17/24",
    "2001:db8::17/119",
    "2001:db8::17/129",
    "2001:db8::17/-1",
    "2001:db8::17/120.5",
    "2001:db8::17/",
    "2001:db8:::17/120",
    "999.168.1.17/24",
    "lab.example.test/24",
  ])("rejects %s with explicit allowed ranges, without assembling output", (host) => {
    for (const level of parameterLevels) {
      const result = generate("nmap", "scan", level.id, { host });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Unsafe scope accepted");
      expect(result.errors["host"]).toContain("IPv4 pouze /24–/32, IPv6 pouze /120–/128");
      expect(result).not.toHaveProperty("output");
    }
  });
  it.each(
    actions.flatMap(({ tool, action }) =>
      tool === "nmap"
        ? []
        : (getParameterActions(tool).find((a) => a.id === action)?.fields ?? [])
            .filter((field) => ["host", "capture-filter", "display-filter"].includes(field.kind))
            .map((field) => ({ tool, action, field })),
    ),
  )("does not permit CIDR in address fields for $tool / $action", ({ tool, action, field }) => {
    for (const host of ["192.168.1.0/24", "2001:db8::/120"]) {
      const value =
        field.kind === "capture-filter"
          ? `host ${host}`
          : field.kind === "display-filter"
            ? `ip.addr == ${host}`
            : host;
      expect(generate(tool, action, "beginner", { [field.id]: value }).ok).toBe(false);
    }
  });
});
