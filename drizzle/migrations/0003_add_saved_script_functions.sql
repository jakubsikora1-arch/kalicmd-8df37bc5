ALTER TABLE public.usage_events
  ADD CONSTRAINT usage_events_event_allowed CHECK (event IN ('copy_command', 'download_script', 'save_script'));

CREATE OR REPLACE FUNCTION public.kalicmd_save_script(_session uuid, _title text, _script text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_id uuid;
BEGIN
  IF _session IS NULL THEN RAISE EXCEPTION 'missing session'; END IF;
  IF _script IS NULL OR char_length(_script) = 0 THEN RAISE EXCEPTION 'missing script'; END IF;
  IF char_length(_script) > 100000 THEN RAISE EXCEPTION 'script too large'; END IF;
  INSERT INTO public.saved_scripts (session_id, title, script)
  VALUES (_session, coalesce(nullif(left(trim(coalesce(_title, '')), 80), ''), 'Skript'), _script)
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.kalicmd_list_scripts(_session uuid)
RETURNS TABLE(id uuid, title text, script text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.title, s.script, s.created_at
  FROM public.saved_scripts s
  WHERE s.session_id = _session
  ORDER BY s.created_at DESC
  LIMIT 50
$$;

CREATE OR REPLACE FUNCTION public.kalicmd_delete_script(_session uuid, _id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.saved_scripts s WHERE s.id = _id AND s.session_id = _session
$$;

CREATE OR REPLACE FUNCTION public.kalicmd_record_usage(_session uuid, _event text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _event NOT IN ('copy_command', 'download_script', 'save_script') THEN RAISE EXCEPTION 'unknown event'; END IF;
  INSERT INTO public.usage_events (session_id, event) VALUES (_session, _event);
END $$;

GRANT EXECUTE ON FUNCTION public.kalicmd_save_script(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kalicmd_list_scripts(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kalicmd_delete_script(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kalicmd_record_usage(uuid, text) TO anon, authenticated;

REVOKE SELECT, INSERT, DELETE ON public.saved_scripts FROM anon;
REVOKE INSERT ON public.usage_events FROM anon;

COMMENT ON TABLE public.saved_scripts IS 'ACCESS VIA FUNCTIONS ONLY: the browser saves, lists and deletes through kalicmd_save_script / kalicmd_list_scripts / kalicmd_delete_script, each scoped to the caller session uuid. Direct anon table access is revoked; the header-based policies below are retired and deny everything.';
COMMENT ON TABLE public.usage_events IS 'ACCESS VIA FUNCTIONS ONLY: the browser records through kalicmd_record_usage. Direct anon table access is revoked.';

CREATE OR REPLACE FUNCTION public.kalicmd_request_probe()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT NULL::json $$;

REVOKE EXECUTE ON FUNCTION public.kalicmd_request_probe() FROM anon, authenticated;