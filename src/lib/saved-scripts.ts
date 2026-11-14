import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/lib/session-id";

export type SavedScript = {
  id: string;
  title: string;
  script: string;
  created_at: string;
};

export type UsageEvent = "copy_command" | "download_script" | "save_script";

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

// Signed-in users own rows via RLS; anonymous visitors can only save (write-only) until they sign in.
export async function listSavedScripts(): Promise<SavedScript[]> {
  const userId = await currentUserId();
  if (userId) {
    const { data, error } = await supabase.from("saved_scripts").select("id,title,script,created_at").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return data ?? [];
  }
  // Anonymous visitors cannot read saved scripts; they appear after sign-in.
  return [];
}

export async function saveSavedScript(title: string, script: string): Promise<string> {
  const userId = await currentUserId();
  if (userId) {
    const { data, error } = await supabase.from("saved_scripts").insert({ user_id: userId, session_id: getSessionId(), title, script }).select("id").single();
    if (error) throw error;
    return data.id;
  }
  const { data, error } = await supabase.rpc("kalicmd_save_script", { _session: getSessionId(), _title: title, _script: script });
  if (error) throw error;
  return data as string;
}

export async function deleteSavedScript(id: string): Promise<void> {
  const userId = await currentUserId();
  if (userId) {
    const { error } = await supabase.from("saved_scripts").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  throw new Error("Pro mazání skriptů se přihlas.");
}

// Moves scripts saved anonymously in this browser into the signed-in account.
export async function claimBrowserScripts(): Promise<number> {
  const { data, error } = await supabase.rpc("kalicmd_claim_scripts", { _session: getSessionId() });
  if (error) throw error;
  return data ?? 0;
}

// Best-effort: losing a usage record must never break the chat.
export async function recordUsage(event: UsageEvent): Promise<void> {
  try {
    await supabase.rpc("kalicmd_record_usage", { _session: getSessionId(), _event: event });
  } catch {
    // ignored on purpose
  }
}
