import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  getConflicts,
  getDestinationsForPrompt,
  getItinerary,
  saveTrip,
  type DestinationCard,
  type Itinerary,
  type ItineraryStyle,
  type TripBrief,
} from "@/lib/wandr-mock";
import { wandrAct } from "@/lib/wandr-ai.functions";
import { getPostcards } from "@/lib/postcards";

const searchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/plan")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Wandr — planning…" },
      { name: "description", content: "Your trip, taking shape." },
    ],
  }),
  component: PlanPage,
});

type ChatMsg = { who: "you" | "wandr"; text: string };

type ChipKey = "when" | "who" | "budget" | "pace";
const CHIPS: { key: ChipKey; label: string; options: string[] }[] = [
  { key: "when", label: "When", options: ["Next month", "In 3 months", "This summer", "Flexible"] },
  { key: "who", label: "Who with", options: ["Solo", "Partner", "With kids", "With older parents", "Friends"] },
  { key: "budget", label: "Budget", options: ["$ shoestring", "$$ comfortable", "$$$ treat", "Open"] },
  { key: "pace", label: "Pace", options: ["Mindful", "Balanced", "Pack it in"] },
];

function PlanPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const act = useServerFn(wandrAct);

  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [brief, setBrief] = useState<TripBrief>({});
  const [pane, setPane] = useState<{ label: string; cards: DestinationCard[] } | null>(null);
  const [pendingCard, setPendingCard] = useState<DestinationCard | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [followup, setFollowup] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [openChip, setOpenChip] = useState<ChipKey | null>(null);
  const [thinking, setThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const briefRef = useRef<TripBrief>({});
  const chatRef = useRef<ChatMsg[]>([]);
  useEffect(() => { briefRef.current = brief; }, [brief]);
  useEffect(() => { chatRef.current = chat; }, [chat]);

  const pushWandr = (text: string) => setChat((c) => [...c, { who: "wandr", text }]);

  const runShortlist = async (prompt: string, refinement?: string) => {
    setThinking(true);
    try {
      const r = await act({ data: { mode: "shortlist", prompt, refinement, brief: briefRef.current, history: chatRef.current } });
      if (r.cards && r.cards.length) {
        setPane({ label: r.label ?? "A few ideas", cards: r.cards });
      }
      if (r.reply) pushWandr(r.reply);
    } catch (e) {
      // graceful fallback to mock
      const fb = getDestinationsForPrompt(prompt);
      setPane(fb);
      pushWandr(`(Using offline picks — ${(e as Error).message.slice(0, 80)})`);
    } finally {
      setThinking(false);
    }
  };

  const runItinerary = async (card: DestinationCard, style: ItineraryStyle, refinement?: string, current?: Itinerary) => {
    setThinking(true);
    try {
      const r = await act({ data: {
        mode: "itinerary",
        brief: briefRef.current,
        history: chatRef.current,
        currentCity: card.city,
        currentCountry: card.country,
        days: current?.durationDays ?? 4,
        style,
        currentItinerary: current,
        refinement,
      }});
      if (r.itinerary) setItinerary(r.itinerary);
      else if (!current) setItinerary(getItinerary(card, { style }));
      if (r.reply) pushWandr(r.reply);
    } catch (e) {
      if (!current) setItinerary(getItinerary(card, { style }));
      pushWandr(`(Using offline plan — ${(e as Error).message.slice(0, 80)})`);
    } finally {
      setThinking(false);
    }
  };

  useEffect(() => {
    const initialPrompt = q ?? (typeof window !== "undefined" ? sessionStorage.getItem("wandr:prompt") ?? "" : "");
    if (!initialPrompt) {
      navigate({ to: "/" });
      return;
    }
    setChat([
      { who: "you", text: initialPrompt },
      { who: "wandr", text: "On it — pulling four that fit." },
    ]);
    runShortlist(initialPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const setChip = (key: ChipKey, value: string) => {
    setBrief((b) => ({ ...b, [key]: value }));
    setOpenChip(null);
    setChat((c) => [
      ...c,
      { who: "you", text: `${CHIPS.find((x) => x.key === key)!.label}: ${value}` },
      { who: "wandr", text: wittyAckFor(key, value) },
    ]);
  };

  const tryPick = (card: DestinationCard) => {
    const conflicts = getConflicts(card, brief);
    if (conflicts.length > 0) {
      setPendingCard(card);
      setChat((c) => [...c, { who: "wandr", text: conflicts[0] + " Want me to go ahead, or pick something gentler?" }]);
      return;
    }
    confirmPick(card);
  };

  const confirmPick = (card: DestinationCard) => {
    const style: ItineraryStyle =
      brief.pace === "Mindful" ? "mindful" : brief.pace === "Pack it in" ? "max" : "balanced";
    setPendingCard(null);
    setShareUrl(null);
    setChat((c) => [
      ...c,
      { who: "you", text: `Let's go with ${card.city}.` },
      { who: "wandr", text: `Locked in. Building your ${card.city} plan…` },
    ]);
    runItinerary(card, style);
  };

  const sendFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = followup.trim();
    if (!v) return;
    setChat((c) => [...c, { who: "you", text: v }]);
    setFollowup("");
    setThinking(true);
    try {
      const r = await act({ data: { mode: "reply", brief: briefRef.current, history: [...chatRef.current, { who: "you", text: v }], refinement: v } });
      if (r.brief) setBrief((b) => ({ ...b, ...r.brief }));
      if (r.reply) pushWandr(r.reply);
      if (r.intent === "itinerary" && itinerary) {
        const card: DestinationCard = { id: itinerary.id, city: itinerary.city, country: itinerary.country, tag: "", bestMonths: "", budget: "", flightTime: "", reels: itinerary.reels };
        await runItinerary(card, itinerary.style, v, itinerary);
      } else if (r.intent === "shortlist") {
        await runShortlist(q ?? itinerary?.city ?? "", v);
      }
    } catch (e) {
      pushWandr(`Hmm, I lost my train of thought (${(e as Error).message.slice(0, 80)}). Try again?`);
    } finally {
      setThinking(false);
    }
  };

  const setStyle = (style: ItineraryStyle) => {
    if (!itinerary) return;
    const card: DestinationCard = {
      id: itinerary.id, city: itinerary.city, country: itinerary.country,
      tag: "", bestMonths: "", budget: "", flightTime: "",
      reels: itinerary.reels,
    };
    runItinerary(card, style, `Reshape to a ${style} pace.`, itinerary);
  };

  const moveStop = (dayIdx: number, stopIdx: number, dir: -1 | 1) => {
    if (!itinerary) return;
    const days = itinerary.days.map((d) => ({ ...d, stops: [...d.stops] }));
    const stops = days[dayIdx].stops;
    const j = stopIdx + dir;
    if (j < 0 || j >= stops.length) return;
    [stops[stopIdx], stops[j]] = [stops[j], stops[stopIdx]];
    setItinerary({ ...itinerary, days });
  };

  const removeStop = (dayIdx: number, stopIdx: number) => {
    if (!itinerary) return;
    const days = itinerary.days.map((d) => ({ ...d, stops: [...d.stops] }));
    days[dayIdx].stops.splice(stopIdx, 1);
    setItinerary({ ...itinerary, days });
  };

  const onSave = async () => {
    if (!itinerary) return;
    const trip = saveTrip(itinerary, brief);
    const url = `${window.location.origin}/plan?q=${encodeURIComponent(itinerary.city)}#trip=${trip.id}`;
    setShareUrl(url);
    try { await navigator.clipboard.writeText(url); } catch { /* noop */ }
    setChat((c) => [...c, { who: "wandr", text: "Saved + share link copied. Send it to whoever's coming." }]);
  };

  const startOver = () => {
    if (typeof window !== "undefined") sessionStorage.removeItem("wandr:prompt");
    navigate({ to: "/" });
  };

  return (
    <div className="h-screen flex bg-background text-foreground overflow-hidden">
      {/* LEFT: chat */}
      <aside className="w-[380px] shrink-0 border-r border-border flex flex-col bg-card">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <span className="font-serif-italic text-xl text-primary">Wandr</span>
          <button onClick={startOver} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">
            Start over
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {chat.map((m, i) => (
            <div key={i} className="space-y-1">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {m.who === "you" ? "You" : "Wandr"}
              </div>
              <div className={m.who === "you" ? "text-sm leading-relaxed" : "text-base leading-relaxed font-serif-italic text-foreground/90"}>
                {m.text}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="text-xs text-muted-foreground italic animate-pulse">Wandr is thinking…</div>
          )}
          {pendingCard && (
            <div className="flex gap-2 pt-1">
              <button onClick={() => confirmPick(pendingCard)} className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground cursor-pointer">Go ahead anyway</button>
              <button onClick={() => setPendingCard(null)} className="text-xs px-3 py-1.5 rounded-full border border-border cursor-pointer">Show gentler picks</button>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={sendFollowup} className="p-3 border-t border-border">
          <div className="flex items-center gap-2 bg-background rounded-full border border-border pl-4 pr-1 py-1 focus-within:border-primary">
            <input
              value={followup}
              onChange={(e) => setFollowup(e.target.value)}
              placeholder="Refine or ask anything…"
              className="flex-1 bg-transparent outline-none text-sm py-1.5 placeholder:text-muted-foreground"
            />
            <button type="submit" className="bg-primary text-primary-foreground rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer">Send</button>
          </div>
        </form>
      </aside>

      {/* RIGHT */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-8">
          {/* Chips always visible */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {CHIPS.map((c) => {
                const value = brief[c.key];
                const isOpen = openChip === c.key;
                return (
                  <div key={c.key} className="relative">
                    <button
                      onClick={() => setOpenChip(isOpen ? null : c.key)}
                      className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
                        value ? "bg-primary/10 border-primary/40 text-foreground" : "bg-card border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="opacity-70 mr-1">{c.label}:</span>
                      <span className="font-medium">{value ?? "—"}</span>
                    </button>
                    {isOpen && (
                      <div className="absolute z-20 mt-2 left-0 bg-popover border border-border rounded-xl shadow-md p-1 min-w-[180px]">
                        {c.options.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => setChip(c.key, opt)}
                            className="block w-full text-left text-sm px-3 py-1.5 rounded-md hover:bg-muted cursor-pointer"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {!itinerary && pane && <CardsView pane={pane} brief={brief} onPick={tryPick} />}
          {itinerary && (
            <ItineraryView
              it={itinerary}
              onBack={() => setItinerary(null)}
              onStyle={setStyle}
              onMove={moveStop}
              onRemove={removeStop}
              onSave={onSave}
              shareUrl={shareUrl}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function wittyAckFor(key: ChipKey, value: string): string {
  if (key === "when") return `${value}. Good window — let's see what's in season.`;
  if (key === "who") {
    if (value.includes("older")) return "With older parents — noted. I'll flag anything with stairs or long walks.";
    if (value.includes("kids")) return "Kids in tow. I'll keep transfers short and add pool/park breaks.";
    if (value === "Solo") return "Solo mode — easier reservations, weirder dinners. Love it.";
    return `${value}. Got it.`;
  }
  if (key === "budget") return `${value} — I'll match the hotels and restaurants to that.`;
  if (key === "pace") return value === "Mindful" ? "Mindful it is. Two real things a day, long lunches." : value === "Pack it in" ? "Maximalist mode. I'll squeeze the good stuff in." : "Balanced. The default for a reason.";
  return "Noted.";
}

function CardsView({
  pane,
  brief,
  onPick,
}: {
  pane: { label: string; cards: DestinationCard[] };
  brief: TripBrief;
  onPick: (c: DestinationCard) => void;
}) {
  return (
    <>
      <h2 className="font-serif-italic text-4xl mb-1">{pane.label}</h2>
      <p className="text-sm text-muted-foreground mb-6">Four real options. Pick one — you can always come back.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pane.cards.map((c) => {
          const conflicts = getConflicts(c, brief);
          return (
            <button
              key={c.id}
              onClick={() => onPick(c)}
              className="text-left bg-card border border-border rounded-2xl p-5 hover:border-primary hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{c.country}</div>
              <div className="font-serif-italic text-2xl mb-2 group-hover:text-primary transition-colors">{c.city}</div>
              <p className="text-sm text-foreground/80 mb-4">{c.tag}</p>

              {/* mini reels strip */}
              <div className="flex gap-1.5 mb-3">
                <CardReelStrip city={c.city} country={c.country} fallbackCount={(c.reels ?? []).length || 3} />
              </div>

              <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground border-t border-border pt-3">
                <span>{c.bestMonths}</span><span>·</span>
                <span>{c.budget}</span><span>·</span>
                <span>{c.flightTime}</span>
              </div>

              {conflicts.length > 0 && (
                <div className="mt-3 text-[11px] text-primary bg-primary/8 border border-primary/20 rounded-md px-2 py-1.5">
                  ⚠ {conflicts[0]}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

function ItineraryView({
  it,
  onBack,
  onStyle,
  onMove,
  onRemove,
  onSave,
  shareUrl,
}: {
  it: Itinerary;
  onBack: () => void;
  onStyle: (s: ItineraryStyle) => void;
  onMove: (dayIdx: number, stopIdx: number, dir: -1 | 1) => void;
  onRemove: (dayIdx: number, stopIdx: number) => void;
  onSave: () => void;
  shareUrl: string | null;
}) {
  const [openDay, setOpenDay] = useState(1);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">← Back to options</button>
        <button onClick={onSave} className="text-xs bg-primary text-primary-foreground rounded-full px-3 py-1.5 cursor-pointer">Save & share</button>
      </div>

      {/* Hero */}
      <div className="bg-card border border-border rounded-3xl p-8 mb-6">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          {it.country} · {it.durationDays} days
        </div>
        <h1 className="font-serif-italic text-5xl mb-3">{it.city}</h1>
        <p className="text-base text-foreground/80 max-w-prose">{it.summary}</p>
      </div>

      {/* Style toggle */}
      <div className="mb-8 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-2">Vibe</span>
        {(["mindful", "balanced", "max"] as ItineraryStyle[]).map((s) => (
          <button
            key={s}
            onClick={() => onStyle(s)}
            className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
              it.style === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground/70 hover:text-foreground"
            }`}
          >
            {s === "mindful" ? "Mindful" : s === "balanced" ? "Balanced" : "Pack it in"}
          </button>
        ))}
      </div>

      {shareUrl && (
        <div className="mb-6 text-xs bg-primary/10 border border-primary/30 rounded-xl px-3 py-2 text-foreground/80 break-all">
          Link copied to clipboard: <span className="font-mono">{shareUrl}</span>
        </div>
      )}

      {/* Days */}
      <section className="mb-12">
        <h3 className="font-serif-italic text-2xl mb-4">Day by day</h3>
        <div className="border border-border rounded-2xl overflow-hidden bg-card">
          {it.days.map((d, dayIdx) => {
            const open = openDay === d.day;
            const total = d.stops.reduce((a, s) => a + s.durationMin, 0);
            return (
              <div key={d.day} className="border-b border-border last:border-b-0">
                <button
                  onClick={() => setOpenDay(open ? -1 : d.day)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/40 cursor-pointer"
                >
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Day {d.day} · {Math.round(total / 60)}h planned</div>
                    <div className="font-serif-italic text-xl">{d.title}</div>
                  </div>
                  <span className="text-muted-foreground text-sm">{open ? "−" : "+"}</span>
                </button>
                {open && (
                  <div className="px-5 pb-5 space-y-2">
                    {d.stops.length === 0 && (
                      <div className="text-sm text-muted-foreground italic">Empty day. Add something via chat.</div>
                    )}
                    {d.stops.map((s, i) => (
                      <div key={s.id} className="flex gap-3 items-start py-2 border-t border-border/60 first:border-t-0">
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground w-16 pt-1 shrink-0">
                          {s.timeOfDay}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{s.title}</div>
                          <div className="text-xs text-muted-foreground">{s.note} · {Math.round(s.durationMin / 15) * 15} min</div>
                        </div>
                        <div className="flex items-center gap-1 opacity-70">
                          <button onClick={() => onMove(dayIdx, i, -1)} disabled={i === 0} className="px-1.5 py-0.5 text-xs rounded hover:bg-muted disabled:opacity-30 cursor-pointer">↑</button>
                          <button onClick={() => onMove(dayIdx, i, 1)} disabled={i === d.stops.length - 1} className="px-1.5 py-0.5 text-xs rounded hover:bg-muted disabled:opacity-30 cursor-pointer">↓</button>
                          <button onClick={() => onRemove(dayIdx, i)} className="px-1.5 py-0.5 text-xs rounded hover:bg-destructive/10 hover:text-destructive cursor-pointer">×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Stay */}
      <Section title="Where to stay">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {it.stay.map((s) => (
            <div key={s.tier} className="bg-card border border-border rounded-2xl p-4">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{s.tier}</div>
              <div className="font-medium mb-1">{s.name}</div>
              <p className="text-sm text-muted-foreground">{s.note}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Must eat">
        <ul className="space-y-2">
          {it.eat.map((e) => (
            <li key={e} className="text-sm flex gap-3"><span className="text-primary">·</span><span>{e}</span></li>
          ))}
        </ul>
      </Section>

      <Section title="Local tips">
        <ul className="space-y-2">
          {it.tips.map((t) => (
            <li key={t} className="text-sm flex gap-3"><span className="text-primary">·</span><span>{t}</span></li>
          ))}
        </ul>
      </Section>

      <Section title={`Postcards from ${it.city}`}>
        <PostcardsGallery city={it.city} country={it.country} />
      </Section>

      <Section title="What travellers say">
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          {it.reviews.map((r) => (
            <div key={r.name} className="shrink-0 w-72 bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">{r.name}</div>
                <div className="text-primary text-xs">{"★".repeat(r.stars)}</div>
              </div>
              <p className="text-sm text-foreground/80">{r.text}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h3 className="font-serif-italic text-2xl mb-4">{title}</h3>
      {children}
    </section>
  );
}

function CardReelStrip({ city, country }: { city: string; country: string; fallbackCount?: number }) {
  const imgs = getPostcards(city, country, 3);
  return (
    <>
      {imgs.map((src, i) => (
        <div key={i} className="flex-1 aspect-[4/5] rounded-md overflow-hidden bg-muted">
          <img
            src={src}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget.parentElement as HTMLElement).classList.add("bg-gradient-to-br","from-primary/20","to-muted"); e.currentTarget.style.display = "none"; }}
          />
        </div>
      ))}
    </>
  );
}

function PostcardsGallery({ city, country }: { city: string; country: string }) {
  const imgs = getPostcards(city, country, 8);
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
      {imgs.map((src, i) => (
        <div key={i} className="shrink-0 w-48 aspect-[4/5] rounded-2xl overflow-hidden bg-muted snap-start border border-border">
          <img
            src={src}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget.parentElement as HTMLElement).classList.add("bg-gradient-to-br","from-primary/20","to-muted"); e.currentTarget.style.display = "none"; }}
          />
        </div>
      ))}
    </div>
  );
}