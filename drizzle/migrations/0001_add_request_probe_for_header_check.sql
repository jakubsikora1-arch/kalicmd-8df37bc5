CREATE OR REPLACE FUNCTION public.kalicmd_request_probe()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'x_session_id', current_setting('request.header.x_session_id', true),
    'settings', (SELECT coalesce(json_agg(json_build_object('name', name, 'value', setting)), '[]'::json) FROM pg_settings WHERE name LIKE 'request%')
  )
$$;

GRANT EXECUTE ON FUNCTION public.kalicmd_request_probe() TO anon, authenticated;