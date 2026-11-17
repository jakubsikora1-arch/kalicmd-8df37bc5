import { z } from "zod";
import { findTool } from "./tool-catalog";
import type { GenerationMode } from "./chat-request";
import { validHost, validUrl } from "./param-validators";

// Structured AI brief: browser-safe validation and deterministic message text.
// The result is sent as an ordinary chat message; the server still validates tool scope.
export const briefTempos = [
  { id: "quiet", label: "Tichý a pomalý", text: "co nejtišší a nejpomalejší, minimum provozu" },
  { id: "balanced", label: "Vyvážený", text: "vyvážené tempo a rozumné limity" },
  { id: "fast", label: "Rychlý", text: "rychlý běh s krátkými limity; upozorni na vyšší hlučnost" },
] as const;
export const briefOutputs = [
  { id: "command", label: "Jeden příkaz", mode: "command", text: "jeden hotový příkaz" },
  { id: "variants", label: "Příkaz + varianty", mode: "command", text: "hlavní příkaz a 1–2 varianty" },
  { id: "script", label: "Skript .sh", mode: "script", text: "samostatný Bash skript" },
] as const;

const schema = z.object({
  goal: z.string(),
  target: z.string(),
  tempo: z.enum(["quiet", "balanced", "fast"]),
  output: z.enum(["command", "variants", "script"]),
  constraints: z.string(),
});
export type AiBriefValues = z.infer<typeof schema>;
export const briefDefaults: AiBriefValues = { goal: "", target: "", tempo: "balanced", output: "command", constraints: "" };

const normalize = (s: string) => s.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim();

export function buildAiBrief(input: unknown, toolId: unknown):
  { ok: true; message: string; mode: GenerationMode } | { ok: false; errors: Record<string, string> } {
  const parsed = schema.safeParse(input);
  const tool = findTool(toolId);
  if (!parsed.success || !tool) return { ok: false, errors: { form: "Neplatné zadání formuláře." } };
  const goal = normalize(parsed.data.goal);
  const target = normalize(parsed.data.target);
  const constraints = normalize(parsed.data.constraints);
  const errors: Record<string, string> = {};
  if (goal.length < 5) errors["goal"] = "Popiš úkol alespoň pěti znaky.";
  else if (goal.length > 600) errors["goal"] = "Úkol může mít nejvýše 600 znaků.";
  if (target && !(validHost(target, true) || validUrl(target)))
    errors["target"] = "Zadej IP, hostname, CIDR (IPv4 /24–/32) nebo HTTP/HTTPS URL bez shell znaků.";
  if (constraints.length > 300) errors["constraints"] = "Omezení mohou mít nejvýše 300 znaků.";
  if (Object.keys(errors).length) return { ok: false, errors };
  const tempo = briefTempos.find(t => t.id === parsed.data.tempo)!;
  const output = briefOutputs.find(o => o.id === parsed.data.output)!;
  const lines = [
    `Úkol: ${goal}`,
    `Cíl: ${target || "neuveden — použij zástupný symbol <CIL>"} (vlastní laboratoř nebo autorizovaný test)`,
    `Tempo: ${tempo.text}`,
    `Požadovaný výstup: ${output.text}`,
  ];
  if (constraints) lines.push(`Další omezení: ${constraints}`);
  return { ok: true, message: lines.join("\n"), mode: output.mode };
}
