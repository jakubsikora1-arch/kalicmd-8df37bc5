import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/lib/session-id";

export type SavedScript = {
  id: string;
  title: string;
  script: string;
  created_at: string;
};

export type UsageEvent = "copy_command" | "download_script" | "save_script";

export async function listSavedScripts(): Promise<SavedScript[]> {
  const { data, error } = await supabase.rpc("kalicmd_list_scripts", { _session: getSessionId() });
  if (error) throw error;
  return data ?? [];
}

export async function saveSavedScript(title: string, script: string): Promise<string> {
  const { data, error } = await supabase.rpc("kalicmd_save_script", {
    _session: getSessionId(),
    _title: title,
    _script: script,
  });
  if (error) throw error;
  return data as string;
}

export async function deleteSavedScript(id: string): Promise<void> {
  const { error } = await supabase.rpc("kalicmd_delete_script", { _session: getSessionId(), _id: id });
  if (error) throw error;
}

// Best-effort: losing a usage record must never break the chat.
export async function recordUsage(event: UsageEvent): Promise<void> {
  try {
    await supabase.rpc("kalicmd_record_usage", { _session: getSessionId(), _event: event });
  } catch {
    // ignored on purpose
  }
}
