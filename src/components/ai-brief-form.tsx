import { useId, useState } from "react";
import { Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tool } from "@/lib/tool-catalog";
import type { GenerationMode } from "@/lib/chat-request";
import { briefDefaults, briefOutputs, briefTempos, buildAiBrief, type AiBriefValues } from "@/lib/ai-brief";

export function AiBriefForm({ tool, signedIn, busy, onSubmit }: { tool: Tool; signedIn: boolean; busy: boolean; onSubmit: (message: string, mode: GenerationMode) => void }) {
  const [values, setValues] = useState<AiBriefValues>(briefDefaults);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const id = useId();
  const set = <K extends keyof AiBriefValues>(key: K, value: AiBriefValues[K]) => { setValues(v => ({ ...v, [key]: value })); setErrors({}); };
  const err = (key: string) => errors[key] && <p id={`${id}-${key}-error`} role="alert" className="mt-2 text-xs text-destructive">{errors[key]}</p>;
  return (
    <section aria-label="Zadání pro AI" className="min-w-0">
      <h2 className="mb-1 flex items-center gap-2 font-sans text-lg font-semibold text-primary"><Sparkles size={20} />Zadání pro AI</h2>
      <p className="mb-4 text-xs leading-5 text-muted-foreground">Vyplň, co potřebuješ, a AI vytvoří příkaz {tool.name} přesně podle zadání.</p>
      <form noValidate onSubmit={event => {
        event.preventDefault();
        const result = buildAiBrief(values, tool.id);
        if (!result.ok) { setErrors(result.errors); return; }
        onSubmit(result.message, result.mode);
      }}>
        <label htmlFor={`${id}-goal`} className="mb-2 block text-sm">Co chceš udělat</label>
        <Textarea id={`${id}-goal`} value={values.goal} maxLength={600} rows={3} placeholder="např. zjistit otevřené webové porty a verze služeb" aria-invalid={Boolean(errors["goal"])} aria-describedby={errors["goal"] ? `${id}-goal-error` : undefined} onChange={e => set("goal", e.target.value)} />
        {err("goal")}
        <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor={`${id}-target`} className="mb-2 block text-sm">Cíl (volitelné)</label>
            <Input id={`${id}-target`} className="min-h-11" value={values.target} maxLength={253} autoComplete="off" spellCheck={false} placeholder="192.168.56.101" aria-invalid={Boolean(errors["target"])} aria-describedby={errors["target"] ? `${id}-target-error` : undefined} onChange={e => set("target", e.target.value)} />
            {err("target")}
          </div>
          <div className="min-w-0">
            <label htmlFor={`${id}-tempo`} className="mb-2 block text-sm">Tempo</label>
            <Select value={values.tempo} onValueChange={v => set("tempo", v as AiBriefValues["tempo"])}>
              <SelectTrigger id={`${id}-tempo`} className="min-h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{briefTempos.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="min-w-0">
            <label htmlFor={`${id}-output`} className="mb-2 block text-sm">Výstup</label>
            <Select value={values.output} onValueChange={v => set("output", v as AiBriefValues["output"])}>
              <SelectTrigger id={`${id}-output`} className="min-h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{briefOutputs.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="min-w-0">
            <label htmlFor={`${id}-constraints`} className="mb-2 block text-sm">Další omezení (volitelné)</label>
            <Input id={`${id}-constraints`} className="min-h-11" value={values.constraints} maxLength={300} placeholder="např. bez sudo, výstup do souboru" aria-invalid={Boolean(errors["constraints"])} aria-describedby={errors["constraints"] ? `${id}-constraints-error` : undefined} onChange={e => set("constraints", e.target.value)} />
            {err("constraints")}
          </div>
        </div>
        {errors["form"] && <p role="alert" className="mt-3 text-sm text-destructive">{errors["form"]}</p>}
        <p className="my-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck size={16} className="mt-0.5 shrink-0" />Pouze vlastní systémy nebo výslovně autorizované cíle. Nic se automaticky nespouští.</p>
        <Button type="submit" disabled={!signedIn || busy}><Sparkles />Vygenerovat pomocí AI</Button>
        {!signedIn && <p className="mt-2 text-xs text-muted-foreground">Pro použití AI se přihlas (tlačítko účtu nahoře).</p>}
      </form>
    </section>
  );
}
