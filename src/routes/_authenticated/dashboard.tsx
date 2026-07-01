import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoWordmark } from "@/components/Logo";
import {
  listMyTrips,
  listTripOutputs,
  upsertRating,
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
  const [openTrip, setOpenTrip] = useState<string | null>(null);
  const [outputsByTrip, setOutputsByTrip] = useState<Record<string, StoredOutput[]>>({});
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    listMyTrips().then((t) => {
      setTrips(t);
      setLoading(false);
    });
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const toggleTrip = async (id: string) => {
    const next = openTrip === id ? null : id;
    setOpenTrip(next);
    if (next && !outputsByTrip[next]) {
      const outs = await listTripOutputs(next);
      setOutputsByTrip((m) => ({ ...m, [next]: outs }));
    }
  };

  const onRated = (tripId: string, outputId: string, patch: StoredOutput["rating"]) => {
    setOutputsByTrip((m) => ({
      ...m,
      [tripId]: (m[tripId] ?? []).map((o) => (o.id === outputId ? { ...o, rating: patch } : o)),
    }));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

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

      <section className="max-w-3xl mx-auto px-6 pb-24">
        <h1 className="text-4xl mb-2">
          <span className="text-black">My</span>{" "}
          <span className="font-serif-italic text-accent">Wandr</span> trips
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Every query you've asked. Tap a trip to review what Wandr suggested — thumbs up or down what worked, and tag why.
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
          <ul className="space-y-3">
            {trips.map((t) => (
              <li key={t.id} className="border border-border rounded-2xl bg-card overflow-hidden">
                <button
                  onClick={() => toggleTrip(t.id)}
                  className="w-full text-left px-5 py-4 flex items-start justify-between gap-4 hover:bg-muted/40 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-base truncate">{t.initial_prompt}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{new Date(t.created_at).toLocaleDateString()}</span>
                      {t.brief?.when && <span>· {t.brief.when}</span>}
                      {t.brief?.who && <span>· {t.brief.who}</span>}
                      {t.brief?.budget && <span>· {t.brief.budget}</span>}
                      {t.brief?.pace && <span>· {t.brief.pace}</span>}
                    </div>
                  </div>
                  <span className="text-muted-foreground shrink-0">{openTrip === t.id ? "▾" : "▸"}</span>
                </button>
                {openTrip === t.id && (
                  <div className="border-t border-border p-5 space-y-4 bg-background/40">
                    {(outputsByTrip[t.id] ?? []).length === 0 ? (
                      <div className="text-sm text-muted-foreground">No saved outputs for this trip yet.</div>
                    ) : (
                      (outputsByTrip[t.id] ?? []).map((o) => (
                        <OutputCard key={o.id} output={o} onRated={(p) => onRated(t.id, o.id, p)} />
                      ))
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function OutputCard({
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
    <div className="border border-border rounded-xl p-4 bg-card">
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

      {rating && (
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