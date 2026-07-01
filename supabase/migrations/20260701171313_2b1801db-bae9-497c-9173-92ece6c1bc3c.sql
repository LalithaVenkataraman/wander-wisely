
CREATE TABLE public.wandr_trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  initial_prompt TEXT NOT NULL,
  brief JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wandr_trips TO authenticated;
GRANT ALL ON public.wandr_trips TO service_role;
ALTER TABLE public.wandr_trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trips" ON public.wandr_trips FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX wandr_trips_user_created ON public.wandr_trips (user_id, created_at DESC);

CREATE TABLE public.wandr_outputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.wandr_trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('shortlist','itinerary')),
  label TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wandr_outputs TO authenticated;
GRANT ALL ON public.wandr_outputs TO service_role;
ALTER TABLE public.wandr_outputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own outputs" ON public.wandr_outputs FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX wandr_outputs_trip ON public.wandr_outputs (trip_id, created_at DESC);
CREATE INDEX wandr_outputs_user ON public.wandr_outputs (user_id, created_at DESC);

CREATE TABLE public.wandr_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  output_id UUID NOT NULL REFERENCES public.wandr_outputs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating IN (-1, 1)),
  tags TEXT[] NOT NULL DEFAULT '{}',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (output_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wandr_ratings TO authenticated;
GRANT ALL ON public.wandr_ratings TO service_role;
ALTER TABLE public.wandr_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ratings" ON public.wandr_ratings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX wandr_ratings_user ON public.wandr_ratings (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.wandr_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_wandr_trips_updated BEFORE UPDATE ON public.wandr_trips
  FOR EACH ROW EXECUTE FUNCTION public.wandr_touch_updated_at();
CREATE TRIGGER trg_wandr_ratings_updated BEFORE UPDATE ON public.wandr_ratings
  FOR EACH ROW EXECUTE FUNCTION public.wandr_touch_updated_at();
