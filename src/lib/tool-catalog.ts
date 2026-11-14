import { Crosshair, Fingerprint, Network, Waves } from "lucide-react";

export const toolCatalog = [
  {
    id: "nmap", name: "Nmap", icon: Network, category: "PRŮZKUM SÍTĚ",
    info: "Nmap zjišťuje dostupné stroje, otevřené porty a služby v síti. Skenuj pouze vlastní zařízení nebo síť, ke které máš oprávnění.",
    commands: [
      { title: "Dostupné stroje", command: "nmap -sn 192.168.56.0/24", description: "Vyhledá aktivní stroje v laboratorní síti bez skenování portů." },
      { title: "Základní sken", command: "nmap 192.168.56.10", description: "Ověří nejběžnější TCP porty laboratorního stroje." },
      { title: "Verze služeb", command: "nmap -sV 192.168.56.10", description: "Zkusí určit službu a její verzi na otevřených portech." },
      { title: "Vybrané porty", command: "nmap -p 22,80,443 192.168.56.10", description: "Zkontroluje pouze SSH, HTTP a HTTPS." },
      { title: "Uložení výsledků", command: "nmap -sV -oA lab-scan 192.168.56.10", description: "Uloží výsledky v textovém, XML a grepovatelném formátu." },
    ],
  },
  {
    id: "hashcat", name: "hashcat", icon: Fingerprint, category: "AUDIT HESEL",
    info: "hashcat slouží k offline auditu vlastních heslových hashů. Typ hashe musí odpovídat režimu -m; níže je -m 1400 pro nesolený SHA-256. Používej pouze hashe, které smíš auditovat.",
    commands: [
      { title: "Podporované režimy", command: "hashcat --help", description: "Zobrazí možnosti a číselné režimy typů hashů." },
      { title: "Dostupná zařízení", command: "hashcat -I", description: "Vypíše výpočetní zařízení a jejich dostupnost." },
      { title: "Slovníkový audit", command: "hashcat -m 1400 -a 0 hashes.txt wordlist.txt", description: "Ověří vlastní SHA-256 hashe proti lokálnímu slovníku; výsledek ukládá do potfile." },
      { title: "Nalezená hesla", command: "hashcat -m 1400 hashes.txt --show", description: "Zobrazí již nalezená hesla z potfile. Výstup je citlivý." },
      { title: "Obnovení auditu", command: "hashcat --restore", description: "Pokračuje v přerušené výchozí relaci, pokud existuje její restore soubor." },
    ],
  },
  {
    id: "wireshark", name: "Wireshark", icon: Waves, category: "ANALÝZA PROVOZU",
    info: "Wireshark analyzuje síťové pakety; v terminálu používá svůj nástroj tshark. Zachycení může vyžadovat oprávnění k rozhraní. Provoz i uložené PCAP soubory mohou obsahovat citlivá data.",
    commands: [
      { title: "Síťová rozhraní", command: "tshark -D", description: "Vypíše rozhraní dostupná pro zachytávání." },
      { title: "Krátký záznam", command: "tshark -i eth0 -c 20", description: "Zachytí dvacet paketů na vlastním rozhraní eth0." },
      { title: "DNS dotazy", command: "tshark -i eth0 -f 'udp port 53' -Y 'dns.flags.response == 0'", description: "Zobrazuje běžné nešifrované DNS dotazy přes UDP; ukončíš Ctrl+C." },
      { title: "Uložení provozu", command: "tshark -i eth0 -a duration:30 -w capture.pcapng", description: "Zaznamená třicet sekund provozu do souboru." },
      { title: "Čtení záznamu", command: "tshark -r capture.pcapng -Y dns", description: "Z uloženého záznamu vypíše pakety protokolu DNS." },
    ],
  },
  {
    id: "metasploit", name: "Metasploit", icon: Crosshair, category: "BEZPEČNOSTNÍ TESTY",
    info: "Metasploit Framework spravuje moduly pro autorizované bezpečnostní testy. Následující Bash příkazy spouštějí msfconsole a pouze zobrazují nápovědu, moduly a nastavení; nespouštějí exploit.",
    commands: [
      { title: "Spuštění konzole", command: "msfconsole -q", description: "Otevře interaktivní konzoli bez úvodního banneru." },
      { title: "Nápověda", command: 'msfconsole -q -x "help; exit"', description: "Vypíše příkazy konzole a ukončí ji." },
      { title: "Vyhledání SSH modulů", command: 'msfconsole -q -x "search type:auxiliary ssh; exit"', description: "Vyhledá pomocné moduly související s SSH." },
      { title: "Informace o modulu", command: 'msfconsole -q -x "info auxiliary/scanner/ssh/ssh_version; exit"', description: "Zobrazí dokumentaci modulu pro identifikaci SSH verze." },
      { title: "Nastavení modulu", command: 'msfconsole -q -x "use auxiliary/scanner/ssh/ssh_version; show options; exit"', description: "Zobrazí potřebné parametry modulu, aniž by jej spustil." },
    ],
  },
] as const;

export type ToolId = (typeof toolCatalog)[number]["id"];
export type Tool = (typeof toolCatalog)[number];
export function findTool(id: unknown): Tool | undefined {
  return toolCatalog.find(tool => tool.id === id);
}
export function toolPrefix(tool?: Tool): string { return tool ? `[${tool.name}] ` : ""; }
export function scopedInput(value: string, tool?: Tool): string {
  const prefix = toolPrefix(tool);
  return !tool || value.startsWith(prefix) ? value : prefix + value.replace(/^\[[^\]]*\]\s*/, "");
}