import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTools from "./tools/list-tools";
import getTool from "./tools/get-tool";

// Vite inlines the stable ref; the published SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "kalicmd",
  title: "Kalicmd",
  version: "1.0.0",
  instructions: "Český katalog (vyžaduje přihlášení účtem KaliCmd) TOP 10 nástrojů Kali Linuxu pro vlastní laboratorní systémy a autorizované testování. Rozlišujte shell, GUI a konzoli Metasploit. Nástroje pouze čtou katalog; nic nespouštějí, negenerují přes AI a nemají přístup k rozhovorům ani uloženým skriptům.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTools, getTool],
});