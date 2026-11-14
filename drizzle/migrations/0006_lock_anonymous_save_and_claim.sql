REVOKE EXECUTE ON FUNCTION public.kalicmd_claim_scripts(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.kalicmd_save_script(uuid, text, text) FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION public.kalicmd_claim_scripts(uuid) IS 'DEPRECATED: browser session ids cannot prove ownership';
COMMENT ON FUNCTION public.kalicmd_save_script(uuid, text, text) IS 'DEPRECATED: saving requires sign-in (RLS insert)';