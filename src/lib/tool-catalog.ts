import { Crosshair, Fingerprint, Network, Waves, Globe, Wifi, KeyRound, Database, Search, ShieldCheck } from "lucide-react";

export const catalogTitle = "TOP 10 nástrojů pro Kali Linux";

type CommandKind = "shell" | "gui" | "console";
type CatalogCommand = { title: string; command: string; description: string; type: CommandKind };
const command = (title: string, value: string, description: string, type: CommandKind = "shell"): CatalogCommand => ({ title, command: value, description, type });

export const toolCatalog = [
  {
    rank: 1, id: "nmap", name: "Nmap", icon: Network, category: "Síťové skenování",
    info: "Nástroj pro mapování sítí, vyhledávání aktivních zařízení, otevřených portů, běžících služeb a detekci operačních systémů. Adresy 192.168.1.1 a 192.168.1.0/24 v příkladech označují vlastní laboratorní zařízení a síť.",
    control: "Terminál (CLI), příkaz nmap.",
    commands: [
      command("Základní sken", "nmap 192.168.1.1", "Základní sken vlastního laboratorního zařízení."),
      command("Aktivní zařízení", "nmap -sn 192.168.1.0/24", "Vyhledání aktivních zařízení ve vlastní laboratorní síti bez skenování portů."),
      command("Verze služeb", "nmap -sV 192.168.1.1", "Detekce verzí běžících služeb laboratorního zařízení."),
      command("Operační systém", "nmap -O 192.168.1.1", "Pokus o identifikaci operačního systému; vyžaduje oprávnění pro práci se surovými pakety."),
      command("Všechny TCP porty", "nmap -p- 192.168.1.1", "Sken TCP portů 1–65535 laboratorního zařízení."),
    ],
    example: "sudo nmap -sV -O 192.168.1.1", exampleType: "shell",
    exampleDescription: "Provede detekci služeb a pokusí se určit operační systém vlastního testovaného zařízení.",
  },
  {
    rank: 2, id: "wireshark", name: "Wireshark / TShark", icon: Waves, category: "Analýza síťového provozu",
    info: "Analyzátor síťového provozu pro zachytávání a rozbor paketů a komunikace využívající protokoly TCP/IP, DNS, HTTP, TLS a další. Příklady pracují pouze s vlastním laboratorním rozhraním eth0 a vlastním záznamem provozu.",
    control: "Wireshark nabízí grafické rozhraní (GUI); TShark umožňuje ovládání z terminálu (CLI). Zachytávání vyžaduje oprávnění k rozhraní.",
    commands: [
      command("Grafické rozhraní", "wireshark", "Spuštění grafického rozhraní Wireshark."),
      command("Síťová rozhraní", "tshark -D", "Výpis dostupných síťových rozhraní."),
      command("Zachytávání provozu", "tshark -i eth0", "Zachytávání vlastního laboratorního provozu na rozhraní eth0."),
      command("Čtení PCAP", "tshark -r capture.pcap", "Analýza vlastního uloženého PCAP souboru."),
      command("DNS provoz", 'tshark -i eth0 -f "port 53"', "Zachytávání TCP a UDP provozu na portu 53; nezahrnuje DNS přes HTTPS ani TLS."),
    ],
    example: 'sudo tshark -i eth0 -f "port 53"', exampleType: "shell",
    exampleDescription: "Zobrazuje běžnou nešifrovanou DNS komunikaci na vlastním laboratorním rozhraní eth0.",
  },
  {
    rank: 3, id: "metasploit", name: "Metasploit Framework", icon: Crosshair, category: "Penetrační testování",
    info: "Framework pro penetrační testování. Obsahuje moduly pro ověřování známých zranitelností, pomocné nástroje, exploity a další funkce bezpečnostního testování. Zde uvedené funkce pouze zobrazují informace pro autorizované testování; nespouštějí exploit.",
    control: "Terminál – msfconsole. Po spuštění se používají příkazy vlastního prostředí Metasploit, nikoli Bash.",
    commands: [
      command("Spuštění frameworku", "msfconsole", "Spuštění konzole frameworku ze shellu."),
      command("Pomocné moduly", "search type:auxiliary", "Vyhledání pomocných modulů v konzoli Metasploit.", "console"),
      command("Moduly SMB", "search name:smb", "Vyhledávání modulů souvisejících s protokolem SMB.", "console"),
      command("Informace o modulu", "info auxiliary/scanner/smb/smb_version", "Zobrazení detailních informací o konkrétním modulu; původní zástupný název je nahrazen existujícím modulem.", "console"),
      command("Parametry modulu", "show options", "Zobrazení parametrů aktuálně vybraného modulu v konzoli Metasploit.", "console"),
    ],
    example: "msfconsole\nsearch name:smb", exampleType: "console",
    exampleDescription: "První řádek spustí konzoli ze shellu; druhý se zadává až v konzoli Metasploit a vyhledá moduly SMB.",
  },
  {
    rank: 4, id: "burp", name: "Burp Suite", icon: Globe, category: "Testování webových aplikací",
    info: "Platforma pro bezpečnostní testování webových aplikací. Umožňuje zachytávat, upravovat a analyzovat HTTP/HTTPS požadavky a odpovědi vlastní aplikace nebo aplikace zahrnuté do autorizovaného testu.",
    control: "Primárně grafické rozhraní (GUI). Základem je Proxy, přes kterou vede komunikace testovaného prohlížeče.",
    commands: [
      command("Spuštění aplikace", "burpsuite", "Spuštění aplikace ze shellu."),
      command("Nápověda ke spuštění", "burpsuite --help", "Zobrazení dostupné nápovědy ke spuštění; podpora závisí na sestavení spouštěče."),
      command("Verze aplikace", "Help → About", "Zobrazení verze v GUI; přepínač burpsuite --version není spolehlivě podporován.", "gui"),
      command("Zachytávání požadavků", "Proxy → Intercept", "Funkce GUI pro zachytávání HTTP požadavků vlastní testovací aplikace.", "gui"),
      command("Opakované odeslání", "Repeater → Send", "Funkce GUI pro opakované odesílání upravených požadavků vlastní aplikaci.", "gui"),
    ],
    example: "Burp Suite → Proxy → Intercept\nProxy testovacího prohlížeče: 127.0.0.1:8080", exampleType: "gui",
    exampleDescription: "Příklad nastavení GUI pro zachytávání požadavků vlastní webové aplikace; nejde o příkaz shellu.",
  },
  {
    rank: 5, id: "aircrack-ng", name: "Aircrack-ng", icon: Wifi, category: "Bezpečnost Wi-Fi",
    info: "Sada nástrojů pro bezpečnostní audit Wi-Fi sítí. Podporuje monitorování bezdrátového provozu, analýzu zachycených paketů a kontrolu zabezpečení WPA/WPA2. Příklady jsou určeny pouze pro vlastní zařízení a autorizovaný audit.",
    control: "Terminál (CLI). Pro monitorovací režim je potřeba kompatibilní Wi-Fi adaptér.",
    commands: [
      command("Nápověda", "aircrack-ng --help", "Zobrazení nápovědy."),
      command("Bezdrátová rozhraní", "airmon-ng", "Výpis bezdrátových rozhraní."),
      command("Kontrola procesů", "airmon-ng check", "Kontrola procesů, které mohou rušit monitorovací režim; neukončuje je."),
      command("Monitorování Wi-Fi", "airodump-ng wlan0mon", "Zobrazení sítí v dosahu na monitorovacím rozhraní při autorizovaném auditu."),
      command("Zachycený soubor", "aircrack-ng capture.cap", "Načte vlastní záznam a zobrazí dostupné sítě a data pro audit. Audit WPA/WPA2 hesel vyžaduje také slovník; samotný příkaz jej neprovádí."),
    ],
    example: "sudo airmon-ng start wlan0\nsudo airodump-ng wlan0mon", exampleType: "shell",
    exampleDescription: "Spustí monitorovací režim vlastního adaptéru a zobrazí sítě v dosahu v rámci autorizovaného auditu. Název monitorovacího rozhraní závisí na adaptéru a ovladači.",
  },
  {
    rank: 6, id: "john", name: "John the Ripper", icon: KeyRound, category: "Audit hesel",
    info: "Nástroj pro audit bezpečnosti hesel a kontrolu jejich odolnosti. Pracuje s kryptografickými hashi a podporuje různé formáty. Soubory v příkladech obsahují pouze vlastní testovací hashe a slovník.",
    control: "Terminál (CLI), příkaz john. Výpis formátů odpovídá rozšířené verzi Jumbo v Kali Linuxu.",
    commands: [
      command("Nápověda", "john", "Spuštění bez argumentů zobrazí přehled použití; --help není ve všech sestaveních podporován."),
      command("Formáty hashů", "john --list=formats", "Výpis podporovaných formátů hashů."),
      command("Benchmark", "john --test", "Benchmark výkonu."),
      command("Nalezená hesla", "john --show hashes.txt", "Zobrazení již nalezených hesel pro vlastní hashe z uložených výsledků."),
      command("Slovníkový audit", "john --wordlist=wordlist.txt hashes.txt", "Audit vlastních hashů pomocí zadaného slovníku."),
    ],
    example: "john --wordlist=wordlist.txt hashes.txt", exampleType: "shell",
    exampleDescription: "Otestuje vlastní testovací hashe pomocí slovníku hesel.",
  },
  {
    rank: 7, id: "hashcat", name: "Hashcat", icon: Fingerprint, category: "Audit hashů a hesel",
    info: "Nástroj pro obnovu hesel a audit jejich odolnosti. Využívá CPU nebo GPU a podporuje velké množství hashovacích algoritmů. Příklady pracují pouze s vlastními testovacími hashi a slovníkem.",
    control: "Terminál (CLI), příkaz hashcat.",
    commands: [
      command("Nápověda", "hashcat --help", "Zobrazení nápovědy."),
      command("Výpočetní zařízení", "hashcat -I", "Informace o dostupných výpočetních zařízeních."),
      command("Benchmark", "hashcat -b", "Výkonnostní benchmark."),
      command("Ukázkové hashe", "hashcat --example-hashes", "Ukázkové hashe a jejich formáty."),
      command("Slovníkový audit MD5", "hashcat -m 0 -a 0 hashes.txt wordlist.txt", "Slovníkový audit vlastních nesolených MD5 hashů."),
    ],
    example: "hashcat -m 0 -a 0 hashes.txt wordlist.txt", exampleType: "shell",
    exampleDescription: "Otestuje vlastní testovací MD5 hashe. Parametr -m 0 označuje nesolený MD5 a -a 0 slovníkový režim.",
  },
  {
    rank: 8, id: "sqlmap", name: "SQLmap", icon: Database, category: "Testování SQL Injection",
    info: "Automatizovaný nástroj pro detekci a ověřování SQL Injection zranitelností ve webových aplikacích. Podporuje různé databázové systémy. Všechny ukázky cílí na vlastní lokální testovací aplikaci.",
    control: "Terminál (CLI), příkaz sqlmap.",
    commands: [
      command("Nápověda", "sqlmap --help", "Zobrazení nápovědy."),
      command("Verze", "sqlmap --version", "Zjištění verze."),
      command("Test URL", 'sqlmap -u "http://127.0.0.1/test.php?id=1"', "Testování konkrétní URL vlastní lokální aplikace."),
      command("Neinteraktivní test", 'sqlmap -u "http://127.0.0.1/test.php?id=1" --batch', "Použití výchozích odpovědí na interaktivní otázky při autorizovaném testu."),
      command("Základní úroveň testu", 'sqlmap -u "http://127.0.0.1/test.php?id=1" --risk=1 --level=1', "Test s nejnižší úrovní rizika a testovací hloubky; neznamená nulové riziko změny dat."),
    ],
    example: 'sqlmap -u "http://127.0.0.1/test.php?id=1" --batch --risk=1 --level=1', exampleType: "shell",
    exampleDescription: "Ověřuje vlastní lokální testovací aplikaci na základní SQL Injection zranitelnosti.",
  },
  {
    rank: 9, id: "gobuster", name: "Gobuster", icon: Search, category: "Průzkum webu",
    info: "Nástroj pro vyhledávání skrytých adresářů, souborů, DNS subdomén a virtuálních hostů. Používá slovníky a HTTP požadavky. Příklady pracují s vlastním lokálním serverem a laboratorní doménou example.test.",
    control: "Terminál (CLI), příkaz gobuster.",
    commands: [
      command("Nápověda", "gobuster --help", "Zobrazení nápovědy."),
      command("Režim adresářů", "gobuster dir --help", "Nápověda režimu vyhledávání adresářů."),
      command("Adresáře a soubory", "gobuster dir -u http://127.0.0.1 -w wordlist.txt", "Hledání adresářů a souborů na vlastním lokálním webovém serveru."),
      command("DNS subdomény", "gobuster dns -d example.test -w subdomains.txt", "Vyhledávání subdomén vlastní laboratorní domény prostřednictvím laboratorního DNS."),
      command("Virtuální hosty", "gobuster vhost -u http://127.0.0.1 -w hosts.txt", "Vyhledávání virtuálních hostů vlastního serveru; slovník obsahuje úplné hodnoty hlavičky Host."),
    ],
    example: "gobuster dir -u http://127.0.0.1 -w wordlist.txt", exampleType: "shell",
    exampleDescription: "Vyhledá dostupné adresáře a soubory na vlastním lokálním testovacím webovém serveru.",
  },
  {
    rank: 10, id: "nikto", name: "Nikto", icon: ShieldCheck, category: "Bezpečnost webových serverů",
    info: "Open-source skener webových serverů. Hledá známé problémy v konfiguraci, zastaralé komponenty, nebezpečné soubory a potenciální zranitelnosti. Příklady kontrolují pouze vlastní lokální webový server.",
    control: "Terminál (CLI), příkaz nikto.",
    commands: [
      command("Nápověda", "nikto -Help", "Zobrazení nápovědy."),
      command("Verze", "nikto -Version", "Zjištění verze."),
      command("Kontrola HTTP", "nikto -h http://127.0.0.1", "Základní kontrola vlastního lokálního serveru."),
      command("Kontrola HTTPS", "nikto -h https://127.0.0.1", "Kontrola vlastního lokálního HTTPS serveru. Parametr -ssl není pro běžnou HTTPS URL nutný."),
      command("Uložení výsledků", "nikto -h http://127.0.0.1 -output report.txt", "Uložení výsledků kontroly vlastního serveru do souboru."),
    ],
    example: "nikto -h http://127.0.0.1 -output report.txt", exampleType: "shell",
    exampleDescription: "Provede kontrolu vlastního lokálního webového serveru a uloží výstup do reportu.",
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
