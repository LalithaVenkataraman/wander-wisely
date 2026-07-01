import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const [outputsByTrip, setOutputsByTrip] = useState<Record<string, StoredOutput[]>>({});
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    listMyTrips().then((t) => {
      setTrips(t);
      setLoading(false);
    });
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const toggleTrip = (id: string) => {
    setExpandedTripId((cur) => (cur === id ? null : id));
    if (!outputsByTrip[id]) {
      listTripOutputs(id).then((outs) => setOutputsByTrip((m) => ({ ...m, [id]: outs })));
    }
  };

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

      <section className="max-w-4xl mx-auto px-6 pb-24">
        <h1 className="text-3xl mb-1">
          <span className="text-black">My</span>{" "}
          <span className="font-serif-italic text-accent">Wandr</span> trips
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Each row is a trip. Rate & tag it at a glance, or expand to rate every recommendation and itinerary Wandr produced.
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
              <TripRow
                key={t.id}
                trip={t}
                expanded={expandedTripId === t.id}
                onToggle={() => toggleTrip(t.id)}
                outputs={outputsByTrip[t.id] ?? null}
                onTripRated={(p) => onTripRated(t.id, p)}
                onOutputRated={(oid, p) => onRated(t.id, oid, p)}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function TripRow({
  trip,
  expanded,
  onToggle,
  outputs,
  onTripRated,
  onOutputRated,
}: {
  trip: StoredTrip;
  expanded: boolean;
  onToggle: () => void;
  outputs: StoredOutput[] | null;
  onTripRated: (r: StoredTrip["rating"]) => void;
  onOutputRated: (outputId: string, r: StoredOutput["rating"]) => void;
}) {
  const grouped = outputs ? groupOutputs(outputs) : null;
  const brief = trip.brief ?? {};
  const briefFields: Array<[string, string | undefined]> = [
    ["when", (brief as any)?.when],
    ["who", (brief as any)?.who],
    ["budget", (brief as any)?.budget],
    ["pace", (brief as any)?.pace],
    ["vibe", (brief as any)?.vibe],
  ];
  const captured = briefFields.filter(([, v]) => v);
  const rating = trip.rating?.rating ?? null;
  const tags = trip.rating?.tags ?? [];
  const totalOutputs = outputs?.length ?? 0;
  return (
    <li className="border border-border rounded-2xl bg-card overflow-hidden">
      {/* Section 1: summary row */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <button
            onClick={onToggle}
            className="mt-0.5 w-6 h-6 shrink-0 rounded-md border border-border text-xs text-muted-foreground hover:bg-muted cursor-pointer"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? "−" : "+"}
          </button>
          <button onClick={onToggle} className="flex-1 min-w-0 text-left cursor-pointer">
            <div className="text-base line-clamp-2">{trip.initial_prompt}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {new Date(trip.created_at).toLocaleDateString()}
              {outputs && ` · ${totalOutputs} item${totalOutputs === 1 ? "" : "s"}`}
            </div>
          </button>
          <InlineThumbs
            rating={rating}
            onRate={async (r) => {
              const saved = await upsertTripRating(trip.id, r, tags, null);
              if (saved) onTripRated({ rating: r, tags, note: null });
            }}
          />
        </div>

        <div className="mt-3 ml-9">
          <TagChips
            rating={rating ?? 1}
            tags={tags}
            onChange={async (nextTags) => {
              const r = rating ?? 1;
              onTripRated({ rating: r, tags: nextTags, note: null });
              await upsertTripRating(trip.id, r, nextTags, null);
            }}
          />
        </div>
      </div>

      {/* Section 2: expandable line items */}
      {expanded && (
        <div className="border-t border-border bg-muted/20 px-4 sm:px-5 py-4">
          {!outputs ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : outputs.length === 0 ? (
            <div className="text-sm text-muted-foreground">No recommendations saved for this trip yet.</div>
          ) : (
            <div className="space-y-5">
              {grouped!.initialShortlists.length > 0 && (
                <LineItemGroup
                  title="Wandr recommendations"
                  items={grouped!.initialShortlists}
                  onRated={onOutputRated}
                />
              )}
              {grouped!.refinedShortlists.length > 0 && (
                <LineItemGroup
                  title="Refined recommendations"
                  items={grouped!.refinedShortlists}
                  onRated={onOutputRated}
                  numbered
                />
              )}
              {grouped!.itineraries.length > 0 && (
                <LineItemGroup
                  title="Itineraries"
                  items={grouped!.itineraries}
                  onRated={onOutputRated}
                />
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function LineItemGroup({
  title,
  items,
  numbered,
  onRated,
}: {
  title: string;
  items: StoredOutput[];
  numbered?: boolean;
  onRated: (outputId: string, r: StoredOutput["rating"]) => void;
}) {
  return (
    <div>
      <h4 className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-2">{title}</h4>
      <ul className="space-y-2">
        {items.map((o, i) => {
          const s = summarizeOutput(o);
          const r = o.rating?.rating ?? null;
          const tags = o.rating?.tags ?? [];
          return (
            <li key={o.id} className="border border-border/70 rounded-lg bg-background px-3 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm truncate">
                    {numbered && <span className="text-muted-foreground mr-1.5">v{i + 2}</span>}
                    <span>{s.title}</span>
                    {s.subtitle && <span className="text-muted-foreground"> · {s.subtitle}</span>}
                  </div>
                </div>
                <InlineThumbs
                  rating={r}
                  onRate={async (nextR) => {
                    onRated(o.id, { rating: nextR, tags, note: null });
                    await upsertRating(o.id, nextR, tags, null);
                  }}
                />
              </div>
              {r && (
                <div className="mt-2">
                  <TagChips
                    rating={r}
                    tags={tags}
                    onChange={async (nextTags) => {
                      onRated(o.id, { rating: r, tags: nextTags, note: null });
                      await upsertRating(o.id, r, nextTags, null);
                    }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TagChips({
  rating,
  tags,
  onChange,
}: {
  rating: 1 | -1;
  tags: string[];
  onChange: (next: string[]) => void;
}) {
  const presets = rating === 1 ? POSITIVE_TAGS : NEGATIVE_TAGS;
  const toggle = (t: string) =>
    onChange(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
  const customTags = tags.filter((t) => !POSITIVE_TAGS.includes(t) && !NEGATIVE_TAGS.includes(t));
  const [draft, setDraft] = useState("");
  const addCustom = () => {
    const v = draft.trim().toLowerCase();
    if (!v || tags.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...tags, v]);
    setDraft("");
  };
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {presets.map((t) => {
          const on = tags.includes(t);
          return (
            <button
              key={t}
              onClick={() => toggle(t)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] border transition cursor-pointer ${on ? "bg-foreground text-background border-foreground" : "border-border/70 text-muted-foreground hover:border-foreground/40 hover:text-foreground"}`}
            >
              {t}
            </button>
          );
        })}
        {customTags.map((t) => (
          <button
            key={t}
            onClick={() => toggle(t)}
            className="px-2.5 py-0.5 rounded-full text-[11px] border border-accent/60 bg-accent/15 text-foreground cursor-pointer"
            title="Click to remove"
          >
            {t} ✕
          </button>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addCustom();
            }
          }}
          onBlur={addCustom}
          placeholder="+ add tag"
          className="px-2.5 py-0.5 rounded-full text-[11px] border border-dashed border-border/70 bg-transparent outline-none focus:border-foreground/40 min-w-[80px] w-[100px]"
        />
      </div>
    </div>
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