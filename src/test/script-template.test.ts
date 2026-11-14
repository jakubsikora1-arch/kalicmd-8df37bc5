import { describe, expect, it } from "vitest";
import {
  createTemplateText,
  isScriptTemplate,
  parseScriptTemplate,
  suggestTemplateParams,
} from "@/lib/script-template-format";
import {
  renderScriptTemplate,
  templateFilename,
  templateWarnings,
} from "@/lib/script-template-render";
import {
  parseTemplateType,
  validateTemplateValue,
  type TemplateType,
} from "@/lib/script-template-validation";
import { extractBashScript } from "@/lib/bash-script";

const TPL = `#!/usr/bin/env bash
# kalicmd-template: v1
# kalicmd-param: TARGET | type=host | label=Cíl | required
# kalicmd-param: PORTS | type=ports | label=Porty | default=22,80,443
# kalicmd-param: MODE | type=enum:quick,full | label=Režim | default=quick
# kalicmd-end
set -euo pipefail
TARGET={{TARGET}}
PORTS={{PORTS}}
MODE={{MODE}}
nmap -sT -p "$PORTS" "$TARGET"
`;
const parse = (s: string) => parseScriptTemplate(s);
const tpl = () => {
  const r = parse(TPL);
  if (!r.ok) throw new Error(r.errors.join());
  return r.template;
};
const withBody = (header: string, body: string) =>
  `#!/bin/bash\n# kalicmd-template: v1\n${header}\n# kalicmd-end\n${body}\n`;

describe("parser", () => {
  it("parses a valid header", () => {
    const t = tpl();
    expect(t.params.map((p) => p.name)).toEqual(["TARGET", "PORTS", "MODE"]);
    expect(t.params[0]?.required).toBe(true);
  });
  it("treats legacy scripts as plain", () => {
    expect(isScriptTemplate("#!/bin/bash\necho hi\n")).toBe(false);
    expect(parse("#!/bin/bash\necho\n").ok).toBe(false);
  });
  it("requires end marker", () =>
    expect(parse(TPL.replace("# kalicmd-end\n", ""))).toMatchObject({ ok: false }));
  it.each([
    ["duplicate", "# kalicmd-param: A | type=text\n# kalicmd-param: A | type=text", "A={{A}}"],
    ["reserved PATH", "# kalicmd-param: PATH | type=path", "PATH={{PATH}}"],
    ["reserved LD_", "# kalicmd-param: LD_PRELOAD | type=path", "LD_PRELOAD={{LD_PRELOAD}}"],
    ["unknown type", "# kalicmd-param: A | type=shell", "A={{A}}"],
    ["undeclared placeholder", "# kalicmd-param: A | type=text", "A={{A}}\nB={{B}}"],
    ["unused declaration", "# kalicmd-param: A | type=text", "echo"],
    ["inside quotes", "# kalicmd-param: A | type=text", 'A="{{A}}"'],
    ["inside command", "# kalicmd-param: A | type=text", "A={{A}}\necho {{A}}"],
    ["in heredoc", "# kalicmd-param: A | type=text", "cat <<EOF\nA={{A}}\nEOF"],
    ["bad default", "# kalicmd-param: A | type=host | default=a;b", "A={{A}}"],
    ["mismatched name", "# kalicmd-param: A | type=text", "B={{A}}"],
  ])("rejects %s", (_n, header, body) => expect(parse(withBody(header, body)).ok).toBe(false));
  it("limits params and length", () => {
    const names = Array.from({ length: 21 }, (_, i) => `P${i}`);
    expect(
      parse(
        withBody(
          names.map((n) => `# kalicmd-param: ${n} | type=text`).join("\n"),
          names.map((n) => `${n}={{${n}}}`).join("\n"),
        ),
      ).ok,
    ).toBe(false);
    expect(parse(TPL + "#".repeat(100_001)).ok).toBe(false);
  });
});

describe("validation", () => {
  const T = (r: string) => parseTemplateType(r) as TemplateType;
  it.each([
    ["host", "10.0.0.5"],
    ["host", "lab.local"],
    ["cidr", "10.0.0.0/24"],
    ["url", "https://lab.local/app"],
    ["port", "443"],
    ["ports", "1-1024,8080"],
    ["int:1..10", "5"],
    ["path", "./out/scan.txt"],
    ["path", "/usr/share/wordlists/rockyou.txt"],
    ["iface", "wlan0"],
    ["enum:a,b", "b"],
    ["text", "Lab sken 1"],
  ])("accepts %s %s", (t, v) => expect(validateTemplateValue(T(t), v)).toBeNull());
  const injections = [
    "a;id",
    "a && id",
    "a|id",
    "$(id)",
    "`id`",
    "a\nid",
    "a'b",
    'a"b',
    "a\u0000b",
    "<x",
    "a(b)",
  ];
  it.each(injections)("rejects injection %j in every type", (v) => {
    for (const t of ["host", "url", "path", "text", "iface"])
      expect(validateTemplateValue(T(t), v)).not.toBeNull();
  });
  it.each([
    ["host", "300.1.1.1"],
    ["cidr", "10.0.0.0/16"],
    ["cidr", "10.0.0.1"],
    ["url", "http://u:p@lab"],
    ["url", "ftp://lab"],
    ["port", "70000"],
    ["ports", "0"],
    ["int:1..10", "11"],
    ["path", "../etc/passwd"],
    ["path", "a/../b"],
    ["enum:a,b", "c"],
    ["text", "-rf"],
    ["host", "-oG"],
    ["text", "x".repeat(121)],
  ])("rejects %s %j", (t, v) => expect(validateTemplateValue(T(t), v)).not.toBeNull());
  it("rejects bad type specs", () => {
    expect(parseTemplateType("int:5..1")).toBeNull();
    expect(parseTemplateType("enum:a;b")).toBeNull();
    expect(parseTemplateType("eval")).toBeNull();
  });
});

describe("render", () => {
  it("is deterministic and replaces only placeholder lines", () => {
    const a = renderScriptTemplate(tpl(), { TARGET: "10.0.0.5" }, "Můj sken");
    const b = renderScriptTemplate(tpl(), { TARGET: "10.0.0.5" }, "Můj sken");
    expect(a).toEqual(b);
    if (!a.ok) throw new Error();
    expect(a.script).toBe(
      "#!/usr/bin/env bash\n# Vygenerováno KaliCmd ze šablony „Můj sken“\nset -euo pipefail\nTARGET='10.0.0.5'\nPORTS='22,80,443'\nMODE='quick'\nnmap -sT -p \"$PORTS\" \"$TARGET\"\n",
    );
    expect(a.script).not.toContain("kalicmd-param");
    expect(extractBashScript("```bash\n" + a.script + "```")).toBe(a.script);
    expect(a.filename).toBe("kalicmd-muj-sken.sh");
  });
  it("requires required fields and rejects invalid values", () => {
    expect(renderScriptTemplate(tpl(), {}, "x")).toEqual({
      ok: false,
      errors: { TARGET: "Toto pole je povinné." },
    });
    const r = renderScriptTemplate(tpl(), { TARGET: "x;rm -rf /" }, "x");
    expect(r.ok).toBe(false);
  });
  it("quotes single quotes safely when the type allows them", () => {
    // no type allows quotes, so quoting is defence in depth; verify the helper output shape
    const r = renderScriptTemplate(tpl(), { TARGET: "lab.local" }, "'; id");
    if (!r.ok) throw new Error();
    expect(r.script).toContain("TARGET='lab.local'");
    expect(r.script.split("\n")[1]).not.toContain("'");
  });
  it("falls back to default filename", () =>
    expect(templateFilename("ššš!!!")).toBe("kalicmd-sss.sh"));
  it("falls back to default filename for empty slug", () =>
    expect(templateFilename("!!!")).toBe("kalicmd-script.sh"));
  it("warns about risky usage", () => {
    const r = parse(withBody("# kalicmd-param: A | type=text", 'A={{A}}\neval $A\nbash -c "$A"'));
    if (!r.ok) throw new Error();
    expect(templateWarnings(r.template).length).toBe(3);
    expect(templateWarnings(tpl())).toEqual([]);
  });
});

describe("creating templates", () => {
  const SRC =
    '#!/usr/bin/env bash\nset -euo pipefail\nTARGET="${1:-10.0.0.5}"\nPORTS=22,80\nOUT="$(date)"\nnmap -p "$PORTS" "$TARGET"\n';
  it("suggests assignments with defaults", () => {
    const s = suggestTemplateParams(SRC);
    expect(s.map((x) => [x.name, x.defaultValue, x.type.name])).toEqual([
      ["TARGET", "10.0.0.5", "host"],
      ["PORTS", "22,80", "ports"],
      ["OUT", "", "path"],
    ]);
  });
  it("round-trips through the parser", () => {
    const s = suggestTemplateParams(SRC);
    const r = createTemplateText(
      SRC,
      s.slice(0, 2).map((x) => ({ ...x, label: x.name, required: false })),
    );
    if (!r.ok) throw new Error(r.errors.join());
    const p = parseScriptTemplate(r.text);
    expect(p.ok && p.template.params.map((x) => [x.name, x.defaultValue])).toEqual([
      ["TARGET", "10.0.0.5"],
      ["PORTS", "22,80"],
    ]);
    expect(r.text).toContain('OUT="$(date)"');
  });
  it("rejects bad labels and existing templates", () => {
    const s = suggestTemplateParams(SRC);
    expect(createTemplateText(SRC, [{ ...s[0]!, label: "a|b", required: false }]).ok).toBe(false);
    expect(createTemplateText(TPL, []).ok).toBe(false);
  });
});
