import { describe, expect, it } from "vitest";
import { briefDefaults, buildAiBrief } from "@/lib/ai-brief";
import { buildParameterCommand } from "@/lib/parameter-command-builder";
import { getParameterDefaults } from "@/lib/tool-parameter-templates";

describe("AI brief form", () => {
  it("builds a structured message with the lab target", () => {
    const r = buildAiBrief({ ...briefDefaults, goal: "zjisti otevřené porty", target: "192.168.56.101" }, "nmap");
    expect(r.ok && r.message).toContain("Cíl: 192.168.56.101");
    expect(r.ok && r.mode).toBe("command");
  });
  it("switches to script mode for the script output", () => {
    const r = buildAiBrief({ ...briefDefaults, goal: "zjisti otevřené porty", output: "script" }, "hydra");
    expect(r.ok && r.mode).toBe("script");
  });
  it("rejects targets with shell characters and wider CIDR ranges", () => {
    expect(buildAiBrief({ ...briefDefaults, goal: "test cíle", target: "1.2.3.4;id" }, "nmap").ok).toBe(false);
    expect(buildAiBrief({ ...briefDefaults, goal: "test cíle", target: "10.0.0.0/8" }, "nmap").ok).toBe(false);
  });
  it("requires a goal and a catalog tool", () => {
    expect(buildAiBrief({ ...briefDefaults, goal: "" }, "nmap").ok).toBe(false);
    expect(buildAiBrief({ ...briefDefaults, goal: "zjisti porty" }, "unknown").ok).toBe(false);
  });
});

describe("new tool parameter templates", () => {
  it("rejects a minimum password length above the maximum", () => {
    const r = buildParameterCommand({ tool: "hydra", action: "filter", level: "beginner", values: { ...getParameterDefaults("hydra", "filter"), min: "20", max: "10" } });
    expect(r.ok).toBe(false);
  });
  it("builds a bounded dirb scan against the lab target", () => {
    const r = buildParameterCommand({ tool: "dirb", action: "scan", level: "beginner", values: getParameterDefaults("dirb", "scan") });
    expect(r.ok && r.output.content).toBe("dirb 'http://192.168.56.101/' '/usr/share/wordlists/dirb/common.txt' '-r' '-S' '-z' '500'");
  });
});
