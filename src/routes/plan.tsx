import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
  getDestinationsForPrompt,
  getItinerary,
  type DestinationCard,
  type Itinerary,
} from "@/lib/wandr-mock";

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

function PlanPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();

  const initialPrompt = useMemo(() => {
    if (q) return q;
    if (typeof window !== "undefined") return sessionStorage.getItem("wandr:prompt") ?? "";
    return "";
  }, [q]);

  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [pane, setPane] = useState<{ label: string; cards: DestinationCard[] } | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [followup, setFollowup] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initialPrompt) {
      navigate({ to: "/" });
      return;
    }
    const result = getDestinationsForPrompt(initialPrompt);
    setPane(result);
    setChat([
      { who: "you", text: initialPrompt },
      {
        who: "wandr",
        text: `Ok — ${result.label.toLowerCase()}. Here are four that fit. Pick one and I'll sketch a plan.`,
      },
    ]);
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const pickCard = (card: DestinationCard) => {
    const it = getItinerary(card);
    setItinerary(it);
    setChat((c) => [
      ...c,
      { who: "you", text: `Let's go with ${card.city}.` },
      {
        who: "wandr",
        text: `Great pick. Here's a ${it.durationDays}-day take on ${card.city} — open any day, swap things out, tell me what's off.`,
      },
    ]);
  };

  const sendFollowup = (e: React.FormEvent) => {
    e.preventDefault();
    const v = followup.trim();
    if (!v) return;
    setChat((c) => [
      ...c,
      { who: "you", text: v },
      {
        who: "wandr",
        text: itinerary
          ? "Noted — I'd tweak the itinerary for that. (Live edits come when we wire the API.)"
          : "Got it. Pick one of the cards on the right and I'll build it out.",
      },
    ]);
    setFollowup("");
  };

  const startOver = () => {
    sessionStorage.removeItem("wandr:prompt");
    navigate({ to: "/" });
  };

  return (
    <div className="h-screen flex bg-background text-foreground overflow-hidden">
      {/* LEFT: chat */}
      <aside className="w-[380px] shrink-0 border-r border-border flex flex-col bg-card">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <span className="font-serif-italic text-xl text-primary">Wandr</span>
          <button
            onClick={startOver}
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Start over
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {chat.map((m, i) => (
            <div key={i} className="space-y-1">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {m.who === "you" ? "You" : "Wandr"}
              </div>
              <div
                className={
                  m.who === "you"
                    ? "text-sm leading-relaxed"
                    : "text-sm leading-relaxed font-serif-italic text-foreground/90 text-base"
                }
              >
                {m.text}
              </div>
            </div>
          ))}
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
            <button
              type="submit"
              className="bg-primary text-primary-foreground rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer"
            >
              Send
            </button>
          </div>
        </form>
      </aside>

      {/* RIGHT: results */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-10">
          {!itinerary && pane && <CardsView pane={pane} onPick={pickCard} />}
          {itinerary && <ItineraryView it={itinerary} onBack={() => setItinerary(null)} />}
        </div>
      </main>
    </div>
  );
}

function CardsView({
  pane,
  onPick,
}: {
  pane: { label: string; cards: DestinationCard[] };
  onPick: (c: DestinationCard) => void;
}) {
  return (
    <>
      <h2 className="font-serif-italic text-4xl mb-1">{pane.label}</h2>
      <p className="text-sm text-muted-foreground mb-8">
        Four real options. Pick one — you can always come back.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pane.cards.map((c) => (
          <button
            key={c.id}
            onClick={() => onPick(c)}
            className="text-left bg-card border border-border rounded-2xl p-5 hover:border-primary hover:shadow-sm transition-all cursor-pointer group"
          >
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              {c.country}
            </div>
            <div className="font-serif-italic text-2xl mb-2 group-hover:text-primary transition-colors">
              {c.city}
            </div>
            <p className="text-sm text-foreground/80 mb-4">{c.tag}</p>
            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground border-t border-border pt-3">
              <span>{c.bestMonths}</span>
              <span>·</span>
              <span>{c.budget}</span>
              <span>·</span>
              <span>{c.flightTime}</span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function ItineraryView({ it, onBack }: { it: Itinerary; onBack: () => void }) {
  const [openDay, setOpenDay] = useState(1);
  return (
    <>
      <button
        onClick={onBack}
        className="text-xs text-muted-foreground hover:text-foreground mb-4 cursor-pointer"
      >
        ← Back to options
      </button>

      {/* Hero */}
      <div className="bg-card border border-border rounded-3xl p-8 mb-10">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          {it.country} · {it.durationDays} days
        </div>
        <h1 className="font-serif-italic text-5xl mb-3">{it.city}</h1>
        <p className="text-base text-foreground/80 max-w-prose">{it.summary}</p>
      </div>

      {/* Days */}
      <section className="mb-12">
        <h3 className="font-serif-italic text-2xl mb-4">Day by day</h3>
        <div className="border border-border rounded-2xl overflow-hidden bg-card">
          {it.days.map((d) => {
            const open = openDay === d.day;
            return (
              <div key={d.day} className="border-b border-border last:border-b-0">
                <button
                  onClick={() => setOpenDay(open ? -1 : d.day)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/40 cursor-pointer"
                >
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Day {d.day}
                    </div>
                    <div className="font-serif-italic text-xl">{d.title}</div>
                  </div>
                  <span className="text-muted-foreground text-sm">{open ? "−" : "+"}</span>
                </button>
                {open && (
                  <div className="px-5 pb-5 space-y-3 text-sm">
                    <Slot label="Morning" text={d.morning} />
                    <Slot label="Afternoon" text={d.afternoon} />
                    <Slot label="Evening" text={d.evening} />
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
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                {s.tier}
              </div>
              <div className="font-medium mb-1">{s.name}</div>
              <p className="text-sm text-muted-foreground">{s.note}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Eat */}
      <Section title="Must eat">
        <ul className="space-y-2">
          {it.eat.map((e) => (
            <li key={e} className="text-sm flex gap-3">
              <span className="text-primary">·</span>
              <span>{e}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Tips */}
      <Section title="Local tips">
        <ul className="space-y-2">
          {it.tips.map((t) => (
            <li key={t} className="text-sm flex gap-3">
              <span className="text-primary">·</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Videos */}
      <Section title="Watch before you go">
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          {it.videos.map((v) => (
            <a
              key={v.title}
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(v.query)}`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 w-64 bg-card border border-border rounded-2xl overflow-hidden hover:border-primary cursor-pointer transition-colors"
            >
              <div className="aspect-video bg-gradient-to-br from-primary/15 to-muted grid place-items-center text-primary text-3xl">
                ▶
              </div>
              <div className="p-3">
                <div className="text-sm font-medium line-clamp-2">{v.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{v.channel}</div>
              </div>
            </a>
          ))}
        </div>
      </Section>

      {/* Reviews */}
      <Section title="What travellers say">
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          {it.reviews.map((r) => (
            <div
              key={r.name}
              className="shrink-0 w-72 bg-card border border-border rounded-2xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">{r.name}</div>
                <div className="text-primary text-xs">{"★".repeat(r.stars)}</div>
              </div>
              <p className="text-sm text-foreground/80">{r.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Reels */}
      <Section title="Reels & shorts">
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          {it.reels.map((r) => (
            <a
              key={r.title}
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(r.query)}&sp=EgIYAQ%253D%253D`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 w-40 bg-card border border-border rounded-2xl overflow-hidden hover:border-primary cursor-pointer transition-colors"
            >
              <div className="aspect-[9/16] bg-gradient-to-br from-primary/25 to-muted grid place-items-center text-primary text-2xl">
                ▶
              </div>
              <div className="p-2.5">
                <div className="text-xs font-medium line-clamp-2">{r.title}</div>
              </div>
            </a>
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

function Slot({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
        {label}
      </div>
      <div className="text-sm text-foreground/85">{text}</div>
    </div>
  );
}