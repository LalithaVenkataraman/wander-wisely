CREATE TABLE public.wandr_trip_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES public.wandr_trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating smallint NOT NULL,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (trip_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wandr_trip_ratings TO authenticated;
GRANT ALL ON public.wandr_trip_ratings TO service_role;

ALTER TABLE public.wandr_trip_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own trip ratings" ON public.wandr_trip_ratings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER wandr_trip_ratings_touch
  BEFORE UPDATE ON public.wandr_trip_ratings
  FOR EACH ROW EXECUTE FUNCTION public.wandr_touch_updated_at();