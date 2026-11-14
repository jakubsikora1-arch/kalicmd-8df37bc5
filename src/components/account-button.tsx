import { useState } from "react";
import { LogIn, LogOut, UserRound } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const googleLogo = (
  <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
);

export function AccountButton({ user, ready }: { user: User | null; ready: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState("");

  async function signIn(provider: "google" | "apple") {
    setPending(provider);
    setError("");
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) {
      setError("Přihlášení se nepodařilo. Zkus to prosím znovu.");
      setPending(null);
      return;
    }
    if (result.redirected) return;
    setPending(null);
    setOpen(false);
  }

  if (!ready) return null;
  if (user) {
    const label = user.email ?? "Účet";
    return (
      <div className="account-chip">
        <UserRound size={14} aria-hidden="true" />
        <span className="account-email" title={label}>{label}</span>
        <Button variant="ghost" size="sm" onClick={() => { void supabase.auth.signOut(); }}><LogOut />Odhlásit</Button>
      </div>
    );
  }
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => { setError(""); setOpen(true); }}><LogIn />Přihlásit</Button>
      <Dialog open={open} onOpenChange={value => { if (!pending) setOpen(value); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Přihlášení do KaliCmd</DialogTitle>
            <DialogDescription>Uložené skripty pak uvidíš na všech svých zařízeních a nikdo jiný k nim nemá přístup. Skripty uložené v tomto prohlížeči se přesunou do účtu.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <button type="button" className="oauth-btn oauth-google" disabled={pending !== null} onClick={() => { void signIn("google"); }}>
              {googleLogo}<span>{pending === "google" ? "Přesměrovávám…" : "Pokračovat přes Google"}</span>
            </button>
            <button type="button" className="oauth-btn oauth-apple" disabled={pending !== null} onClick={() => { void signIn("apple"); }}>
              <span>{pending === "apple" ? "Přesměrovávám…" : "Pokračovat přes Apple"}</span>
            </button>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
