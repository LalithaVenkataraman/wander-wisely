import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoWordmark } from "@/components/Logo";
import {
  listMyTrips,
  listTripOutputs,
  upsertRating,
  upsertTripRating,
  POSITIVE_TAGS,
  NEGATIVE_TAGS,
  type StoredOutput,
  type StoredTrip,
} from "@/lib/wandr-history";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Wandr — my trips" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [trips, setTrips] = useState<StoredTrip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null);
  const [outputsByTrip, setOutputsByTrip] = useState<Record<string, StoredOutput[]>>({});
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    listMyTrips().then((t) => {
      setTrips(t);
      setLoading(false);
      if (t.length && !selectedTripId) setSelectedTripId(t[0].id);
    });
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedTripId) return;
    if (outputsByTrip[selectedTripId]) {
      const first = outputsByTrip[selectedTripId][0];
      setSelectedOutputId(first ? first.id : null);
      return;
    }
    listTripOutputs(selectedTripId).then((outs) => {
      setOutputsByTrip((m) => ({ ...m, [selectedTripId]: outs }));
      setSelectedOutputId(outs[0]?.id ?? null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTripId]);

  const onRated = (tripId: string, outputId: string, patch: StoredOutput["rating"]) => {
    setOutputsByTrip((m) => ({
      ...m,
      [tripId]: (m[tripId] ?? []).map((o) => (o.id === outputId ? { ...o, rating: patch } : o)),
    }));
  };

  const onTripRated = (tripId: string, patch: StoredTrip["rating"]) => {
    setTrips((cur) => cur.map((t) => (t.id === tripId ? { ...t, rating: patch } : t)));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const selectedTrip = trips.find((t) => t.id === selectedTripId) ?? null;
  const outputs = selectedTripId ? outputsByTrip[selectedTripId] ?? [] : [];
  const grouped = useMemo(() => groupOutputs(outputs), [outputs]);
  const selectedOutput = outputs.find((o) => o.id === selectedOutputId) ?? null;
  const briefSelected = !!selectedTrip && selectedOutputId === `__meta__${selectedTrip.id}`;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="px-8 pt-8 pb-6 flex items-center justify-between">
        <Link to="/">
          <LogoWordmark size={44} className="text-2xl gap-2" />
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {email && <span className="text-muted-foreground hidden sm:inline">{email}</span>}
          <Link to="/" className="text-primary hover:underline">New trip</Link>
          <button onClick={signOut} className="text-muted-foreground hover:text-foreground cursor-pointer">
            Sign out
          </button>
        </div>
      </header>

      <section className="max-w-[1400px] mx-auto px-6 pb-24">
        <h1 className="text-3xl mb-1">
          <span className="text-black">My</span>{" "}
          <span className="font-serif-italic text-accent">Wandr</span> trips
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Pick a trip, browse how the conversation unfolded, and rate each turn to feed the eval loop.
        </p>

        {loading ? (
          <div className="text-muted-foreground">Loading your trips…</div>
        ) : trips.length === 0 ? (
          <div className="border border-dashed border-border rounded-2xl p-10 text-center">
            <p className="text-muted-foreground mb-4">You haven't planned anything yet.</p>
            <Link to="/" className="inline-block bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm">
              Start a trip
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_320px] gap-5">
            {/* Column 1 — trips */}
            <aside className="border border-border rounded-2xl bg-card overflow-hidden self-start">
              <div className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                Trips
              </div>
              <ul className="max-h-[70vh] overflow-y-auto">
                {trips.map((t) => {
                  const active = t.id === selectedTripId;
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => setSelectedTripId(t.id)}
                        className={`w-full text-left px-4 py-3 border-b border-border/60 cursor-pointer transition ${active ? "bg-primary/10" : "hover:bg-muted/40"}`}
                      >
                        <div className="text-sm line-clamp-2">{t.initial_prompt}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString()}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            {/* Column 2 — categorized conversation */}
            <div className="min-w-0 space-y-5">
              {selectedTrip && (
                <MetadataSection
                  trip={selectedTrip}
                  isSelected={selectedOutputId === `__meta__${selectedTrip.id}`}
                  onSelect={() => setSelectedOutputId(`__meta__${selectedTrip.id}`)}
                  onQuickRate={async (r) => {
                    const saved = await upsertTripRating(selectedTrip.id, r, selectedTrip.rating?.tags ?? [], selectedTrip.rating?.note ?? null);
                    if (saved) onTripRated(selectedTrip.id, { rating: r, tags: selectedTrip.rating?.tags ?? [], note: selectedTrip.rating?.note ?? null });
                  }}
                />
              )}

              <OutputGroup
                title="Wandr recommendations"
                subtitle="First shortlist Wandr surfaced"
                items={grouped.initialShortlists}
                selectedId={selectedOutputId}
                onSelect={setSelectedOutputId}
                onQuickRate={async (o, r) => {
                  const saved = await upsertRating(o.id, r, o.rating?.tags ?? [], o.rating?.note ?? null);
                  if (saved) onRated(selectedTripId!, o.id, { rating: r, tags: o.rating?.tags ?? [], note: o.rating?.note ?? null });
                }}
              />
              <OutputGroup
                title="Refined recommendations"
                subtitle="Reshuffles after you added more context"
                items={grouped.refinedShortlists}
                selectedId={selectedOutputId}
                onSelect={setSelectedOutputId}
                onQuickRate={async (o, r) => {
                  const saved = await upsertRating(o.id, r, o.rating?.tags ?? [], o.rating?.note ?? null);
                  if (saved) onRated(selectedTripId!, o.id, { rating: r, tags: o.rating?.tags ?? [], note: o.rating?.note ?? null });
                }}
              />
              <OutputGroup
                title="Itineraries"
                subtitle="Day-by-day plans Wandr built"
                items={grouped.itineraries}
                selectedId={selectedOutputId}
                onSelect={setSelectedOutputId}
                onQuickRate={async (o, r) => {
                  const saved = await upsertRating(o.id, r, o.rating?.tags ?? [], o.rating?.note ?? null);
                  if (saved) onRated(selectedTripId!, o.id, { rating: r, tags: o.rating?.tags ?? [], note: o.rating?.note ?? null });
                }}
              />

              {selectedTrip && outputs.length === 0 && (
                <div className="text-sm text-muted-foreground border border-dashed border-border rounded-xl p-6">
                  No saved outputs for this trip yet.
                </div>
              )}
            </div>

            {/* Column 3 — rating panel */}
            <aside className="lg:sticky lg:top-6 self-start">
              {briefSelected && selectedTrip ? (
                <TripBriefRatingPanel
                  key={selectedTrip.id}
                  trip={selectedTrip}
                  onRated={(p) => onTripRated(selectedTrip.id, p)}
                />
              ) : selectedOutput ? (
                <RatingPanel
                  key={selectedOutput.id}
                  output={selectedOutput}
                  onRated={(p) => onRated(selectedTripId!, selectedOutput.id, p)}
                />
              ) : (
                <div className="border border-dashed border-border rounded-2xl p-6 text-sm text-muted-foreground">
                  Pick an item to add tags or a note. Thumbs save instantly.
                </div>
              )}
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

function groupOutputs(outputs: StoredOutput[]) {
  const shortlists = outputs.filter((o) => o.kind === "shortlist");
  const itineraries = outputs.filter((o) => o.kind === "itinerary");
  return {
    initialShortlists: shortlists.slice(0, 1),
    refinedShortlists: shortlists.slice(1),
    itineraries,
  };
}

function OutputGroup({
  title,
  subtitle,
  items,
  selectedId,
  onSelect,
  onQuickRate,
}: {
  title: string;
  subtitle: string;
  items: StoredOutput[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onQuickRate: (o: StoredOutput, r: 1 | -1) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2 px-1">
        <h3 className="text-sm uppercase tracking-wide text-muted-foreground">{title}</h3>
        <span className="text-[11px] text-muted-foreground/80">{subtitle}</span>
      </div>
      <ul className="space-y-2">
        {items.map((o, i) => {
          const active = o.id === selectedId;
          const s = summarizeOutput(o);
          return (
            <li key={o.id}>
              <div
                className={`w-full border rounded-xl px-4 py-3 transition ${active ? "border-primary bg-primary/5" : "border-border bg-card hover:border-foreground/30"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => onSelect(o.id)} className="min-w-0 text-left flex-1 cursor-pointer">
                    <div className="text-sm">
                      {items.length > 1 && (
                        <span className="text-muted-foreground mr-1.5">v{i + 1}</span>
                      )}
                      {o.label ?? s.title}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{s.subtitle}</div>
                  </button>
                  <InlineThumbs
                    rating={o.rating?.rating ?? null}
                    onRate={(r) => onQuickRate(o, r)}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function InlineThumbs({
  rating,
  onRate,
}: {
  rating: 1 | -1 | null;
  onRate: (r: 1 | -1) => void;
}) {
  return (
    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => onRate(1)}
        className={`w-7 h-7 rounded-full text-xs border transition cursor-pointer ${rating === 1 ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
        aria-label="Thumbs up"
      >
        👍
      </button>
      <button
        onClick={() => onRate(-1)}
        className={`w-7 h-7 rounded-full text-xs border transition cursor-pointer ${rating === -1 ? "bg-destructive text-destructive-foreground border-destructive" : "border-border hover:bg-muted"}`}
        aria-label="Thumbs down"
      >
        👎
      </button>
    </div>
  );
}

function MetadataSection({
  trip,
  isSelected,
  onSelect,
  onQuickRate,
}: {
  trip: StoredTrip;
  isSelected: boolean;
  onSelect: () => void;
  onQuickRate: (r: 1 | -1) => void;
}) {
  const fields: Array<[string, string | undefined]> = [
    ["when", trip.brief?.when],
    ["who", trip.brief?.who],
    ["budget", trip.brief?.budget],
    ["pace", trip.brief?.pace],
    ["vibe", (trip.brief as any)?.vibe],
  ];
  const captured = fields.filter(([, v]) => v);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2 px-1">
        <h3 className="text-sm uppercase tracking-wide text-muted-foreground">Trip brief</h3>
        <span className="text-[11px] text-muted-foreground/80">Did Wandr capture the essentials?</span>
      </div>
      <div
        className={`w-full border rounded-xl px-4 py-3 transition ${isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-foreground/30"}`}
      >
        <div className="flex items-start justify-between gap-3">
          <button onClick={onSelect} className="text-left flex-1 min-w-0 cursor-pointer">
            <div className="text-sm mb-2 line-clamp-2">"{trip.initial_prompt}"</div>
            {captured.length ? (
              <div className="flex flex-wrap gap-1.5">
                {captured.map(([k, v]) => (
                  <span key={k} className="text-[11px] rounded-full bg-muted px-2 py-0.5">
                    <span className="text-muted-foreground">{k}:</span> {v}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground">No metadata captured yet.</div>
            )}
          </button>
          <InlineThumbs rating={trip.rating?.rating ?? null} onRate={onQuickRate} />
        </div>
      </div>
    </div>
  );
}

function TripBriefRatingPanel({
  trip,
  onRated,
}: {
  trip: StoredTrip;
  onRated: (r: StoredTrip["rating"]) => void;
}) {
  const [rating, setRating] = useState<1 | -1 | null>(trip.rating?.rating ?? null);
  const [tags, setTags] = useState<string[]>(trip.rating?.tags ?? []);
  const [note, setNote] = useState(trip.rating?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const presets = rating === 1 ? POSITIVE_TAGS : rating === -1 ? NEGATIVE_TAGS : [];
  const toggleTag = (t: string) =>
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const save = async (nextRating: 1 | -1) => {
    setSaving(true);
    const r = await upsertTripRating(trip.id, nextRating, tags, note.trim() || null);
    setSaving(false);
    if (r) {
      setSavedAt(Date.now());
      onRated({ rating: nextRating, tags, note: note.trim() || null });
    }
  };
  const saveTagsNote = async () => {
    if (!rating) return;
    setSaving(true);
    const r = await upsertTripRating(trip.id, rating, tags, note.trim() || null);
    setSaving(false);
    if (r) {
      setSavedAt(Date.now());
      onRated({ rating, tags, note: note.trim() || null });
    }
  };

  return (
    <div className="border border-border rounded-2xl p-4 bg-card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Trip brief</div>
          <div className="text-base">Did Wandr capture the essentials?</div>
          <div className="text-xs text-muted-foreground mt-0.5">when · who · budget · pace · vibe</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { setRating(1); save(1); }}
            className={`w-9 h-9 rounded-full border transition ${rating === 1 ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
            aria-label="Thumbs up"
          >👍</button>
          <button
            onClick={() => { setRating(-1); save(-1); }}
            className={`w-9 h-9 rounded-full border transition ${rating === -1 ? "bg-destructive text-destructive-foreground border-destructive" : "border-border hover:bg-muted"}`}
            aria-label="Thumbs down"
          >👎</button>
        </div>
      </div>

      {rating ? (
        <div className="space-y-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1.5">
              {rating === 1 ? "What worked?" : "What went wrong?"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition cursor-pointer ${tags.includes(t) ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground/40"}`}
                >{t}</button>
              ))}
            </div>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything else? (optional)"
            className="w-full text-sm rounded-md border border-border bg-transparent p-2 min-h-[60px] focus:outline-none focus:border-primary"
          />
          <div className="flex items-center justify-between">
            <button
              onClick={saveTagsNote}
              disabled={saving}
              className="text-sm bg-primary text-primary-foreground rounded-full px-4 py-1.5 hover:opacity-90 disabled:opacity-60 cursor-pointer"
            >{saving ? "Saving…" : "Save feedback"}</button>
            {savedAt && <span className="text-xs text-muted-foreground">Saved ✓</span>}
          </div>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">Thumbs up or down to add tags and a note.</div>
      )}
    </div>
  );
}

function RatingPanel({
  output,
  onRated,
}: {
  output: StoredOutput;
  onRated: (r: StoredOutput["rating"]) => void;
}) {
  const [rating, setRating] = useState<1 | -1 | null>(output.rating?.rating ?? null);
  const [tags, setTags] = useState<string[]>(output.rating?.tags ?? []);
  const [note, setNote] = useState(output.rating?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const presets = rating === 1 ? POSITIVE_TAGS : rating === -1 ? NEGATIVE_TAGS : [];

  const summary = summarizeOutput(output);

  const toggleTag = (t: string) =>
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const save = async (nextRating: 1 | -1) => {
    setSaving(true);
    const r = await upsertRating(output.id, nextRating, tags, note.trim() || null);
    setSaving(false);
    if (r) {
      setSavedAt(Date.now());
      onRated({ rating: nextRating, tags, note: note.trim() || null });
    }
  };

  const saveTagsNote = async () => {
    if (!rating) return;
    setSaving(true);
    const r = await upsertRating(output.id, rating, tags, note.trim() || null);
    setSaving(false);
    if (r) {
      setSavedAt(Date.now());
      onRated({ rating, tags, note: note.trim() || null });
    }
  };

  return (
    <div className="border border-border rounded-2xl p-4 bg-card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {output.kind === "shortlist" ? "Shortlist" : "Itinerary"}
          </div>
          <div className="text-base">{output.label ?? summary.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{summary.subtitle}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setRating(1);
              save(1);
            }}
            className={`w-9 h-9 rounded-full border transition ${rating === 1 ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
            aria-label="Thumbs up"
          >
            👍
          </button>
          <button
            onClick={() => {
              setRating(-1);
              save(-1);
            }}
            className={`w-9 h-9 rounded-full border transition ${rating === -1 ? "bg-destructive text-destructive-foreground border-destructive" : "border-border hover:bg-muted"}`}
            aria-label="Thumbs down"
          >
            👎
          </button>
        </div>
      </div>

      {rating ? (
        <div className="space-y-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1.5">
              {rating === 1 ? "What worked?" : "What went wrong?"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition cursor-pointer ${tags.includes(t) ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground/40"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything else? (optional)"
            className="w-full text-sm rounded-md border border-border bg-transparent p-2 min-h-[60px] focus:outline-none focus:border-primary"
          />
          <div className="flex items-center justify-between">
            <button
              onClick={saveTagsNote}
              disabled={saving}
              className="text-sm bg-primary text-primary-foreground rounded-full px-4 py-1.5 hover:opacity-90 disabled:opacity-60 cursor-pointer"
            >
              {saving ? "Saving…" : "Save feedback"}
            </button>
            {savedAt && <span className="text-xs text-muted-foreground">Saved ✓</span>}
          </div>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          Thumbs up or down to add tags and a note.
        </div>
      )}
    </div>
  );
}

function summarizeOutput(o: StoredOutput): { title: string; subtitle: string } {
  if (o.kind === "shortlist") {
    const cards = (o.payload.cards ?? []) as { city: string; country: string }[];
    return {
      title: cards.length ? `${cards.length} ideas` : "Shortlist",
      subtitle: cards.map((c) => c.city).join(" · "),
    };
  }
  const it = o.payload.itinerary as { city?: string; country?: string; durationDays?: number } | undefined;
  return {
    title: it?.city ? `${it.city}${it.country ? `, ${it.country}` : ""}` : "Itinerary",
    subtitle: it?.durationDays ? `${it.durationDays} days` : "",
  };
}