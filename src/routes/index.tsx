import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { ArrowUpRight, BookmarkPlus, Check, ChevronRight, Copy, Crosshair, Download, EthernetPort, FileCode2, Fingerprint, Network, RotateCcw, ShieldCheck, Terminal, Trash2, Waves, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import logo from "@/assets/logo.png";
import { ScriptDownload } from "@/components/script-download";
import { downloadScript, extractBashScript } from "@/lib/bash-script";
import type { GenerationMode } from "@/lib/chat-request";
import { deleteSavedScript, listSavedScripts, recordUsage, saveSavedScript, type SavedScript } from "@/lib/saved-scripts";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "KaliCmd — Bash příkazy s Claudem" },
    { name: "description", content: "Vytvářejte a vysvětlujte příkazy pro Kali Linux, Nmap, hashcat a další bezpečnostní nástroje s AI Claude." },
    { property: "og:title", content: "KaliCmd — Bash příkazy s Claudem" },
    { property: "og:description", content: "Váš AI parťák pro terminál a autorizované bezpečnostní testování." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

const tools = [
  { name: "Nmap", icon: Network, category: "PRŮZKUM SÍTĚ", example: "Zjisti otevřené porty a verze služeb na mém laboratorním stroji 192.168.56.10 pomocí Nmap." },
  { name: "hashcat", icon: Fingerprint, category: "AUDIT HESEL", example: "Jak v hashcat ověřím své vlastní SHA-256 hashe ze souboru hashes.txt pomocí slovníku?" },
  { name: "Wireshark", icon: Waves, category: "ANALÝZA PROVOZU", example: "Napiš tshark příkaz pro zachycení DNS dotazů na mém rozhraní eth0." },
  { name: "Metasploit", icon: Crosshair, category: "BEZPEČNOSTNÍ TESTY", example: "Jak v Metasploit konzoli vyhledám moduly pro SSH a zobrazím jejich nápovědu?" },
];

function Index() {
  const [mode, setMode] = useState<GenerationMode>("command");
  const [finishedScripts, setFinishedScripts] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"ready" | "submitted" | "streaming">("ready");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [savedError, setSavedError] = useState("");
  const [savingFor, setSavingFor] = useState<string | null>(null);
  const [savedFor, setSavedFor] = useState<Record<string, boolean>>({});
  const textarea = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const prompts = useRef<Record<string, string>>({});
  const busy = status !== "ready";
  useEffect(() => { textarea.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => () => { abortRef.current?.abort(); }, []);
  useEffect(() => {
    let active = true;
    void listSavedScripts()
      .then(rows => { if (active) setSavedScripts(rows); })
      .catch(() => { if (active) setSavedError("Uložené skripty se nepodařilo načíst."); });
    return () => { active = false; };
  }, []);

  function choose(text: string) {
    setInput(text);
    textarea.current?.focus({ preventScroll: true });
  }

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const user: UIMessage = { id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text: text.trim() }] };
    const history = [...messages, user];
    setMessages(history);
    setInput("");
    setError("");
    setStatus("submitted");
    textarea.current?.focus({ preventScroll: true });
    const abort = new AbortController();
    abortRef.current = abort;
    const id = crypto.randomUUID();
    prompts.current[id] = text.trim();
    let answer = "";
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, messages: history.map(m => ({ role: m.role, content: m.parts.flatMap(p => p.type === "text" ? [p.text] : []).join("\n") })) }),
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
      textarea.current?.focus({ preventScroll: true });
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
      setSavedScripts(await listSavedScripts());
      setSavedFor(previous => ({ ...previous, [messageId]: true }));
      void recordUsage("save_script");
    } catch {
      setError("Skript se nepodařilo uložit. Zkuste to znovu.");
    } finally {
      setSavingFor(null);
    }
  }

  async function removeScript(id: string) {
    try {
      await deleteSavedScript(id);
      setSavedScripts(previous => previous.filter(item => item.id !== id));
    } catch {
      setError("Skript se nepodařilo smazat.");
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <a href="/" className="brand" aria-label="KaliCmd – domů"><img src={logo} width={44} height={44} alt="" /><span>Kali<span className="text-primary">Cmd</span><span className="brand-cursor">_</span></span></a>
        <div className="header-right"><span className="header-caption">TVŮJ PARŤÁK V TERMINÁLU</span><span className="model-badge"><span className="status-dot" />Claude Sonnet 5</span></div>
      </header>

      <div className="workspace">
        <aside className="tool-sidebar">
          <div className="sidebar-label"><Terminal size={14} /> PRACOVNÍ PROSTOR</div>
          <div className="sidebar-active"><ChevronRight size={16} /> Generátor příkazů</div>
          <div className="sidebar-label mt-10">NÁSTROJE</div>
          {tools.map(t => <Button key={t.name} variant="ghost" className="sidebar-tool" onClick={() => choose(t.example)}><t.icon />{t.name}<ChevronRight className="ml-auto opacity-40" /></Button>)}
          <Button variant="ghost" className="sidebar-tool" onClick={() => choose("Napiš Bash příkaz pro vyhledání všech souborů větších než 100 MB v mém domovském adresáři.")}><Terminal />Bash / Linux<ChevronRight className="ml-auto opacity-40" /></Button>
          <div className="sidebar-bottom"><ShieldCheck size={18} /><div>Pouze s oprávněním<span>Testuj zodpovědně.</span></div></div>
        </aside>

        <main className="main-workspace">
          <div className="workspace-bar"><div className="flex items-center gap-2"><span className="text-primary">~/</span> generátor <span className="text-muted-foreground">/ bash</span></div><div className="flex items-center gap-1"><Button variant="ghost" size="sm" className="text-muted-foreground" aria-pressed={showSaved} onClick={() => { setShowSaved(value => !value); setSavedError(""); }}><BookmarkPlus />Uložené{savedScripts.length > 0 ? ` (${savedScripts.length})` : ""}</Button><Button variant="ghost" size="icon-sm" title="Vymazat konverzaci" aria-label="Vymazat konverzaci" disabled={busy || messages.length === 0} onClick={() => { setMessages([]); setFinishedScripts({}); setError(""); setInput(""); textarea.current?.focus(); }}><RotateCcw /></Button></div></div>

          {showSaved && (
            <div className="saved-panel">
              <div className="saved-inner">
                <div className="saved-head"><span className="saved-title">ULOŽENÉ SKRIPTY</span><Button variant="ghost" size="icon-sm" title="Zavřít uložené skripty" aria-label="Zavřít uložené skripty" onClick={() => setShowSaved(false)}><X /></Button></div>
                {savedError && <div role="alert" className="error-notice">{savedError}</div>}
                {savedScripts.length === 0 && !savedError ? (
                  <p className="text-xs text-muted-foreground">Zatím nic uloženého. U vygenerovaného skriptu klikni na „Uložit“.</p>
                ) : savedScripts.map(item => (
                  <div className="saved-item" key={item.id}>
                    <div className="min-w-0"><div className="truncate text-sm text-foreground">{item.title}</div><div className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleString("cs-CZ")} · {item.script.split("\n").filter(Boolean).length} řádků</div></div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="icon-sm" title="Kopírovat skript" aria-label="Kopírovat skript" onClick={() => { void copy(item.id, item.script); }}><Copy /></Button>
                      <Button variant="ghost" size="icon-sm" title="Stáhnout skript" aria-label="Stáhnout skript" onClick={() => { downloadScript(item.script); void recordUsage("download_script"); }}><Download /></Button>
                      <Button variant="ghost" size="icon-sm" title="Smazat skript" aria-label="Smazat skript" onClick={() => { void removeScript(item.id); }}><Trash2 /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Conversation className="transcript">
            <ConversationContent className="conversation-inner">
              {messages.length === 0 ? (
                <div className="welcome">
                  <div className="welcome-mark"><img src={logo} width={88} height={88} alt="" /></div>
                  <div className="eyebrow"><span className="text-primary">$</span> PŘIROZENÝ JAZYK → BASH</div>
                  <h1>KaliCmd<span className="text-primary">_</span></h1>
                  <p className="welcome-description">Co dnes potřebuješ<br className="sm:hidden" /> dostat do terminálu?</p>
                  <div className="suggestions">
                    {tools.map((t, i) => <button type="button" key={t.name} className="suggestion" onClick={() => choose(t.example)}><div className="suggestion-top"><t.icon size={19} /><span>{t.category}</span><ArrowUpRight size={16} /></div><span className="suggestion-title">{["Prozkoumat síť", "Ověřit hashe", "Zachytit DNS provoz", "Najít správný modul"][i]}</span><span className="suggestion-tool">{t.name} <ChevronRight size={13} /></span></button>)}
                  </div>
                  <div className="welcome-terminal"><span className="text-primary">┌──(kali㉿kali)-[~]</span><br /><span className="text-primary">└─$ </span><span>připraven na další příkaz</span><span className="terminal-cursor" /></div>
                </div>
              ) : messages.map(message => {
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

          <div className="composer-area">
            <div role="group" aria-label="Režim generování" className="mb-3 flex w-fit gap-1 rounded-md border border-border bg-background p-1">
              <Button size="sm" variant={mode === "command" ? "secondary" : "ghost"} aria-pressed={mode === "command"} disabled={busy} onClick={() => setMode("command")}><Terminal />Příkaz</Button>
              <Button size="sm" variant={mode === "script" ? "secondary" : "ghost"} aria-pressed={mode === "script"} disabled={busy} onClick={() => setMode("script")}><FileCode2 />Skript .sh</Button>
            </div>
            {error && <div role="alert" className="error-notice">{error}</div>}
            <PromptInput className="command-composer" onSubmit={({ text }) => { void send(text); }}>
              <PromptInputTextarea ref={textarea} value={input} onChange={e => setInput(e.target.value)} placeholder={mode === "script" ? "Popiš, co má skript udělat…" : "Popiš, co chceš udělat…"} maxLength={8000} aria-label="Zadání příkazu" />
               <PromptInputFooter><div className="composer-language"><Terminal size={14} /> BASH <span>/</span> KALI LINUX</div><PromptInputSubmit status={status} disabled={!busy && !input.trim()} onStop={() => abortRef.current?.abort()} aria-label={busy ? "Zastavit odpověď" : mode === "script" ? "Vygenerovat skript" : "Vygenerovat příkaz"} /></PromptInputFooter>
            </PromptInput>
            <div className="composer-note"><ShieldCheck size={12} /><span>Příkazy před spuštěním ověř. Pouze pro autorizované testování.</span></div>
          </div>
          <footer className="workspace-footer"><span><span className="status-dot" /> BEZ PŘIHLÁŠENÍ · SKRIPTY ULOŽENÉ V TOMTO PROHLÍŽEČI</span><span className="footer-right"><EthernetPort size={12} /> KALI LINUX / GNU BASH</span></footer>
        </main>
      </div>
    </div>
  );
}
