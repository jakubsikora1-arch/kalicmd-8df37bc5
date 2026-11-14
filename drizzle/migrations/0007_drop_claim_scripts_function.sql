REVOKE ALL ON FUNCTION public.kalicmd_claim_scripts(uuid) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.kalicmd_claim_scripts(uuid);