CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  api_key     text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_usage (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES public.profiles(id),
  date            date NOT NULL,              -- KST (UTC+9) 기준 날짜
  total_tokens    bigint NOT NULL DEFAULT 0,
  input_tokens    bigint NOT NULL DEFAULT 0,
  output_tokens   bigint NOT NULL DEFAULT 0,
  cache_read_tokens bigint NOT NULL DEFAULT 0,
  cache_creation_tokens bigint NOT NULL DEFAULT 0,
  model_breakdown jsonb NOT NULL DEFAULT '{}',
  project_count   integer NOT NULL DEFAULT 0,
  sessions        integer NOT NULL DEFAULT 0,
  synced_at       timestamptz DEFAULT now(),
  source          text DEFAULT 'claude-code',
  UNIQUE(user_id, date, source)
);

ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can read" ON public.daily_usage
  FOR SELECT TO authenticated USING (true);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
