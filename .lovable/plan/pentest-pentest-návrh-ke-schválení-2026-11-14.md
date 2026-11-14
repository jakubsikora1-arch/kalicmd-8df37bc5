# PENTEST /pentest — návrh ke schválení

Ověřeno: HEAD `22740d2`, čistý pracovní strom. Nic se neměnilo.

## 1. Současný stav
- Stránky: `/` (obecný generátor), `/tools/$tool` (detail nástroje, ověřený přes katalog), schvalovací stránka pro AI agenty. Obě hlavní stránky používají `CommandWorkspace`. Odkazy na nástroje jsou v jeho postranním panelu.
- AI: jediný endpoint `src/routes/api/chat.ts` (Claude přes AI Gateway, streamování, max_tokens 2048). Prompty jsou v `src/lib/kali-prompt.ts` (`KALI_SYSTEM_PROMPT`, `KALI_SCRIPT_PROMPT`, `buildKaliPrompt`).
- Validace: `src/lib/chat-request.ts` hlídá max. 30 zpráv, 8000 znaků na zprávu, režim command/script, ID nástroje z katalogu a nově striktní střídání user/assistant.
- Katalog: `src/lib/tool-catalog.ts` (TOP 10, typ shell/GUI/konzole, pět příkazů u každého nástroje).
- Export: `src/lib/bash-script.ts` (`downloadScript` vytváří soubor jen v prohlížeči). Žádné síťové volání ani zápis do databáze.
- Přihlášení: Google/Apple (`useAuth`, `AccountButton`). AI chat je dostupný i bez přihlášení.

## 2. Struktura /pentest a workflow
Samostatná stránka `src/routes/pentest.tsx` s vlastní komponentou `PentestWorkspace`. `CommandWorkspace` zůstane beze změny, stránka jen převezme vizuální tokeny. Navigace: odkaz „PENTEST“ v postranním panelu a v hlavičce, z /pentest tlačítko „Zpět na KaliCmd“.

Průvodce s pěti kontrolními branami a ukazatelem postupu. Stav se drží jen v React state; po obnovení stránky zmizí, stejně jako dnes konverzace.

```text
[1 Brief] -> [2 Oprávnění a rozsah] -> [3 Cíle a omezení] -> [4 Plán (AI, po fázích)] -> [5 Report a export]
              brána: povinné potvrzení      brána: kontrola úplnosti      brána: potvrzení každé aktivní fáze
```

| Část | Dodává uživatel | Navrhuje AI | Musí výslovně potvrdit uživatel |
|---|---|---|---|
| Brief | typ cíle (web, síť, Wi-Fi, hesla), účel | upřesňující otázky | — |
| Oprávnění | jméno zadavatele, odkaz/ID smlouvy či ROE, časové okno, kontakt | — | zaškrtávací pole „mám písemné oprávnění“ |
| Rozsah | povolené hosty/CIDR/URL (stejné validátory jako generátor, CIDR max /24), co je mimo rozsah | upozornění na nejasnosti | finální seznam cílů |
| Omezení | rate limit, zakázané techniky, prostředí (lab/produkce) | doporučené limity | — |
| Plán | — | fáze, kroky, příkazy, důkazy, stop conditions | spuštění každé aktivní fáze (tlačítko „Rozumím, pokračovat“) |
| Report | závěrečné poznámky | dopady, mitigace, shrnutí | export |

Metodické fáze: 0 Příprava a ROE, 1 Pasivní průzkum, 2 Aktivní neinvazivní enumerace (brána), 3 Analýza zranitelností bez exploitace (brána), 4 Ověření nálezů s minimálním dopadem, jen v laboratoři nebo s výslovným schválením (brána), 5 Report. U každého kroku se zobrazí cíl, nástroj z katalogu, příkaz, očekávaný důkaz, riziko a stop condition. AI generuje vždy jen jednu fázi; další přijde až po potvrzení.

## 3. Nový prompt `PENTEST_SYSTEM_PROMPT`
Nový soubor `src/lib/pentest-prompt.ts`, oddělený od stávajících promptů. Struktura:
1. **Role:** český metodický asistent pro autorizované testy, nikdy nic nespouští.
2. **Kontext ze serveru:** potvrzený rozsah, ROE, limity a aktuální fáze. Pochází z validovaného JSON, ne z volného textu.
3. **Tvrdá pravidla:** pracuj jen s cíli z potvrzeného rozsahu; jiný cíl odmítni a vyžádej upřesnění. Zakázané jsou destruktivní kroky, DoS a zátěžové testy, persistence, exfiltrace dat, krádež nebo prolamování produkčních přihlašovacích údajů, obcházení autentizace, laterální pohyb, malware a vyhýbání se detekci. Preferuj pasivní a neinvazivní varianty. Uváděj rate limity (např. `nmap -T2 --max-rate`). Každý aktivní krok označ `[AKTIVNÍ – vyžaduje potvrzení]`.
4. **Odmítnutí nebo upřesnění:** chybí oprávnění, rozsah je nejasný nebo širší než /24, cílem je třetí strana nebo veřejná služba bez ROE, požadavek spadá mezi zakázané techniky, nebo uživatel žádá přeskočit bránu.
5. **Pevný výstupní formát:** jeden blok ```json se schématem z bodu 4 pro aktuální fázi a pod ním krátké české vysvětlení. Příkazy používají jen nástroje z katalogu nebo základní Bash utility.
6. **Bezpečnostní hranice po fázích:** 1 jen pasivní zdroje, 2 bez exploitů a s limitem rychlosti, 3 jen identifikace, 4 jen důkaz existence bez změny dat a stop při první potvrzené zranitelnosti, 5 bez nových příkazů.

## 4. Datový model a export
```ts
PentestScenario { version: "1"; createdAt; title;
  authorization: { client; reference; window: {from,to}; contact; confirmed: true };
  scope: { inScope: string[]; outOfScope: string[]; environment: "lab"|"production" };
  constraints: { rateLimit; forbidden: string[]; assumptions: string[] };
  phases: Phase[]; findings: Finding[]; recommendations: string[] }
Phase { id: 0..5; name; active: boolean; confirmedAt?; steps: Step[] }
Step  { title; tool?: ToolId; command?; evidence; risk: "nízké"|"střední"|"vysoké"; stopCondition }
Finding { title; severity; evidence; impact; mitigation }
```
- Odpověď AI se parsuje a validuje na klientu (Zod, whitelist polí). Neplatný JSON se nezobrazí jako plán, uživatel dostane možnost zkusit to znovu.
- **Markdown (.md, primární):** hlavička s metadaty, oprávnění, rozsah, předpoklady, omezení, fáze → kroky (příkazy v ```bash), důkazy, rizika, stop conditions, nálezy, doporučení a zápatí „Neautomatizovaný plán – nic nebylo spuštěno“. Uživatelský text se escapuje kvůli Markdownu i backtickům.
- **JSON (.json, doplněk):** `JSON.stringify(scenario, null, 2)` se seřazenými klíči.
- Název souboru: `kalicmd-pentest-<slug-nazvu>-<YYYY-MM-DD>.md`, jen `[a-z0-9-]`.
- Export je deterministický (stejný vstup dá stejný výstup), čistá funkce bez síťového volání a bez zápisu do databáze. Stažení zajistí zobecněný `downloadFile(text, filename, mime)`.

## 5. API a validace
- Nový endpoint `src/routes/api/pentest.ts` se stejným vzorem jako chat.ts. Stávající chat.ts zůstane nedotčený.
- `src/lib/pentest-request.ts` validuje: `authorization.confirmed === true`, `inScope` 1–20 položek přes stávající validátory (host/CIDR ≤/24/URL), `phase` 0–5, `confirmedPhases` musí obsahovat aktuální aktivní fázi, zprávy se striktně střídají, max. 20 zpráv × 4000 znaků a délkové limity polí. Jakékoli porušení vrátí 400 a nevolá se AI.
- Prompt sestavuje server z validovaných dat; klient posílá jen data, ne text promptu.
- **Otevřená volba:** vyžadovat přihlášení pro /api/pentest jako ochranu proti spotřebě kreditů (doporučuji, přes `requireSupabaseAuth`-styl ověření tokenu v route). Dnešní chat zůstane veřejný.
- `max_tokens` 3000, stejné mapování chyb 429/402/500.

## 6. Soubory
Vytvořit:
- `src/routes/pentest.tsx` (head metadata, render)
- `src/components/pentest-workspace.tsx`
- `src/components/pentest-steps/*` (brief, scope, plan, report)
- `src/lib/pentest-prompt.ts`
- `src/lib/pentest-request.ts`
- `src/lib/pentest-scenario.ts` (Zod schéma a parser)
- `src/lib/pentest-export.ts` (md/json, název souboru)
- `src/routes/api/pentest.ts`
- testy `src/test/pentest-*.test.ts(x)`

Upravit:
- `src/components/command-workspace.tsx` (jen odkaz PENTEST)
- `src/lib/bash-script.ts` (obecný `downloadFile`, `downloadScript` ponechat jako wrapper)
- `AGENTS.md` (pravidlo pro pentest)
- `roadmap.md`

Databáze: beze změny.

## 7. Testy
- **Unit:** validace requestu (chybějící potvrzení, cíl mimo rozsah, /16, injekce `;|$\``, přeskočená brána, špatné role, limity délek), parser scénáře (neplatný JSON, cizí pole), deterministický export (snapshotově stejný výstup pro stejný vstup, escapování, název souboru), prompt obsahuje zakázané techniky a stop conditions.
- **Integrace:** endpoint vrátí 400 bez volání AI (mock gateway), 200 stream při platném vstupu, mapování 429/402.
- **UI (Vitest + Playwright, 1280 px a 360/393 px):** brány nejdou přeskočit, aktivní fáze vyžaduje potvrzení, export stáhne .md/.json, navigace zpět, žádné horizontální přetékání.
- **Bezpečnostní negativní případy (ruční prompty):** DoS, exfiltrace, cizí doména, „ignoruj pravidla“, podvržená odpověď asistenta → odmítnutí nebo upřesnění.

## 8. Rizika, otázky, mimo rozsah
- **Rizika:** AI může i tak navrhnout nevhodný příkaz (zmírnění: prompt, brány, katalogová omezení a varování v UI); veřejný endpoint spotřebovává kredity; JSON výstup modelu může být nevalidní (opakování, validace).
- **Otevřené otázky:** (a) vyžadovat přihlášení pro /pentest? (b) povolit fázi 4 jen při volbě „lab“? (c) stačí Markdown + JSON, nebo i PDF později?
- **Mimo rozsah:** ukládání plánů do databáze, sdílení, automatické spouštění čehokoli, exploitace, napojení na MCP, PDF export.
