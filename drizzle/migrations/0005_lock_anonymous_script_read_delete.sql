REVOKE EXECUTE ON FUNCTION public.kalicmd_list_scripts(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.kalicmd_delete_script(uuid, uuid) FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION public.kalicmd_list_scripts(uuid) IS 'DEPRECATED: saved scripts are read only by signed-in owners via RLS';
COMMENT ON FUNCTION public.kalicmd_delete_script(uuid, uuid) IS 'DEPRECATED: saved scripts are deleted only by signed-in owners via RLS';