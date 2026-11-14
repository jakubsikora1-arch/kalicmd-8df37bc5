import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { oauthReturnPath } from "@/lib/oauth-return-path";
import { Button } from "@/components/ui/button";
import { googleLogo } from "@/components/account-button";

type Details = { client?: { name?: string } | null; redirect_url?: string; redirect_to?: string } | null;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // SSR has no browser session.
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Připojení AI agenta — KaliCmd" },
      { name: "description", content: "Schválení přístupu AI agenta ke katalogu KaliCmd." },
      { property: "og:title", content: "Připojení AI agenta — KaliCmd" },
      { property: "og:description", content: "Schválení přístupu AI agenta ke katalogu KaliCmd." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id");
    if (!authorizationId) throw new Error("Chybí identifikátor žádosti o přístup.");
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return { signedIn: false as const, details: null };
    const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const details = data as Details;
    const immediate = details?.redirect_url ?? details?.redirect_to;
    if (immediate && !details?.client) throw redirect({ href: immediate });
    return { signedIn: true as const, details };
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md p-6"><h1 className="text-lg font-semibold">Žádost o přístup nelze načíst</h1><p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p></main>
  ),
});

function Consent() {
  const { signedIn, details } = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "AI agent";

  async function signIn(provider: "google" | "apple") {
    setBusy(true); setError(null);
    const next = oauthReturnPath(`/.lovable/oauth/consent?authorization_id=${encodeURIComponent(authorization_id)}`);
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: new URL(next, window.location.origin).href });
    if (result.error) { setBusy(false); setError("Přihlášení se nepodařilo. Zkus to znovu."); return; }
    if (result.redirected) return;
    window.location.reload();
  }

  async function decide(approve: boolean) {
    setBusy(true); setError(null);
    const { data, error } = approve
      ? await supabase.auth.oauth.approveAuthorization(authorization_id)
      : await supabase.auth.oauth.denyAuthorization(authorization_id);
    if (error) { setBusy(false); setError(error.message); return; }
    const target = (data as Details)?.redirect_url ?? (data as Details)?.redirect_to;
    if (!target) { setBusy(false); setError("Server nevrátil adresu pro návrat."); return; }
    window.location.href = target;
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
      <ShieldCheck className="text-primary" aria-hidden="true" />
      {signedIn ? (
        <>
          <h1 className="text-xl font-semibold">Připojit {clientName} k tvému účtu?</h1>
          <p className="text-sm text-muted-foreground">{clientName} bude moci číst veřejný katalog nástrojů KaliCmd jako ty. Nezíská přístup k tvým uloženým skriptům ani konverzacím.</p>
          <div className="flex gap-2">
            <Button disabled={busy} onClick={() => { void decide(true); }}>Povolit</Button>
            <Button variant="outline" disabled={busy} onClick={() => { void decide(false); }}>Zamítnout</Button>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold">Přihlas se pro připojení AI agenta</h1>
          <p className="text-sm text-muted-foreground">Po přihlášení se vrátíš sem a připojení schválíš.</p>
          <div className="grid gap-3">
            <button type="button" className="oauth-btn oauth-google" disabled={busy} onClick={() => { void signIn("google"); }}>{googleLogo}<span>Pokračovat přes Google</span></button>
            <button type="button" className="oauth-btn oauth-apple" disabled={busy} onClick={() => { void signIn("apple"); }}><span>Pokračovat přes Apple</span></button>
          </div>
        </>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </main>
  );
}
