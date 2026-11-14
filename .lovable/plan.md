# Úkol 2: Parametrické šablony z uložených .sh skriptů

Výchozí stav (ověřeno, HEAD `6e47baa`, čistý strom): `saved_scripts` má sloupce id, title, script, created_at, session_id, user_id. RLS povoluje přihlášenému vlastníkovi jen SELECT/INSERT/DELETE, **UPDATE je zakázán**; INSERT omezuje script na 100 000 a title na 80 znaků. Panel „Uložené skripty“ umí kopírovat, stáhnout a smazat. `extractBashScript` přijímá jen uzavřený blok se shebangem a `downloadScript` stahuje `kalicmd-script.sh`. `quotePosix` už existuje v generátoru příkazů.

Bez databázové migrace: metadata šablony se uloží přímo do textu skriptu jako komentáře. Staré záznamy bez metadat fungují beze změny.

## 1. Formát šablony (v1)

Hlavička se píše hned za shebang a skládá se jen z komentářů, takže skript zůstává platný Bash:

```text
#!/usr/bin/env bash
# kalicmd-template: v1
# kalicmd-param: TARGET | type=host | label=Cíl | required
# kalicmd-param: PORTS  | type=ports | label=Porty | default=22,80,443
# kalicmd-param: OUTDIR | type=path | label=Výstupní složka | default=./out
# kalicmd-param: MODE   | type=enum:quick,full | label=Režim | default=quick
# kalicmd-end
set -euo pipefail
TARGET={{TARGET}}
PORTS={{PORTS}}
nmap -sT -p "$PORTS" "$TARGET"
```

Pravidla:
- Název parametru: `^[A-Z][A-Z0-9_]{0,31}$`, nejvýš 20 parametrů. Rezervovaná jména (PATH, IFS, HOME, BASH_*, LD_*…) jsou zakázaná.
- Typy jsou pevně dané: `host` (hostname/IPv4/IPv6), `cidr` (stejný limit /24, resp. /120 jako Nmap), `url` (http/https, bez přihlašovacích údajů), `port`, `ports`, `int:min..max`, `path` (bez `..` a řídicích znaků), `iface`, `enum:a,b,c`, `text` (krátký bezpečný text, max. 120 znaků, bez řídicích znaků a nových řádků). Neznámý typ znamená neplatnou šablonu.
- Placeholder `{{NAME}}` smí stát **jen jako celá pravá strana přiřazení na samostatném řádku** (`NAME={{NAME}}`). Kdekoli jinde (uvnitř uvozovek, v heredocu, v příkazu, v komentáři mimo hlavičku) se šablona odmítne. Díky tomu se hodnota vždy vloží jako jeden výraz v jednoduchých uvozovkách. Zbytek skriptu se na ni odkazuje jako na `"$NAME"`.
- Placeholder, který nemá deklaraci, nebo deklarace, která nemá placeholder, znamená chybu s českým vysvětlením.

## 2. Jak uživatel šablonu vytvoří

V panelu „Uložené skripty“ přibude u každého záznamu tlačítko **„Udělat šablonu“**. Otevře editor ve dvou krocích:
1. Aplikace navrhne kandidáty, tedy řádky ve tvaru `NAME=hodnota` nebo `NAME="${1:-…}"`. Uživatel zaškrtne, které z nich jsou parametry, a u každého vybere typ, popisek, výchozí hodnotu a povinnost. Výchozí hodnota se ověří stejným typem.
2. Náhled ukáže výslednou hlavičku i nahrazené řádky. Po potvrzení se uloží **jako nový záznam** (titulek „… (šablona)“, zkráceno na 80 znaků). Původní skript zůstane, protože UPDATE je zakázán a chci zachovat kompatibilitu. Ruční psaní hlavičky není potřeba, ale ručně připravený text se načte stejně.

Šablonou je záznam, který po shebangu obsahuje `# kalicmd-template: v1`. Takový záznam dostane v seznamu štítek „Šablona“ a tlačítko **„Vyplnit“**. Kopírovat i stáhnout jde dál i surovou šablonu.

## 3. Formulář a výstup

- „Vyplnit“ otevře dialog s formulářem vytvořeným z hlavičky. Typ `enum` se zobrazí jako výběr, ostatní typy jako textová pole s nápovědou. Validuje se při psaní a chyby jsou česky u konkrétního pole.
- Výstup se sestaví deterministicky: hlavička šablony se odstraní a nahradí komentářem `# Vygenerováno KaliCmd ze šablony „…“`, každý řádek `NAME={{NAME}}` se změní na `NAME='hodnota'` přes `quotePosix`. Nic jiného se v textu nemění.
- Zobrazí se náhled hotového skriptu, varování „pouze vlastní nebo autorizované cíle“ a tlačítka „Kopírovat“ a „Stáhnout .sh“. Název souboru bude `kalicmd-<slug-titulku>.sh` (bezpečný slug, jinak výchozí název). Žádné spuštění, žádný `bash -n`, žádné volání AI ani sítě. Ukládání vyplněného výstupu není součástí návrhu.

## 4. Bezpečnost

- Hodnoty projdou whitelistem typů. Odmítnou se znaky jako `; & | $ \` < > ( ) \n \r`, NUL a další řídicí znaky. Zakázaný je i úvodní `-` (aby hodnota nešla vložit jako přepínač do nástroje), kromě typů `int`/`port`.
- Je nutné quoting **i** validace. Quoting zabrání vložení příkazu do Bash, validace zabrání zneužití hodnoty uvnitř nástroje.
- Parser je čistě textový, s limity velikosti (100 000 znaků, jako RLS), bez regexů s katastrofickým backtrackingem a bez `eval` nebo `new Function`.
- Šablonu nikdy nepovažuji za důvěryhodnou: hlavičku pokaždé znovu ověřím a hodnoty `default` projdou stejnou validací.
- RLS, auth, MCP ani katalog se nemění.

## Technické detaily – soubory

Nové:
- `src/lib/script-template-format.ts`: typy, gramatika hlavičky, `parseScriptTemplate`, `isScriptTemplate`, `suggestTemplateParams`, `createTemplateText` (vložení hlavičky a placeholderů).
- `src/lib/script-template-validation.ts`: validátory jednotlivých typů. Validátory host/url/cidr/path/port se přesunou ze `parameter-command-builder.ts` do sdíleného modulu `src/lib/param-validators.ts` (spolu s `quotePosix`), ze kterého importují oba moduly, aby nevznikla duplicita.
- `src/lib/script-template-render.ts`: `renderScriptTemplate(template, values) → { ok, script, filename } | { ok:false, errors }`.
- `src/components/script-template-editor.tsx`: dialog pro vytvoření šablony.
- `src/components/script-template-form.tsx`: dialog s formulářem, náhledem, kopírováním a stažením.

Upravené:
- `src/lib/parameter-command-builder.ts`: jen import ze sdílených validátorů, chování se nemění (ověří to stávajících 137 testů).
- `src/lib/bash-script.ts`: `downloadScript(script, filename = SCRIPT_FILENAME)`, zpětně kompatibilní.
- `src/components/command-workspace.tsx`: štítek a tlačítka v panelu, napojení dialogů, uložení přes stávající `saveSavedScript`.
- `AGENTS.md`: jedno pravidlo (šablony jsou komentářová metadata ve skriptu, nahrazují se jen `NAME={{NAME}}`, bez migrace a bez spouštění).
- `roadmap.md`: položka úkolu 2.

Bez změn: databáze, migrace, RLS, auth, MCP, katalog, chat endpoint.

## Rizika

- Proměnné uvnitř skriptu může autor použít nebezpečně (např. `eval "$X"` nebo bez uvozovek). Generátor zaručuje bezpečné přiřazení, ne bezpečnost celého skriptu. Formulář proto ukáže upozornění, když najde `eval`, `$NAME` bez uvozovek nebo `bash -c` s parametrem (jen heuristika, nic neblokuje).
- Šablona zabírá v databázi další záznam (původní skript zůstává). Smazat jde každý zvlášť.
- Úprava existující šablony znamená uložit novou verzi, protože UPDATE je zakázán. Měnit to by vyžadovalo migraci, kterou teď navrhovat nebudu.
- Přesun validátorů může ovlivnit stávající generátor. Pojistkou jsou jeho testy.

## Testovací plán (Vitest)

- Parser: platná hlavička; chybí `kalicmd-end`; duplicitní nebo rezervované jméno; neznámý typ; placeholder bez deklarace a naopak; placeholder uvnitř uvozovek, heredocu nebo příkazu se odmítne; limity 20 parametrů a 100 000 znaků; starý skript bez hlavičky = není šablona.
- Validace pro každý typ: platné a neplatné hodnoty a injekce (`;`, `&&`, `|`, `$()`, backticky, nový řádek, `'`, `"`, NUL, `../`, úvodní `-`, CIDR /16, URL s přihlašovacími údaji).
- Render: deterministický výstup (stejný vstup = stejný text), hodnota s `'` je správně escapovaná, nahrazují se jen řádky s placeholdery, odstraní se hlavička, zůstane shebang, výstup projde `extractBashScript`-kompatibilní kontrolou shebangu, slug názvu souboru.
- Vytvoření šablony: z ukázkového skriptu se navrhnou kandidáti, `createTemplateText` a následně `parseScriptTemplate` vrátí totéž.
- UI (RTL): štítek „Šablona“ u šablony, formulář ukáže chybu u pole, „Stáhnout“ je zakázané, dokud jsou chyby, a žádné `fetch` během vyplňování.
- Regrese: všech 186 stávajících testů. Kontrola v prohlížeči po přihlášení na desktopu a na mobilu (360 px). Safari/iOS označím jako neověřené. Žádný deploy.
