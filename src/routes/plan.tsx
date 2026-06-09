import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { LogoWordmark, LogoAvatar } from "@/components/Logo";
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

type ChatMsg = { who: "you" | "wandr"; text: string; quickReplies?: string[] };

type ChipKey = "when" | "who" | "budget" | "pace";
const CHIPS: { key: ChipKey; label: string; options: string[] }[] = [
  { key: "when", label: "🗓 When", options: ["Next month", "In 3 months", "This summer", "Flexible"] },
  { key: "who", label: "👥 Who with", options: ["Solo", "Partner", "With kids", "With older parents", "Friends"] },
  { key: "budget", label: "💸 Budget", options: ["$ shoestring", "$$ comfortable", "$$$ treat", "Open"] },
  { key: "pace", label: "🌿 Pace", options: ["Mindful", "Balanced", "Pack it in"] },
];

function PlanPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const act = useServerFn(wandrAct);

  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [brief, setBrief] = useState<TripBrief>({});
  const [pane, setPane] = useState<{ label: string; cards: DestinationCard[] } | null>(null);
  const [previewMode, setPreviewMode] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
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

  const pushWandr = (text: string, quickReplies?: string[]) =>
    setChat((c) => [...c, { who: "wandr", text, quickReplies }]);

  const runShortlist = async (prompt: string, refinement?: string) => {
    setThinking(true);
    try {
      const r = await act({ data: { mode: "shortlist", prompt, refinement, brief: briefRef.current, history: chatRef.current } });
      if (r.cards && r.cards.length) {
        setPane({ label: r.label ?? "A few ideas", cards: r.cards });
        setPreviewMode(false);
      }
      if (r.reply) pushWandr(r.reply, r.quickReplies);
    } catch (e) {
      // graceful fallback to mock
      const fb = getDestinationsForPrompt(prompt);
      setPane(fb);
      setPreviewMode(false);
      pushWandr(`(Using offline picks — ${(e as Error).message.slice(0, 80)})`);
    } finally {
      setThinking(false);
    }
  };

  // Silent background shortlist that refreshes the right pane while the
  // intake Q&A is still happening. Doesn't push chat or block the UI.
  const runPreview = async (prompt: string) => {
    if (itinerary) return;
    setPreviewLoading(true);
    try {
      const r = await act({ data: { mode: "shortlist", prompt, brief: briefRef.current, history: chatRef.current } });
      if (r.cards && r.cards.length) {
        setPane({ label: r.label ?? "Early ideas", cards: r.cards });
      }
    } catch {
      const fb = getDestinationsForPrompt(prompt);
      setPane(fb);
    } finally {
      setPreviewLoading(false);
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
      if (r.reply) pushWandr(r.reply, r.quickReplies);
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
    setChat([{ who: "you", text: initialPrompt }]);
    // Kick off a conversational intake instead of jumping straight to cards.
    runIntake(initialPrompt);
    // And immediately seed the right pane with preview recommendations.
    runPreview(initialPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runIntake = async (prompt: string) => {
    setThinking(true);
    try {
      const r = await act({ data: {
        mode: "reply",
        brief: briefRef.current,
        history: chatRef.current,
        prompt,
        refinement: prompt,
        paneShown: false,
      }});
      if (r.brief) setBrief((b) => ({ ...b, ...r.brief }));
      if (r.reply) pushWandr(r.reply, r.quickReplies);
      if (r.intent === "itinerary" && r.destination) {
        const card: DestinationCard = {
          id: r.destination.city.toLowerCase().replace(/\s+/g, "-"),
          city: r.destination.city,
          country: r.destination.country,
          tag: "", bestMonths: "", budget: "", flightTime: "",
        };
        await runItinerary(card, paceToStyle(briefRef.current.pace));
      } else if (r.intent === "shortlist") {
        await runShortlist(prompt);
      }
    } catch (e) {
      pushWandr(`(Hit a snag — ${(e as Error).message.slice(0, 80)}) Tell me when you're thinking of going?`);
    } finally {
      setThinking(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const setChip = (key: ChipKey, value: string) => {
    const next = { ...briefRef.current, [key]: value };
    setBrief(next);
    setOpenChip(null);
    setChat((c) => [
      ...c,
      { who: "you", text: `${CHIPS.find((x) => x.key === key)!.label}: ${value}` },
      { who: "wandr", text: wittyAckFor(key, value) },
    ]);
    // Refresh preview cards as the brief gets richer.
    if (!itinerary && previewMode) runPreview(q ?? "");
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
    setFollowup("");
    await submitMessage(v);
  };

  const submitMessage = async (v: string) => {
    setChat((c) => [...c, { who: "you", text: v }]);
    setThinking(true);
    try {
      const paneCommitted = (!!pane && !previewMode) || !!itinerary;
      const r = await act({ data: { mode: "reply", brief: briefRef.current, history: [...chatRef.current, { who: "you", text: v }], refinement: v, paneShown: paneCommitted } });
      if (r.brief) setBrief((b) => ({ ...b, ...r.brief }));
      if (r.reply) pushWandr(r.reply, r.quickReplies);
      if (r.intent === "itinerary" && r.destination && !itinerary) {
        // User named a destination in chat — skip cards, go straight to itinerary.
        const card: DestinationCard = {
          id: r.destination.city.toLowerCase().replace(/\s+/g, "-"),
          city: r.destination.city,
          country: r.destination.country,
          tag: "", bestMonths: "", budget: "", flightTime: "",
        };
        await runItinerary(card, paceToStyle(briefRef.current.pace));
      } else if (r.intent === "itinerary" && itinerary) {
        const card: DestinationCard = { id: itinerary.id, city: itinerary.city, country: itinerary.country, tag: "", bestMonths: "", budget: "", flightTime: "", reels: itinerary.reels };
        await runItinerary(card, itinerary.style, v, itinerary);
      } else if (r.intent === "shortlist") {
        await runShortlist(q ?? itinerary?.city ?? "", v);
      } else if (r.intent === "chat" && !itinerary && previewMode) {
        // Silently refresh the live preview as more details come in.
        runPreview(q ?? "");
      }
    } catch (e) {
      pushWandr(`Hmm, I lost my train of thought (${(e as Error).message.slice(0, 80)}). Try again?`);
    } finally {
      setThinking(false);
    }
  };

  const paceToStyle = (pace?: string): ItineraryStyle =>
    pace === "Mindful" ? "mindful" : pace === "Pack it in" ? "max" : "balanced";

  const setStyle = (style: ItineraryStyle) => {
    if (!itinerary) return;
    const card: DestinationCard = {
      id: itinerary.id, city: itinerary.city, country: itinerary.country,
      tag: "", bestMonths: "", budget: "", flightTime: "",
      reels: itinerary.reels,
    };
    runItinerary(card, style, `Reshape to a ${style} pace.`, itinerary);
  };

  const moveStopAcross = (fromDay: number, fromStop: number, toDay: number, toStop: number) => {
    if (!itinerary) return;
    if (fromDay === toDay && fromStop === toStop) return;
    const days = itinerary.days.map((d) => ({ ...d, stops: [...d.stops] }));
    const [moved] = days[fromDay].stops.splice(fromStop, 1);
    const insertAt = fromDay === toDay && toStop > fromStop ? toStop - 1 : toStop;
    days[toDay].stops.splice(Math.max(0, Math.min(insertAt, days[toDay].stops.length)), 0, moved);
    setItinerary({ ...itinerary, days });
  };

  const removeStop = (dayIdx: number, stopIdx: number) => {
    if (!itinerary) return;
    const days = itinerary.days.map((d) => ({ ...d, stops: [...d.stops] }));
    days[dayIdx].stops.splice(stopIdx, 1);
    setItinerary({ ...itinerary, days });
  };

  const addStop = (dayIdx: number, title: string) => {
    if (!itinerary) return;
    const clean = title.trim();
    if (!clean) return;
    const days = itinerary.days.map((d) => ({ ...d, stops: [...d.stops] }));
    const existing = days[dayIdx].stops;
    const nextTime = existing.length <= 1 ? "morning" : existing.length === 2 ? "afternoon" : "evening";
    days[dayIdx].stops.push({
      id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      title: clean,
      note: "Added by you",
      durationMin: 90,
      timeOfDay: nextTime,
    });
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
          <LogoWordmark size={56} className="text-3xl gap-2.5" />
          <button onClick={startOver} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">
            Start over
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {chat.map((m, i) => {
            const isLast = i === chat.length - 1;
            return (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {m.who === "you" ? (
                    "You"
                  ) : (
                    <>
                      <LogoAvatar size={20} />
                      <span className="font-serif-italic text-accent">Wandr</span>
                    </>
                  )}
                </div>
                <div className={m.who === "you" ? "text-sm leading-relaxed" : "text-base leading-relaxed font-serif-italic text-foreground/90"}>
                  {m.text}
                </div>
                {m.who === "wandr" && isLast && !thinking && m.quickReplies && m.quickReplies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {m.quickReplies.map((q) => (
                      <button
                        key={q}
                        onClick={() => submitMessage(q)}
                        className="text-xs px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-foreground hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {thinking && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
              <LogoAvatar size={20} />
              <span className="font-serif-italic text-accent">Wandr</span>
              <span>is thinking…</span>
            </div>
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
            <button type="submit" className="bg-primary text-primary-foreground rounded-full px-3 py-1.5 text-xs font-normal cursor-pointer">Send</button>
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
                      <span className="font-normal text-foreground/80">{value ?? "—"}</span>
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

          {!itinerary && pane && (
            <CardsView
              pane={pane}
              brief={brief}
              onPick={tryPick}
              preview={previewMode}
              previewLoading={previewLoading}
            />
          )}
          {!itinerary && !pane && (
            <div className="text-center text-sm text-muted-foreground py-24">
              <div className="font-serif-italic text-2xl text-foreground/70 mb-2">Sketching some ideas…</div>
              <div>Recommendations will appear here and refine as we chat.</div>
            </div>
          )}
          {itinerary && (
            <ItineraryView
              it={itinerary}
              onBack={() => setItinerary(null)}
              onStyle={setStyle}
              onMoveAcross={moveStopAcross}
              onRemove={removeStop}
              onAddStop={addStop}
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
  preview,
  previewLoading,
}: {
  pane: { label: string; cards: DestinationCard[] };
  brief: TripBrief;
  onPick: (c: DestinationCard) => void;
  preview?: boolean;
  previewLoading?: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-3 mb-1">
        <h2 className="font-serif-italic text-4xl">{pane.label}</h2>
        {preview && (
          <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full bg-accent/15 text-accent border border-accent/30">
            {previewLoading ? "Refining…" : "Live preview"}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        {preview
          ? "These shift as we chat. Pick one anytime to lock it in."
          : "Real options — scroll through. Tap the polaroid stack to flip photos. ✨"}
      </p>
      <div className="flex flex-col gap-8">
        {pane.cards.map((c) => {
          const conflicts = getConflicts(c, brief);
          return (
            <div
              key={c.id}
              className="bg-card border border-border rounded-2xl p-5 hover:border-primary hover:shadow-sm transition-all group grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6 items-center"
            >
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{c.country}</div>
                <div className="font-serif-italic text-3xl mb-2 group-hover:text-primary transition-colors">{c.city}</div>
                <p className="text-sm text-foreground/80 mb-4 max-w-prose">{c.tag}</p>
                <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground border-t border-border pt-3 mb-3">
                  <span>{c.bestMonths}</span><span>·</span>
                  <span>{c.budget}</span><span>·</span>
                  <span>{c.flightTime}</span>
                </div>
                {conflicts.length > 0 && (
                  <div className="mb-3 text-[11px] text-primary bg-primary/8 border border-primary/20 rounded-md px-2 py-1.5 inline-block">
                    ⚠ {conflicts[0]}
                  </div>
                )}
                <div>
                  <button
                    onClick={() => onPick(c)}
                    className="text-xs px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
                  >
                    ✈️ Plan {c.city} →
                  </button>
                </div>
              </div>
              <div className="flex justify-center md:justify-end">
                <PolaroidStack city={c.city} country={c.country} />
              </div>
            </div>
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
  onMoveAcross,
  onRemove,
  onAddStop,
  onSave,
  shareUrl,
}: {
  it: Itinerary;
  onBack: () => void;
  onStyle: (s: ItineraryStyle) => void;
  onMoveAcross: (fromDay: number, fromStop: number, toDay: number, toStop: number) => void;
  onRemove: (dayIdx: number, stopIdx: number) => void;
  onAddStop: (dayIdx: number, title: string) => void;
  onSave: () => void;
  shareUrl: string | null;
}) {
  const [tab, setTab] = useState<"days" | "stay" | "eat" | "postcards" | "reviews">("days");
  const dragRef = useRef<{ dayIdx: number; stopIdx: number } | null>(null);
  const [dragOver, setDragOver] = useState<{ dayIdx: number; stopIdx: number } | null>(null);
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [addText, setAddText] = useState("");

  // Flat list of all stops for modal prev/next navigation
  const allStops = it.days.flatMap((d, dayIdx) =>
    d.stops.map((s, stopIdx) => ({ stop: s, dayTitle: d.title, dayIdx, stopIdx }))
  );
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const tabs: { key: typeof tab; label: string }[] = [
    { key: "days", label: "Days" },
    { key: "stay", label: "Stay" },
    { key: "eat", label: "Eat & tips" },
    { key: "postcards", label: "Postcards" },
    { key: "reviews", label: "Reviews" },
  ];

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
      <div className="mb-6 flex items-center gap-2">
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

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-sm px-3 py-2 -mb-px border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
              tab === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "days" && (
        <section className="mb-12">
          <p className="text-xs text-muted-foreground mb-4">Drag to reorder or move across days. Use “+ Add stop” to slot in your own.</p>
          <div className="space-y-6">
            {it.days.map((d, dayIdx) => {
              const total = d.stops.reduce((a, s) => a + s.durationMin, 0);
              const commuteMins = d.stops.slice(1).reduce((sum, s, i) => sum + commuteFor(d.stops[i], s).mins, 0);
              return (
                <div key={d.day}>
                  <div className="flex items-baseline justify-between mb-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Day {d.day} · {Math.round(total / 60)}h
                        {commuteMins > 0 && <span> · {commuteMins}m getting around</span>}
                      </div>
                      <div className="font-serif-italic text-2xl">{d.title}</div>
                      {d.theme && (
                        <div className="text-xs text-muted-foreground mt-1 max-w-md italic">
                          Why together: {d.theme}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => { setAddingDay(dayIdx); setAddText(""); }}
                      className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:border-primary/50 cursor-pointer whitespace-nowrap"
                    >
                      + Add stop
                    </button>
                  </div>
                  <div
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = dragRef.current;
                      if (!from) return;
                      onMoveAcross(from.dayIdx, from.stopIdx, dayIdx, d.stops.length);
                      dragRef.current = null;
                      setDragOver(null);
                    }}
                    className="p-2 rounded-xl bg-muted/30 border border-dashed border-border min-h-[120px]"
                  >
                    {d.stops.length === 0 && (
                      <div className="text-sm text-muted-foreground italic px-2 py-6 text-center">
                        Empty day. Drop a stop here, or add one above.
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {d.stops.map((s, i) => {
                        const isOver = dragOver?.dayIdx === dayIdx && dragOver?.stopIdx === i;
                        const prev = i > 0 ? d.stops[i - 1] : null;
                        return (
                          <StopCard
                              key={s.id}
                              stop={s}
                              city={it.city}
                              country={it.country}
                              isOver={isOver}
                              commute={prev ? commuteFor(prev, s) : null}
                              onDragStart={() => { dragRef.current = { dayIdx, stopIdx: i }; }}
                              onDragEnd={() => { dragRef.current = null; setDragOver(null); }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                if (!dragOver || dragOver.dayIdx !== dayIdx || dragOver.stopIdx !== i) {
                                  setDragOver({ dayIdx, stopIdx: i });
                                }
                              }}
                              onDragLeave={() => {
                                if (dragOver?.dayIdx === dayIdx && dragOver?.stopIdx === i) setDragOver(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                const from = dragRef.current;
                                if (!from) return;
                                onMoveAcross(from.dayIdx, from.stopIdx, dayIdx, i);
                                dragRef.current = null;
                                setDragOver(null);
                              }}
                              onRemove={() => onRemove(dayIdx, i)}
                              onExpand={() => setExpandedIndex(allStops.findIndex((x) => x.stop.id === s.id))}
                          />
                        );
                      })}
                    </div>
                    {addingDay === dayIdx ? (
                      <form
                        onSubmit={(e) => { e.preventDefault(); onAddStop(dayIdx, addText); setAddingDay(null); setAddText(""); }}
                        className="mt-3 flex items-center gap-2"
                      >
                        <input
                          autoFocus
                          value={addText}
                          onChange={(e) => setAddText(e.target.value)}
                          placeholder="e.g. Templo Mayor museum"
                          className="flex-1 text-sm bg-card border border-border rounded-full px-3 py-1.5 outline-none focus:border-primary"
                        />
                        <button type="submit" className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground cursor-pointer">Add</button>
                        <button type="button" onClick={() => setAddingDay(null)} className="text-xs px-2 py-1.5 text-muted-foreground hover:text-foreground cursor-pointer">Cancel</button>
                      </form>
                    ) : (
                      <button
                        onClick={() => { setAddingDay(dayIdx); setAddText(""); }}
                        className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-xl py-2 cursor-pointer"
                      >
                        + Add a stop to day {d.day}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {tab === "stay" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-12">
          {it.stay.map((s) => (
            <div key={s.tier} className="bg-card border border-border rounded-2xl p-4">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{s.tier}</div>
              <div className="font-normal text-foreground/90 mb-1">{s.name}</div>
              <p className="text-sm text-muted-foreground">{s.note}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "eat" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div>
            <h3 className="font-serif-italic text-xl mb-3">Must eat</h3>
            <ul className="space-y-2">
              {it.eat.map((e) => (
                <li key={e} className="text-sm flex gap-3"><span className="text-primary">·</span><span>{e}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-serif-italic text-xl mb-3">Local tips</h3>
            <ul className="space-y-2">
              {it.tips.map((t) => (
                <li key={t} className="text-sm flex gap-3"><span className="text-primary">·</span><span>{t}</span></li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === "postcards" && (
        <div className="mb-12">
          <PostcardsGallery city={it.city} country={it.country} />
        </div>
      )}

      {tab === "reviews" && (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 mb-12">
          {it.reviews.map((r) => (
            <div key={r.name} className="shrink-0 w-72 bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-normal text-foreground/90">{r.name}</div>
                <div className="text-primary text-xs">{"★".repeat(r.stars)}</div>
              </div>
              <p className="text-sm text-foreground/80">{r.text}</p>
            </div>
          ))}
        </div>
      )}

      {expandedIndex !== null && allStops[expandedIndex] && (
        <StopDetailModal
          stop={allStops[expandedIndex].stop}
          dayTitle={allStops[expandedIndex].dayTitle}
          city={it.city}
          country={it.country}
          hasPrev={expandedIndex > 0}
          hasNext={expandedIndex < allStops.length - 1}
          onPrev={() => setExpandedIndex(expandedIndex - 1)}
          onNext={() => setExpandedIndex(expandedIndex + 1)}
          onClose={() => setExpandedIndex(null)}
        />
      )}
    </>
  );
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

type Commute = { icon: string; label: string; mins: number };

function commuteFor(from: { id: string }, to: { id: string }): Commute {
  const seed = hashStr(from.id + "→" + to.id);
  const modes: Commute["label"][] = ["walk", "metro", "taxi", "bus"];
  const icons: Record<string, string> = { walk: "🚶", metro: "🚇", taxi: "🚕", bus: "🚌" };
  const label = modes[seed % modes.length];
  const mins = 5 + ((seed >> 3) % 7) * 5;
  return { icon: icons[label], label, mins };
}

function stopImages(stop: { id: string; title: string }, city: string, country: string, n = 6): string[] {
  // Reuse the postcards source (proven reliable) and rotate per stop id.
  const pool = getPostcards(city, country, 8);
  const offset = hashStr(stop.id) % pool.length;
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(pool[(offset + i) % pool.length]);
  return out;
}

function StopCard({
  stop, city, country, isOver, commute,
  onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, onRemove, onExpand,
}: {
  stop: { id: string; title: string; note: string; durationMin: number; timeOfDay: string };
  city: string;
  country: string;
  isOver: boolean;
  commute: Commute | null;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onRemove: () => void;
  onExpand: () => void;
}) {
  const img = stopImages(stop, city, country, 1)[0];
  const hours = Math.round((stop.durationMin / 60) * 10) / 10;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onExpand}
      className={`group relative bg-card border rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing transition-all ${
        isOver ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
      }`}
    >
      <div className="aspect-[16/10] bg-muted relative">
        <img
          src={img}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget.parentElement as HTMLElement).classList.add("bg-gradient-to-br", "from-primary/20", "to-muted");
            e.currentTarget.style.display = "none";
          }}
        />
        <div className="absolute top-2 left-2 text-[10px] uppercase tracking-widest bg-background/85 backdrop-blur px-2 py-0.5 rounded-full text-foreground/80">
          {stop.timeOfDay}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label="Remove stop"
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/85 backdrop-blur text-xs text-foreground/70 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          ×
        </button>
        {commute && (
          <div className="absolute bottom-2 left-2 text-[10px] inline-flex items-center gap-1 bg-background/85 backdrop-blur px-2 py-0.5 rounded-full text-foreground/75">
            <span aria-hidden>{commute.icon}</span>
            <span>{commute.mins}m {commute.label} from last stop</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-sm font-normal text-foreground/90 leading-snug truncate">{stop.title}</div>
          <div className="text-[10px] text-muted-foreground shrink-0">{hours}h</div>
        </div>
        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{stop.note}</div>
      </div>
    </div>
  );
}

function PolaroidStack({ city, country }: { city: string; country: string }) {
  const imgs = getPostcards(city, country, 5);
  const [order, setOrder] = useState<number[]>(() => imgs.map((_, i) => i));
  const cycle = () => setOrder((o) => [...o.slice(1), o[0]]);
  // Pre-baked rotations/offsets per stack position for that scattered polaroid feel.
  const poses = [
    { r: -6, x: -10, y: 4 },
    { r: 4, x: 8, y: -2 },
    { r: -2, x: -4, y: 8 },
    { r: 7, x: 12, y: 6 },
    { r: -9, x: 2, y: 10 },
  ];
  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Flip ${city} photos`}
      className="relative w-[240px] h-[280px] cursor-pointer select-none group/stack"
    >
      {order.map((imgIdx, pos) => {
        const isTop = pos === order.length - 1;
        const pose = poses[pos % poses.length];
        return (
          <div
            key={imgIdx}
            className="absolute left-1/2 top-1/2 bg-white p-2 pb-8 rounded-sm shadow-lg border border-black/5 transition-all duration-500 ease-out"
            style={{
              transform: `translate(-50%, -50%) translate(${pose.x}px, ${pose.y}px) rotate(${pose.r}deg) ${isTop ? "scale(1.02)" : ""}`,
              zIndex: pos + 1,
              width: 200,
            }}
          >
            <div className="w-full aspect-[4/5] bg-muted overflow-hidden">
              <img
                src={imgs[imgIdx]}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget.parentElement as HTMLElement).classList.add("bg-gradient-to-br","from-primary/20","to-muted");
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
            {isTop && (
              <div className="absolute bottom-1.5 left-0 right-0 text-center font-serif-italic text-[13px] text-foreground/70">
                {city}
              </div>
            )}
          </div>
        );
      })}
      <div className="absolute -bottom-1 left-0 right-0 text-center text-[10px] uppercase tracking-widest text-muted-foreground opacity-60 group-hover/stack:opacity-100 transition-opacity">
        👆 tap to flip
      </div>
    </button>
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

function StopDetailModal({
  stop, dayTitle, city, country, onClose, hasPrev, hasNext, onPrev, onNext,
}: {
  stop: { id: string; title: string; note: string; durationMin: number; timeOfDay: string };
  dayTitle: string;
  city: string;
  country: string;
  onClose: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const variants = ["shorts", "walk tour", "vlog", "food", "travel guide", "things to do"];
  const shorts = variants.map((v) => {
    const q = `${stop.title} ${city} ${v}`;
    return {
      query: q,
      embed: `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(q)}&playsinline=1&modestbranding=1&rel=0`,
    };
  });
  return (
    <div
      className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-3xl max-w-3xl w-full my-8 overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky top nav — prev / back / next always in reach */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 bg-card/95 backdrop-blur border-b border-border">
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1"
          >
            ← Back to itinerary
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next →
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full bg-muted hover:bg-muted/70 text-foreground cursor-pointer text-lg leading-none ml-1"
            >
              ×
            </button>
          </div>
        </div>

        <div className="overflow-y-auto">
          {/* Header */}
          <div className="p-6 pb-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              {dayTitle} · {stop.timeOfDay} · {Math.round(stop.durationMin / 60 * 10) / 10}h
            </div>
            <h3 className="font-serif-italic text-3xl mb-2">{stop.title}</h3>
            <p className="text-sm text-foreground/80 leading-relaxed">{stop.note}</p>
          </div>

          {/* Shorts feed — horizontal on desktop, vertical snap on mobile */}
          <div className="px-6 pb-6">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 md:mb-3">
              Shorts · <span className="hidden md:inline">scroll sideways for more</span><span className="md:hidden">swipe up for more</span>
            </div>
            {/* Mobile: vertical snap scroll; Desktop: horizontal snap scroll */}
            <div className="h-[70vh] overflow-y-auto snap-y snap-mandatory rounded-2xl bg-black space-y-0 md:h-[540px] md:overflow-x-auto md:overflow-y-hidden md:snap-x md:snap-mandatory md:flex md:flex-row md:gap-3 md:rounded-2xl md:bg-black/5 md:p-3">
              {shorts.map((s, i) => (
                <div
                  key={i}
                  className="snap-start h-[70vh] w-full flex items-center justify-center relative md:h-[520px] md:w-[292px] md:shrink-0 md:snap-start"
                >
                  <div className="aspect-[9/16] h-full max-h-[70vh] bg-black relative md:h-full md:max-h-full md:w-full md:rounded-xl md:overflow-hidden">
                    <iframe
                      src={s.embed}
                      title={s.query}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                    <div className="absolute bottom-3 left-3 text-[10px] uppercase tracking-widest bg-black/60 text-white px-2 py-0.5 rounded-full">
                      {s.query.split(" ").slice(-2).join(" ")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}