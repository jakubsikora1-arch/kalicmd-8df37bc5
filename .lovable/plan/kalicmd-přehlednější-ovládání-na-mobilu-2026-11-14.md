# KaliCmd — přehlednější ovládání na mobilu

## Cíl

Zlepšit existující generátor příkazů a skriptů podle dovedností Impeccable, Web Artifacts Builder a Writing Plans. Zachovat současnou terminálovou identitu, Claude, stahování a dobrovolné ukládání skriptů.

## Zjištění a priority


| Priorita | Zjištění                                                                                                                                  | Navržená změna                                                                                                                        |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Vysoká   | Na telefonech 390 × 844 a 375 × 667 se úvodní obsah automaticky posune dolů: název KaliCmd i začátek nabídek jsou mimo viditelnou oblast. | Oddělit úvod od automatického posouvání rozhovoru; při otevření zobrazit úvod od začátku, nabídky zkrátit a ponechat zadání dostupné. |
| Vysoká   | Odesílání, přepínače režimu a ikony mají pouze 32 × 32 nebo 32 px na výšku.                                                               | Zvětšit dotykové plochy alespoň na 44 × 44 px, aniž by ikony zbytečně dominovaly.                                                     |
| Vysoká   | Otevření seznamu uložených skriptů maže případnou chybu načtení. Chybí opakování načtení a odlišení čekání od prázdného seznamu.          | Zachovat chybu, doplnit stav načítání a tlačítko opakování.                                                                           |
| Střední  | Smazání skriptu i vymazání rozhovoru jsou okamžité a nevratné.                                                                            | Před odstraněním vyžádat potvrzení; při mazání ukázat průběh a případnou chybu.                                                       |
| Střední  | Kopírování uloženého skriptu nemá viditelné potvrzení, přestože se úspěch již sleduje.                                                    | Zobrazit potvrzovací ikonu a oznámit úspěch čtečce obrazovky.                                                                         |
| Střední  | Některé popisky mají jen 10 px a rozhraní neřeší bezpečné okraje iPhonu.                                                                  | Zlepšit čitelnost důležitých údajů, doplnit bezpečné okraje a prověřit zadání při zmenšené dostupné výšce.                            |
| Střední  | Globální chybové stránky jsou anglicky, zatímco aplikace je česká.                                                                        | Přeložit chybové stavy a použít stejné ovládací prvky jako jinde v aplikaci.                                                          |


Kontrola v Chromium nezjistila vodorovné přetékání. Skutečné chování klávesnice a bezpečných okrajů v Safari na iPhonu zatím není ověřené.

## Rozsah a důležitá rozhodnutí

- Nejvyšší prioritu mají dostupné zadání, čitelné výsledky a bezpečné odstranění dat, nikoli nové dekorace.
- Zachovat stávající barvy, logo a písma; upravit pouze hierarchii, rozměry a stavy.
- Rozhovory zůstanou pouze v aktuálním otevření stránky. Skripty se ukládají jen na výslovný pokyn.
- Skript se nebude automaticky spouštět; stažení a příkazy pro ruční spuštění zůstanou zachované.
- Nepřidávat přihlášení, nové funkce AI, změny databáze ani napojení Apple Shortcuts. Dovednosti použít na skutečnou aplikaci KaliCmd, ne na jiný typ aplikace.

## Technické provedení

- `src/routes/index.tsx`: upravit úvodní scrollování, načítání uložených skriptů, zpětnou vazbu a potvrzovací dialogy; dle potřeby oddělit seznam uložených skriptů do malého samostatného komponentu.
- `src/components/script-download.tsx`: sjednotit dotykové plochy a stavové oznámení bez změny obsahu stahovaného souboru.
- `src/styles.css`: rozměry ovládání, kompaktní mobilní úvod, bezpečné okraje, čitelnost a omezení animací při `prefers-reduced-motion`; zachovat sémantické barevné tokeny.
- `src/routes/__root.tsx`: české chybové stavy a nastavení viewportu pro bezpečné okraje.
- Použít stávající TanStack Start, AI Elements a designové komponenty; žádná změna frameworku ani nová transportní vrstva.
- Zachovat kontrakt `{ mode, messages }` na existujícím streamingovém endpointu a přístup k uloženým datům přes stávající funkce vázané na relaci prohlížeče.

## Pořadí implementace

1. Opravit mobilní úvod, posouvání a dotykové plochy.
2. Doplnit načítání, opakování, potvrzování mazání a zpětnou vazbu kopírování.
3. Zkontrolovat přístupnost, české chybové stránky a omezení animací.
4. Spustit související testy a ověřit hlavní průchod v prohlížeči.

## Ověření

- Počítač 1280 × 1800 a telefony 390 × 844 a 375 × 667: úvod začíná nahoře, ovládání nepřetéká, zadání zůstává dostupné.
- Vygenerovat skutečný skript, stáhnout jej, uložit, obnovit stránku a načíst uložený výsledek; zrušit i potvrdit smazání.
- Ověřit kopírování, přepnutí režimu a zastavení generování.
- Simulovat chybu načtení uložených skriptů, ověřit její zobrazení a úspěšné opakování; tyto simulace nejsou náhradou skutečného průchodu ukládáním.
- Ovládání klávesnicí, pojmenování ikon, fokus v potvrzovacím dialogu a stavová oznámení pro čtečku obrazovky.
- Spustit stávající testy parsování, skriptů, relace a směrování; nové testy případné oddělené stavové logiky, nikoli vzhledu nebo textových formulací.
- Safari na skutečném iPhonu zůstává samostatnou ruční kontrolou; emulace v Chromium neprokazuje chování iOS klávesnice.