CREATE OR REPLACE FUNCTION public.kalicmd_request_probe()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'current_user_name', current_user::text,
    'session_user_name', session_user::text,
    'jwt_claims', current_setting('request.jwt.claims', true),
    'role_guc', current_setting('role', true),
    'is_member_anon', pg_has_role('anon'::regrole, 'MEMBER'),
    'is_member_authenticated', pg_has_role('authenticated'::regrole, 'MEMBER'),
    'is_member_service_role', pg_has_role('service_role'::regrole, 'MEMBER'),
    'policies', (SELECT coalesce(json_agg(json_build_object('table', tablename, 'name', policyname, 'cmd', cmd, 'roles', array_to_string(roles, ','), 'qual', qual, 'check', with_check)), '[]'::json) FROM pg_policies WHERE schemaname = 'public')
  )
$$;