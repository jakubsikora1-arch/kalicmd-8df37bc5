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
      command("Základní sken", "nmap 192.168.1.1", "Bez přepínačů skenuje 1000 nejběžnějších TCP portů vlastního laboratorního zařízení. S oprávněním pro surové pakety používá SYN sken, jinak TCP connect."),
      command("Aktivní zařízení", "nmap -sn 192.168.1.0/24", "-sn provede pouze zjištění dostupných zařízení, nikoli sken portů. /24 označuje síťový rozsah s 256 adresami vlastní laboratorní sítě."),
      command("Verze služeb", "nmap -sV 192.168.1.1", "-sV posílá sondy otevřeným portům pro určení služby a její verze na vlastním laboratorním zařízení."),
      command("Operační systém", "nmap -O 192.168.1.1", "-O zapne pokus o identifikaci operačního systému podle síťových otisků; vyžaduje oprávnění pro surové pakety. Výsledek nemusí být jednoznačný."),
      command("Všechny TCP porty", "nmap -p- 192.168.1.1", "-p- rozšíří výchozí výběr na všechny TCP porty 1–65535 vlastního laboratorního zařízení; nejde o sken UDP."),
    ],
    example: "sudo nmap -sV -O 192.168.1.1", exampleType: "shell",
    exampleDescription: "sudo poskytne oprávnění pro surové pakety, -sV detekuje verze služeb a -O porovnává síťové odpovědi s otisky operačních systémů. Identifikace vlastního testovaného zařízení není zaručená.",
  },
  {
    rank: 2, id: "wireshark", name: "Wireshark / TShark", icon: Waves, category: "Analýza síťového provozu",
    info: "Analyzátor síťového provozu pro zachytávání a rozbor paketů a komunikace využívající protokoly TCP/IP, DNS, HTTP, TLS a další. Příklady pracují pouze s vlastním laboratorním rozhraním eth0 a vlastním záznamem provozu.",
    control: "Wireshark nabízí grafické rozhraní (GUI); TShark umožňuje ovládání z terminálu (CLI). Zachytávání vyžaduje oprávnění k rozhraní.",
    commands: [
      command("Grafické rozhraní", "wireshark", "Spuštění grafického rozhraní Wireshark; samo o sobě nezahájí zachytávání ani nevybere rozhraní."),
      command("Síťová rozhraní", "tshark -D", "-D vypíše rozhraní dostupná pro zachytávání včetně jejich čísel a názvů."),
      command("Zachytávání provozu", "tshark -i eth0", "-i eth0 vybere vlastní laboratorní rozhraní eth0. Bez časového či početního limitu zachytávání pokračuje do přerušení; název rozhraní se liší podle zařízení."),
      command("Čtení PCAP", "tshark -r capture.pcap", "-r capture.pcap načte vlastní uložený záznam a vypíše pakety; nezachytává nový síťový provoz."),
      command("DNS provoz", 'tshark -i eth0 -f "port 53"', "-i vybírá rozhraní, -f nastavuje zachytávací filtr BPF. port 53 zahrnuje zdrojový i cílový port TCP/UDP, typicky DNS, ale nerozpoznává protokol. Běžné DNS přes HTTPS či TLS nezahrnuje; nejde o zobrazovací filtr -Y."),
    ],
    example: 'sudo tshark -i eth0 -f "port 53"', exampleType: "shell",
    exampleDescription: "sudo poskytne oprávnění k zachytávání, -i eth0 vybere vlastní laboratorní rozhraní a -f filtruje pakety s portem 53 už při zachytávání. Vypisuje souhrny paketů typicky s nešifrovaným DNS, ale samotný port nezaručuje tento protokol. Záznam neukládá.",
  },
  {
    rank: 3, id: "metasploit", name: "Metasploit Framework", icon: Crosshair, category: "Penetrační testování",
    info: "Framework pro penetrační testování. Obsahuje moduly pro ověřování známých zranitelností, pomocné nástroje, exploity a další funkce bezpečnostního testování. Zde uvedené funkce pouze zobrazují informace pro autorizované testování; nespouštějí exploit.",
    control: "Terminál – msfconsole. Po spuštění se používají příkazy vlastního prostředí Metasploit, nikoli Bash.",
    commands: [
      command("Spuštění frameworku", "msfconsole", "Spuštění konzole frameworku ze shellu."),
      command("Pomocné moduly", "search type:auxiliary", "search vyhledává moduly; filtr type:auxiliary omezí výsledky na pomocné moduly. Jde pouze o vyhledání, nikoli spuštění.", "console"),
      command("Moduly SMB", "search name:smb", "search vyhledává moduly; name:smb filtruje jejich názvy podle výrazu smb. Výsledky se pouze zobrazí.", "console"),
      command("Informace o modulu", "info auxiliary/scanner/smb/smb_version", "info zobrazí dokumentaci modulu auxiliary/scanner/smb/smb_version včetně popisu a parametrů; modul se nespouští.", "console"),
      command("Parametry modulu", "show options", "show options zobrazí parametry, jejich současné hodnoty, povinnost vyplnění a popis. Parametry konkrétního modulu jsou dostupné až po jeho výběru v konzoli; info modul nevybírá.", "console"),
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
      command("Nápověda ke spuštění", "burpsuite --help", "--help vypíše nápovědu k parametrům spuštění; přepínač je dokumentovaný pro spouštěč Burp Suite v Kali."),
      command("Verze aplikace", "burpsuite --version", "--version vypíše informace o verzi; přepínač je dokumentovaný pro spouštěč Burp Suite v Kali."),
      command("Zachytávání požadavků", "Proxy → Intercept", "Proxy → Intercept otevře zachytávání požadavků vlastní aplikace. Při zapnutém Intercept on požadavky vedené přes proxy čekají na předání nebo zahození.", "gui"),
      command("Opakované odeslání", "Repeater → Send", "Send odešle vlastní aplikaci požadavek už připravený v kartě Repeater; jeho obsah lze před každým odesláním upravit.", "gui"),
    ],
    example: "Burp Suite → Proxy → Intercept\nProxy testovacího prohlížeče: 127.0.0.1:8080", exampleType: "gui",
    exampleDescription: "Příklad GUI, nikoli shellu: adresa proxy prohlížeče musí odpovídat aktivnímu listeneru Burp a zachytávání musí být zapnuté. Externí prohlížeč potřebuje pro HTTPS důvěru k certifikátu Burp; vestavěný prohlížeč je přednastavený.",
  },
  {
    rank: 5, id: "aircrack-ng", name: "Aircrack-ng", icon: Wifi, category: "Bezpečnost Wi-Fi",
    info: "Sada nástrojů pro bezpečnostní audit Wi-Fi sítí. Podporuje monitorování bezdrátového provozu, analýzu zachycených paketů a kontrolu zabezpečení WPA/WPA2. Příklady jsou určeny pouze pro vlastní zařízení a autorizovaný audit.",
    control: "Terminál (CLI). Pro monitorovací režim je potřeba kompatibilní Wi-Fi adaptér.",
    commands: [
      command("Nápověda", "aircrack-ng --help", "Zobrazení nápovědy."),
      command("Bezdrátová rozhraní", "airmon-ng", "Výpis bezdrátových rozhraní."),
      command("Kontrola procesů", "sudo airmon-ng check", "sudo poskytne oprávnění správce; check vypíše procesy, které mohou rušit monitorovací režim. Samotné check je neukončuje."),
      command("Monitorování Wi-Fi", "sudo airodump-ng wlan0mon", "sudo poskytne oprávnění k zachytávání na existujícím monitorovacím rozhraní wlan0mon vlastního adaptéru. V rámci autorizovaného auditu zobrazuje provoz sítí; bez volby výstupního souboru záznam neukládá."),
      command("Zachycený soubor", "aircrack-ng capture.cap", "Zpracuje vlastní záznam capture.cap. Podle obsahu může zahájit obnovu WEP klíče i bez slovníku; nejde o čistě informační prohlížeč. Slovníkový audit WPA/WPA2-PSK vyžaduje slovník a použitelný handshake, bez slovníku může skončit chybou."),
    ],
    example: "sudo airmon-ng start wlan0\nsudo airodump-ng wlan0mon", exampleType: "shell",
    exampleDescription: "sudo poskytne oprávnění správce; start wlan0 zapne monitorovací režim vlastního adaptéru. Druhý řádek zachytává provoz při autorizovaném auditu; wlan0mon musí odpovídat skutečně vytvořenému rozhraní, jehož název závisí na ovladači.",
  },
  {
    rank: 6, id: "john", name: "John the Ripper", icon: KeyRound, category: "Audit hesel",
    info: "Nástroj pro audit bezpečnosti hesel a kontrolu jejich odolnosti. Pracuje s kryptografickými hashi a podporuje různé formáty. Soubory v příkladech obsahují pouze vlastní testovací hashe a slovník.",
    control: "Terminál (CLI), příkaz john. Výpis formátů odpovídá rozšířené verzi Jumbo v Kali Linuxu.",
    commands: [
      command("Nápověda", "john", "Spuštění bez argumentů zobrazí přehled použití; sestavení Kali Jumbo podporuje také --help."),
      command("Formáty hashů", "john --list=formats", "--list=formats vypíše identifikátory formátů hashů podporované sestavením John Jumbo v Kali."),
      command("Benchmark", "john --test", "--test provede vlastní testy správnosti a benchmark výkonu podporovaných formátů; neaudituje vstupní hashe."),
      command("Nalezená hesla", "john --show hashes.txt", "--show porovná vlastní hashe ze souboru hashes.txt s uloženými výsledky v john.pot a zobrazí nalezená hesla; neprovádí nový audit."),
      command("Slovníkový audit", "john --wordlist=wordlist.txt hashes.txt", "--wordlist=wordlist.txt vybírá soubor kandidátních hesel; hashes.txt obsahuje vlastní testovací hashe. Nalezené výsledky se ukládají do john.pot."),
    ],
    example: "john --wordlist=wordlist.txt hashes.txt", exampleType: "shell",
    exampleDescription: "--wordlist=wordlist.txt vybírá slovník kandidátů; hashes.txt je vstup s vlastními testovacími hashi. Výsledky se ukládají do john.pot.",
  },
  {
    rank: 7, id: "hashcat", name: "Hashcat", icon: Fingerprint, category: "Audit hashů a hesel",
    info: "Nástroj pro obnovu hesel a audit jejich odolnosti. Využívá CPU nebo GPU a podporuje velké množství hashovacích algoritmů. Příklady pracují pouze s vlastními testovacími hashi a slovníkem.",
    control: "Terminál (CLI), příkaz hashcat.",
    commands: [
      command("Nápověda", "hashcat --help", "Zobrazení nápovědy."),
      command("Výpočetní zařízení", "hashcat -I", "-I vypíše dostupné výpočetní backendy a CPU/GPU zařízení; nespouští audit."),
      command("Benchmark", "hashcat -b", "-b zapne benchmark vybraných režimů hashů pro měření výkonu zařízení; nejde o audit souboru hashů ani nutně o všechny podporované režimy."),
      command("Ukázkové hashe", "hashcat --example-hashes", "--example-hashes je alias --hash-info: vypíše informace o režimech a ukázkové hashe pro rozlišení formátů."),
      command("Slovníkový audit MD5", "hashcat -m 0 -a 0 hashes.txt wordlist.txt", "-m 0 vybírá nesolený MD5, -a 0 slovníkový režim; hashes.txt obsahuje vlastní hashe a wordlist.txt kandidátní hesla. Nalezené výsledky se ukládají do potfile."),
    ],
    example: "hashcat -m 0 -a 0 hashes.txt wordlist.txt", exampleType: "shell",
    exampleDescription: "-m 0 označuje nesolený MD5 a -a 0 slovníkový režim. hashes.txt je vstup vlastních testovacích hashů a wordlist.txt slovník kandidátů; výsledky se ukládají do potfile.",
  },
  {
    rank: 8, id: "sqlmap", name: "SQLmap", icon: Database, category: "Testování SQL Injection",
    info: "Automatizovaný nástroj pro detekci a ověřování SQL Injection zranitelností ve webových aplikacích. Podporuje různé databázové systémy. Všechny ukázky cílí na vlastní lokální testovací aplikaci.",
    control: "Terminál (CLI), příkaz sqlmap.",
    commands: [
      command("Nápověda", "sqlmap --help", "--help vypíše základní nápovědu s přehledem parametrů a ukončí program."),
      command("Verze", "sqlmap --version", "Zjištění verze."),
      command("Test URL", 'sqlmap -u "http://127.0.0.1/test.php?id=1"', "-u určuje URL vlastní lokální aplikace; parametr id=1 v dotazu je vstup testovaný na SQL Injection."),
      command("Neinteraktivní test", 'sqlmap -u "http://127.0.0.1/test.php?id=1" --batch', "-u určuje cílovou laboratorní URL; --batch použije výchozí odpovědi bez interaktivních dotazů. Neomezuje počet testů ani nezaručuje neškodnost."),
      command("Základní úroveň testu", 'sqlmap -u "http://127.0.0.1/test.php?id=1" --risk=1 --level=1', "-u určuje URL, --risk=1 nejnižší úroveň rizika (rozsah 1–3) a --level=1 nejnižší hloubku testů (rozsah 1–5). Jde o výchozí hodnoty, nikoli záruku nulového rizika změny dat."),
    ],
    example: 'sqlmap -u "http://127.0.0.1/test.php?id=1" --batch --risk=1 --level=1', exampleType: "shell",
    exampleDescription: "-u určuje vlastní lokální URL, --batch použije výchozí odpovědi, --risk=1 a --level=1 zachovají základní sadu testů. Příklad ověřuje parametr id, nepožaduje výpis ani stažení databázových dat.",
  },
  {
    rank: 9, id: "gobuster", name: "Gobuster", icon: Search, category: "Průzkum webu",
    info: "Nástroj pro vyhledávání skrytých adresářů, souborů, DNS subdomén a virtuálních hostů. Používá slovníky a HTTP požadavky. Příklady pracují s vlastním lokálním serverem a laboratorní doménou example.test.",
    control: "Terminál (CLI), příkaz gobuster.",
    commands: [
      command("Nápověda", "gobuster --help", "Zobrazení nápovědy."),
      command("Režim adresářů", "gobuster dir --help", "Nápověda režimu vyhledávání adresářů."),
      command("Adresáře a soubory", "gobuster dir -u http://127.0.0.1 -w wordlist.txt", "dir vybírá režim cest, -u URL vlastního lokálního serveru a -w soubor slovníku. Položky slovníku zkouší jako adresáře nebo názvy souborů; přípony automaticky nepřidává."),
      command("DNS subdomény", "gobuster dns --domain example.test -w subdomains.txt", "dns vybírá DNS režim, --domain vlastní laboratorní doménu a -w slovník subdomén. V současné verzi není zkratka -d platná pro doménu. Příkaz explicitně neurčuje DNS server; rozlišení example.test závisí na nastaveném laboratorním DNS."),
      command("Virtuální hosty", "gobuster vhost -u http://127.0.0.1 -w hosts.txt", "vhost mění HTTP hlavičku Host; -u určuje vlastní server a -w slovník úplných názvů hostů. Bez --append-domain se k položkám slovníku doména nepřipojuje; nejde o DNS vyhledávání."),
    ],
    example: "gobuster dir -u http://127.0.0.1 -w wordlist.txt", exampleType: "shell",
    exampleDescription: "dir vybírá režim hledání cest, -u vlastní lokální URL a -w slovník wordlist.txt. Výsledky vycházejí z HTTP odpovědí serveru.",
  },
  {
    rank: 10, id: "nikto", name: "Nikto", icon: ShieldCheck, category: "Bezpečnost webových serverů",
    info: "Open-source skener webových serverů. Hledá známé problémy v konfiguraci, zastaralé komponenty, nebezpečné soubory a potenciální zranitelnosti. Příklady kontrolují pouze vlastní lokální webový server.",
    control: "Terminál (CLI), příkaz nikto.",
    commands: [
      command("Nápověda", "nikto -Help", "Zobrazení nápovědy."),
      command("Verze", "nikto -Version", "-Version vypíše informace o verzi Nikto, jeho pluginů a databází kontrol."),
      command("Kontrola HTTP", "nikto -h http://127.0.0.1", "-h určuje hostitele nebo URL vlastního lokálního serveru; schéma http:// znamená nešifrované HTTP, zde standardně port 80."),
      command("Kontrola HTTPS", "nikto -h https://127.0.0.1", "-h určuje URL vlastního serveru; https:// aktivuje TLS, zde standardně na portu 443. Přepínač -ssl není při uvedení HTTPS URL nutný."),
      command("Uložení výsledků", "nikto -h http://127.0.0.1 -output report.txt", "-h je zkratka -host a určuje vlastní cílový server. -output report.txt zapisuje výsledky do souboru; bez -Format se z přípony .txt odvodí prostý text."),
    ],
    example: "nikto -h http://127.0.0.1 -output report.txt", exampleType: "shell",
    exampleDescription: "-h určuje vlastní lokální URL a -output report.txt ukládá nálezy do textového reportu. Nálezy skeneru jsou indikace potenciálních problémů, nikoli automatické potvrzení zranitelnosti.",
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
