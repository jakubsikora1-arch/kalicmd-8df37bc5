CREATE TABLE public.saved_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  script text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX saved_scripts_session_created_idx ON public.saved_scripts (session_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.saved_scripts TO anon;
GRANT ALL ON public.saved_scripts TO service_role;

ALTER TABLE public.saved_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved scripts select own session"
ON public.saved_scripts FOR SELECT TO anon
USING (session_id = nullif(current_setting('request.header.x_session_id', true), '')::uuid);

CREATE POLICY "saved scripts insert own session"
ON public.saved_scripts FOR INSERT TO anon
WITH CHECK (session_id = nullif(current_setting('request.header.x_session_id', true), '')::uuid);

CREATE POLICY "saved scripts delete own session"
ON public.saved_scripts FOR DELETE TO anon
USING (session_id = nullif(current_setting('request.header.x_session_id', true), '')::uuid);

CREATE TABLE public.usage_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id uuid,
  event text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX usage_events_created_idx ON public.usage_events (created_at DESC);

GRANT INSERT ON public.usage_events TO anon;
GRANT ALL ON public.usage_events TO service_role;

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage events insert anon"
ON public.usage_events FOR INSERT TO anon
WITH CHECK (event IN ('copy_command', 'download_script', 'save_script'));