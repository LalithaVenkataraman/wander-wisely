import { supabase } from "@/integrations/supabase/client";
import type { DestinationCard, Itinerary, TripBrief } from "@/lib/wandr-mock";

export type StoredOutput = {
  id: string;
  trip_id: string;
  kind: "shortlist" | "itinerary";
  label: string | null;
  payload: { cards?: DestinationCard[]; itinerary?: Itinerary } & Record<string, unknown>;
  created_at: string;
  rating?: { rating: 1 | -1; tags: string[]; note: string | null } | null;
};

export type StoredTrip = {
  id: string;
  initial_prompt: string;
  brief: TripBrief;
  created_at: string;
  updated_at: string;
  rating?: { rating: 1 | -1; tags: string[]; note: string | null } | null;
};

export const POSITIVE_TAGS = [
  "spot on vibe",
  "great recs",
  "well-paced",
  "loved the tone",
  "surprising picks",
  "clear next steps",
];
export const NEGATIVE_TAGS = [
  "off-topic",
  "wrong city",
  "too generic",
  "too touristy",
  "wrong budget",
  "wrong pace",
  "missing info",
  "bad tone",
];

export async function createTrip(initialPrompt: string, brief: TripBrief) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase
    .from("wandr_trips")
    .insert({ user_id: u.user.id, initial_prompt: initialPrompt, brief: brief as never })
    .select()
    .single();
  if (error) {
    console.warn("createTrip", error);
    return null;
  }
  return data as StoredTrip;
}

export async function updateTripBrief(tripId: string, brief: TripBrief) {
  const { error } = await supabase
    .from("wandr_trips")
    .update({ brief: brief as never })
    .eq("id", tripId);
  if (error) console.warn("updateTripBrief", error);
}

export async function saveOutput(
  tripId: string,
  kind: "shortlist" | "itinerary",
  label: string | null,
  payload: Record<string, unknown>,
) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase
    .from("wandr_outputs")
    .insert({ user_id: u.user.id, trip_id: tripId, kind, label, payload: payload as never })
    .select()
    .single();
  if (error) {
    console.warn("saveOutput", error);
    return null;
  }
  return data as StoredOutput;
}

export async function upsertRating(
  outputId: string,
  rating: 1 | -1,
  tags: string[],
  note: string | null,
) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase
    .from("wandr_ratings")
    .upsert(
      { output_id: outputId, user_id: u.user.id, rating, tags, note },
      { onConflict: "output_id,user_id" },
    )
    .select()
    .single();
  if (error) {
    console.warn("upsertRating", error);
    return null;
  }
  return data;
}

export async function listMyTrips(): Promise<StoredTrip[]> {
  const { data, error } = await supabase
    .from("wandr_trips")
    .select("*, wandr_trip_ratings(rating, tags, note)")
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("listMyTrips", error);
    return [];
  }
  return (data ?? []).map((row: any) => ({
    ...row,
    rating: row.wandr_trip_ratings?.[0] ?? null,
  })) as StoredTrip[];
}

export async function upsertTripRating(
  tripId: string,
  rating: 1 | -1,
  tags: string[],
  note: string | null,
) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase
    .from("wandr_trip_ratings")
    .upsert(
      { trip_id: tripId, user_id: u.user.id, rating, tags, note },
      { onConflict: "trip_id,user_id" },
    )
    .select()
    .single();
  if (error) {
    console.warn("upsertTripRating", error);
    return null;
  }
  return data;
}

export async function listTripOutputs(tripId: string): Promise<StoredOutput[]> {
  const { data, error } = await supabase
    .from("wandr_outputs")
    .select("*, wandr_ratings(rating, tags, note)")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("listTripOutputs", error);
    return [];
  }
  return (data ?? []).map((row: any) => ({
    ...row,
    rating: row.wandr_ratings?.[0] ?? null,
  })) as StoredOutput[];
}