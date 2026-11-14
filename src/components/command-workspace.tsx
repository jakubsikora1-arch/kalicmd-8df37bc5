import { Link } from "@tanstack/react-router";
import { useWebMCP } from "use-webmcp-tool";
import { getCatalogTool, listCatalog } from "@/lib/catalog-output";
import { runWebMCPTool } from "@/lib/webmcp-telemetry";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { ArrowLeft, ArrowUpRight, BookmarkPlus, Check, ChevronRight, Copy, Download, EthernetPort, FileCode2, RotateCcw, ShieldCheck, Terminal, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { catalogTitle, toolCatalog, toolPrefix, scopedInput, type Tool } from "@/lib/tool-catalog";
import { ToolGuide } from "@/components/tool-guide";
import { ParameterizedCommandGenerator } from "@/components/parameterized-command-generator";
import logo from "@/assets/logo.png";
import { ConfirmAction } from "@/components/confirm-action";
import { ScriptDownload } from "@/components/script-download";
import { downloadScript, extractBashScript } from "@/lib/bash-script";
import type { GenerationMode } from "@/lib/chat-request";
import { AccountButton } from "@/components/account-button";
import { useAuth } from "@/hooks/use-auth";
import { deleteSavedScript, listSavedScripts, recordUsage, saveSavedScript, type SavedScript } from "@/lib/saved-scripts";

const tools = toolCatalog;

export function CommandWorkspace({ tool }: { tool?: Tool }) {
  const [mode, setMode] = useState<GenerationMode>("command");
  const [showParameters, setShowParameters] = useState(Boolean(tool));
  const [finishedScripts, setFinishedScripts] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState(toolPrefix(tool));
  const [status, setStatus] = useState<"ready" | "submitted" | "streaming">("ready");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [savedError, setSavedError] = useState("");
  const [savedLoading, setSavedLoading] = useState(true);
  const [confirmation, setConfirmation] = useState<{ kind: "reset" } | { kind: "script"; item: SavedScript } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [composerActive, setComposerActive] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const mounted = useRef(false);
  const [savingFor, setSavingFor] = useState<string | null>(null);
  const [savedFor, setSavedFor] = useState<Record<string, boolean>>({});
  const textarea = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const prompts = useRef<Record<string, string>>({});
  const busy = status !== "ready";

  useWebMCP({
    name: "read_kali_page",
    description: "Přečte veřejný katalog na hlavní stránce nebo příkazy právě otevřeného nástroje; nemění stránku.",
    annotations: { readOnlyHint: true },
    execute: () => runWebMCPTool("read_kali_page", () => {
      if (!tool) return listCatalog().map(t => `${t.rank}. ${t.name} (${t.id}) — ${t.category}`).join("\n");
      const detail = getCatalogTool(tool.id);
      return `${detail.name}\n${detail.description}\n${detail.control}\n${detail.commands.map(c => `${c.type}: ${c.command} — ${c.description}`).join("\n")}\nPříklad (${detail.exampleType}): ${detail.example}\n${detail.exampleDescription}`;
    }),
  });

  useEffect(() => () => { abortRef.current?.abort(); }, []);
  const loadSaved = useCallback(async () => {
    setSavedLoading(true);
    setSavedError("");
    try {
      const rows = await listSavedScripts();
      if (mounted.current) setSavedScripts(rows);
    } catch {
      if (mounted.current) setSavedError("Uložené skripty se nepodařilo načíst. Zkontroluj připojení a zkus to znovu.");
    } finally {
      if (mounted.current) setSavedLoading(false);
    }
  }, []);
  const { user, ready } = useAuth();
  const userId = user?.id ?? null;
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    void loadSaved();
  }, [ready, userId, loadSaved]);

  function choose(text: string) {
    setInput(text);
    textarea.current?.focus({ preventScroll: true });
  }

  async function send(text: string) {
    if (!text.trim() || text.trim() === toolPrefix(tool).trim() || busy) return;
    text = scopedInput(text, tool);
    const user: UIMessage = { id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text: text.trim() }] };
    const history = [...messages, user];
    setMessages(history);
    setInput(toolPrefix(tool));
    setError("");
    setStatus("submitted");
    const abort = new AbortController();
    abortRef.current = abort;
    const id = crypto.randomUUID();
    prompts.current[id] = text.trim();
    let answer = "";
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, tool: tool?.id, messages: history.map(m => ({ role: m.role, content: m.parts.flatMap(p => p.type === "text" ? [p.text] : []).join("\n") })) }),
        signal: abort.signal,
      });
      if (!response.ok) throw new Error(await response.text() || "Odpověď se nepodařila. Zkuste to znovu.");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Odpověď je prázdná.");
      const decoder = new TextDecoder();
      setStatus("streaming");
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        const result: UIMessage = { id, role: "assistant", parts: [{ type: "text", text: answer }] };
        setMessages([...history, result]);
      }
      if (!answer) throw new Error("Claude nevrátil žádný text. Zkuste požadavek upravit.");
      if (mode === "script" && !abort.signal.aborted && !answer.includes("_[Odpověď byla přerušena.]_")) {
        const script = extractBashScript(answer);
        if (script) setFinishedScripts(previous => ({ ...previous, [id]: script }));
        else setError("Odpověď neobsahuje kompletní Bash skript ke stažení. Požádej o kratší úplný skript.");
      }
    } catch (err) {
      if (!abort.signal.aborted) { setError(err instanceof Error ? err.message : "Spojení s AI se nezdařilo."); setInput(text); }
    } finally {
      setStatus("ready");
      abortRef.current = null;
    }
  }

  async function copy(id: string, text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 1800); void recordUsage("copy_command"); }
    catch { setError("Kopírování není dostupné. Označte příkaz a zkopírujte jej ručně."); }
  }

  async function saveScript(messageId: string, script: string) {
    setSavingFor(messageId);
    setError("");
    try {
      const prompt = prompts.current[messageId] ?? "";
      const title = prompt.split("\n")[0]?.trim().slice(0, 80) || "Skript";
      await saveSavedScript(title, script);
      if (userId) await loadSaved();
      setSavedFor(previous => ({ ...previous, [messageId]: true }));
      void recordUsage("save_script");
    } catch {
      setError(userId ? "Skript se nepodařilo uložit. Zkuste to znovu." : "Pro uložení skriptu se přihlas (vpravo nahoře). Stáhnout ho můžeš i bez přihlášení.");
    } finally {
      setSavingFor(null);
    }
  }

  async function confirmRemoval() {
    if (!confirmation || deleting) return;
    if (confirmation.kind === "reset") {
      setMessages([]);
      setFinishedScripts({});
      setSavedFor({});
      prompts.current = {};
      setError("");
      setInput(toolPrefix(tool));
      setConfirmation(null);
      return;
    }
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteSavedScript(confirmation.item.id);
      setSavedScripts(previous => previous.filter(item => item.id !== confirmation.item.id));
      setConfirmation(null);
    } catch {
      setDeleteError("Skript se nepodařilo smazat. Zkontroluj připojení a zkus to znovu.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand" aria-label="KaliCmd – domů"><img src={logo} width={44} height={44} alt="" /><span>Kali<span className="text-primary">Cmd</span><span className="brand-cursor">_</span></span></Link>
        <div className="header-right"><span className="header-caption">TVŮJ PARŤÁK V TERMINÁLU</span><span className="model-badge"><span className="status-dot" />Claude Sonnet 5</span><AccountButton user={user} ready={ready} /></div>
      </header>

      <div className="workspace">
        <aside className="tool-sidebar">
          <div className="sidebar-label"><Terminal size={14} /> PRACOVNÍ PROSTOR</div>
          <Button asChild variant="ghost" className="sidebar-tool"><Link to="/"><Terminal />Generátor příkazů</Link></Button>
          <div className="sidebar-label mt-10">NÁSTROJE</div>
          {tools.map(t => <Button key={t.name} asChild variant="ghost" className="sidebar-tool"><Link to="/tools/$tool" params={{ tool: t.id }} aria-current={tool?.id === t.id ? "page" : undefined}><t.icon />{t.name}<ChevronRight className="ml-auto opacity-40" /></Link></Button>)}
          {!tool && <Button variant="ghost" className="sidebar-tool" onClick={() => choose("Napiš Bash příkaz pro vyhledání všech souborů větších než 100 MB v mém domovském adresáři.")}><Terminal />Bash / Linux<ChevronRight className="ml-auto opacity-40" /></Button>}
          <div className="sidebar-bottom"><ShieldCheck size={18} /><div>Pouze s oprávněním<span>Testuj zodpovědně.</span></div></div>
        </aside>

        <main className="main-workspace">
          <div className="workspace-bar"><div className="flex items-center gap-2">{tool && <Button asChild variant="ghost" size="icon-sm"><Link to="/" aria-label="Zpět na hlavní stránku" title="Zpět na hlavní stránku"><ArrowLeft /></Link></Button>}<span className="text-primary">~/</span> {tool ? tool.name : "generátor"} <span className="text-muted-foreground">/ bash</span></div><div className="flex items-center gap-1"><Button variant="ghost" size="sm" className="text-muted-foreground" aria-pressed={showSaved} aria-expanded={showSaved} aria-controls="saved-scripts" onClick={() => { setShowSaved(value => !value); }}><BookmarkPlus />Uložené{savedScripts.length > 0 ? ` (${savedScripts.length})` : ""}</Button><Button variant="ghost" size="icon-sm" title="Vymazat konverzaci" aria-label="Vymazat konverzaci" disabled={busy || messages.length === 0} onClick={() => { setDeleteError(""); setConfirmation({ kind: "reset" }); }}><RotateCcw /></Button></div></div>

          {showSaved && (
            <section id="saved-scripts" aria-label="Uložené skripty" aria-busy={savedLoading} className="saved-panel">
              <div className="saved-inner">
                <div className="saved-head"><span className="saved-title">ULOŽENÉ SKRIPTY</span><Button variant="ghost" size="icon-sm" title="Zavřít uložené skripty" aria-label="Zavřít uložené skripty" onClick={() => setShowSaved(false)}><X /></Button></div>
                {savedLoading && <p role="status" className="text-sm text-muted-foreground">Načítám skripty…</p>}
                {savedError && <div role="alert" className="error-notice"><p>{savedError}</p><Button variant="outline" size="sm" className="mt-2" onClick={() => { void loadSaved(); }}><RotateCcw />Zkusit znovu</Button></div>}
                {savedScripts.length === 0 && !savedError && !savedLoading ? (
                  <p className="text-xs text-muted-foreground">{user ? "Zatím žádné uložené skripty." : "Uložené skripty uvidíš po přihlášení."}</p>
                ) : !savedLoading && !savedError && savedScripts.map(item => (
                  <div className="saved-item" key={item.id}>
                    <div className="min-w-0"><div className="break-words text-sm text-foreground">{item.title}</div><div className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString("cs-CZ")} · {item.script.split("\n").filter(Boolean).length} řádků</div></div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="icon-sm" title="Kopírovat skript" aria-label="Kopírovat skript" onClick={() => { void copy(item.id, item.script); }}>{copied === item.id ? <Check className="text-primary" /> : <Copy />}</Button>
                      <Button variant="ghost" size="icon-sm" title="Stáhnout skript" aria-label="Stáhnout skript" onClick={() => { downloadScript(item.script); void recordUsage("download_script"); }}><Download /></Button>
                      <Button variant="ghost" size="icon-sm" title="Smazat skript" aria-label="Smazat skript" onClick={() => { setDeleteError(""); setConfirmation({ kind: "script", item }); }}><Trash2 /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {tool && <div role="group" aria-label="Zobrazení nástroje" className="flex shrink-0 gap-2 border-b border-border px-4 py-2"><Button size="sm" variant={showParameters ? "secondary" : "ghost"} aria-pressed={showParameters} onClick={() => setShowParameters(true)}>Parametry</Button><Button size="sm" variant={!showParameters ? "secondary" : "ghost"} aria-pressed={!showParameters} onClick={() => setShowParameters(false)}>Přehled a AI{messages.length ? ` (${messages.length})` : ""}</Button></div>}
          {tool && <div className={showParameters ? "welcome-scroll" : "hidden"}><div className="conversation-inner"><ParameterizedCommandGenerator initialTool={tool.id} /></div></div>}
          <div className={showParameters ? "hidden" : "flex min-h-0 flex-1 flex-col"}>
          {messages.length === 0 ? (
            <div className="welcome-scroll"><div className="conversation-inner">
                {tool ? <ToolGuide tool={tool} copied={copied} onCopy={(id, command) => { void copy(id, command); }} /> : <div className="welcome">
                  <div className="welcome-mark"><img src={logo} width={88} height={88} alt="" /></div>
                  <div className="eyebrow"><span className="text-primary">$</span> PŘIROZENÝ JAZYK → BASH</div>
                  <h1>KaliCmd<span className="text-primary">_</span></h1>
                  <p className="welcome-description">Co dnes potřebuješ<br className="sm:hidden" /> dostat do terminálu?</p>
                  <h2 className="mt-6 text-sm font-semibold text-primary">{catalogTitle}</h2>
                  <div className="suggestions">
                    {tools.map(t => <Button asChild variant="ghost" key={t.name} className="suggestion"><Link to="/tools/$tool" params={{ tool: t.id }}><div className="suggestion-top"><t.icon size={19} /><span>{t.category}</span><ArrowUpRight size={16} /></div><span className="suggestion-title">{t.name} <ChevronRight size={16} /></span></Link></Button>)}
                  </div>
                  <div className="welcome-terminal"><span className="text-primary">┌──(kali㉿kali)-[~]</span><br /><span className="text-primary">└─$ </span><span>připraven na další příkaz</span><span className="terminal-cursor" /></div>
                </div>}
            </div></div>
          ) : (
          <Conversation className="transcript">
            <ConversationContent className="conversation-inner">
              {messages.map(message => {
                const script = finishedScripts[message.id];
                return (
                <Message from={message.role} key={message.id}>
                  {message.role === "assistant" && <div className="assistant-label"><Terminal size={14} /> KALICMD <span>CLAUDE</span></div>}
                  <MessageContent>{message.parts.map((part, i) => part.type === "text" ? message.role === "assistant" ? <MessageResponse key={i}>{part.text}</MessageResponse> : <div key={i} className="whitespace-pre-wrap">{part.text}</div> : null)}</MessageContent>
                  {message.role === "assistant" && !busy && <div><Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { const text = message.parts.flatMap(p => p.type === "text" ? [p.text] : []).join("\n"); const blocks = [...text.matchAll(/```(?:bash|sh|shell)?\n([\s\S]*?)```/g)]; void copy(message.id, blocks.length ? blocks.map(b => b[1]?.trim()).join("\n\n") : text); }}>{copied === message.id ? <Check /> : <Copy />}{copied === message.id ? "Zkopírováno" : "Kopírovat příkazy"}</Button></div>}
                  {script && <ScriptDownload script={script} onCopy={text => { void copy(message.id, text); }} onSave={() => { void saveScript(message.id, script); }} saving={savingFor === message.id} saved={Boolean(savedFor[message.id])} onDownload={() => { void recordUsage("download_script"); }} />}
                </Message>
              ); })}
              {status === "submitted" && <Shimmer>{mode === "script" ? "Claude připravuje skript…" : "Claude připravuje příkaz…"}</Shimmer>}
            </ConversationContent>
            <ConversationScrollButton aria-label="Posunout na konec" />
          </Conversation>
          )}
          </div>

          <div className="composer-area">
            <div role="group" aria-label="Režim generování" className="mb-3 flex w-fit gap-1 rounded-md border border-border bg-background p-1">
              <Button size="sm" variant={mode === "command" ? "secondary" : "ghost"} aria-pressed={mode === "command"} disabled={busy} onClick={() => setMode("command")}><Terminal />Příkaz</Button>
              <Button size="sm" variant={mode === "script" ? "secondary" : "ghost"} aria-pressed={mode === "script"} disabled={busy} onClick={() => setMode("script")}><FileCode2 />Skript .sh</Button>
            </div>
            {error && <div role="alert" className="error-notice">{error}</div>}
            <PromptInput className="command-composer" onSubmit={({ text }) => { void send(text); }}>
              <PromptInputTextarea ref={textarea} value={input} onChange={e => setInput(scopedInput(e.target.value, tool))} onFocus={() => setComposerActive(true)} onBlur={() => setComposerActive(false)} className={composerActive || input.length > toolPrefix(tool).length ? "min-h-16 py-3" : "min-h-9 py-1.5"} placeholder={mode === "script" ? "Popiš, co má skript udělat…" : "Popiš, co chceš udělat…"} maxLength={8000} aria-label={mode === "script" ? "Zadání skriptu" : "Zadání příkazu"} />
               <PromptInputFooter><div className="composer-language"><Terminal size={14} /> BASH <span>/</span> {tool ? tool.name : "KALI LINUX"}</div><PromptInputSubmit status={status} disabled={!busy && (!input.trim() || input.trim() === toolPrefix(tool).trim())} onStop={() => abortRef.current?.abort()} aria-label={busy ? "Zastavit odpověď" : mode === "script" ? "Vygenerovat skript" : "Vygenerovat příkaz"} /></PromptInputFooter>
            </PromptInput>
            <div className="composer-note"><ShieldCheck size={12} /><span>Příkazy před spuštěním ověř. Pouze pro autorizované testování.</span></div>
          </div>
          <footer className="workspace-footer"><span><span className="status-dot" /> {user ? "PŘIHLÁŠENO · SKRIPTY ULOŽENÉ V TVÉM ÚČTU" : "BEZ PŘIHLÁŠENÍ · PRO ZOBRAZENÍ SKRIPTŮ SE PŘIHLAS"}</span><span className="footer-right"><EthernetPort size={12} /> KALI LINUX / GNU BASH</span></footer>
        </main>
      </div>
      <div role="status" aria-live="polite" className="sr-only">{copied ? "Zkopírováno do schránky." : ""}</div>
      <ConfirmAction open={confirmation !== null} title={confirmation?.kind === "reset" ? "Vymazat konverzaci?" : "Smazat uložený skript?"} description={confirmation?.kind === "script" ? `Skript „${confirmation.item.title}“ bude trvale odstraněn z uložených skriptů.` : "Všechny zprávy v tomto rozhovoru budou odstraněny. Uložené skripty zůstanou zachované."} pending={deleting} error={deleteError} onCancel={() => { if (!deleting) setConfirmation(null); }} onConfirm={() => { void confirmRemoval(); }} />
    </div>
  );
}
