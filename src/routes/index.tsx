import { createFileRoute } from "@tanstack/react-router";
import { CommandWorkspace } from "@/components/command-workspace";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "KaliCmd — Bash příkazy s Claudem" },
    { name: "description", content: "Vytvářejte a vysvětlujte příkazy pro Kali Linux, Nmap, hashcat a další bezpečnostní nástroje s AI Claude." },
    { property: "og:title", content: "KaliCmd — Bash příkazy s Claudem" },
    { property: "og:description", content: "Váš AI parťák pro terminál a autorizované bezpečnostní testování." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: CommandWorkspace,
});

