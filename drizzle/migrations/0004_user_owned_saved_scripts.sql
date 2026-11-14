ALTER TABLE public.saved_scripts ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS saved_scripts_user_id_idx ON public.saved_scripts(user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.saved_scripts TO authenticated;
GRANT ALL ON public.saved_scripts TO service_role;
ALTER TABLE public.saved_scripts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners read their scripts" ON public.saved_scripts;
DROP POLICY IF EXISTS "Owners insert their scripts" ON public.saved_scripts;
DROP POLICY IF EXISTS "Owners delete their scripts" ON public.saved_scripts;
CREATE POLICY "Owners read their scripts" ON public.saved_scripts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert their scripts" ON public.saved_scripts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND char_length(script) <= 100000 AND char_length(title) <= 80);
CREATE POLICY "Owners delete their scripts" ON public.saved_scripts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Anonymous browser-session functions only see unclaimed rows.
CREATE OR REPLACE FUNCTION public.kalicmd_list_scripts(_session uuid)
RETURNS TABLE(id uuid, title text, script text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.title, s.script, s.created_at FROM public.saved_scripts s
  WHERE s.session_id = _session AND s.user_id IS NULL
  ORDER BY s.created_at DESC LIMIT 50
$$;

CREATE OR REPLACE FUNCTION public.kalicmd_delete_script(_session uuid, _id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.saved_scripts WHERE id = _id AND session_id = _session AND user_id IS NULL
$$;

-- Moves this browser's anonymous scripts to the signed-in account.
CREATE OR REPLACE FUNCTION public.kalicmd_claim_scripts(_session uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  UPDATE public.saved_scripts SET user_id = auth.uid()
  WHERE session_id = _session AND user_id IS NULL;
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END $$;
REVOKE ALL ON FUNCTION public.kalicmd_claim_scripts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kalicmd_claim_scripts(uuid) TO authenticated;