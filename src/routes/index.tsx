import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { getRandomSuggestions } from "@/lib/wandr-mock";
import { LogoWordmark } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wandr — Plan a trip you'll actually take" },
      { name: "description", content: "Tell Wandr a vibe, a city, or a feeling. We'll handle the planning." },
      { property: "og:title", content: "Wandr" },
      { property: "og:description", content: "Plan a trip you'll actually take." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [chips, setChips] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setChips(getRandomSuggestions(4));
    inputRef.current?.focus();
  }, []);

  const submit = (value?: string) => {
    const v = (value ?? prompt).trim();
    if (v.length < 3) {
      inputRef.current?.focus();
      return;
    }
    if (typeof window !== "undefined") {
      sessionStorage.setItem("wandr:prompt", v);
    }
    navigate({ to: "/plan", search: { q: v } });
  };

  return (
    <main className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="px-8 pt-8">
        <LogoWordmark size={32} className="text-2xl" />
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-6 -mt-12">
        <h1 className="font-serif-italic text-6xl md:text-7xl text-center text-balance mb-10">
          Ready to <span className="text-accent">Wandr</span>?
        </h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="w-full max-w-2xl"
        >
          <div className="flex items-center gap-2 bg-card rounded-full border border-border shadow-sm pl-6 pr-2 py-2 focus-within:border-primary transition-colors">
            <input
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. a week in Morocco, slow pace, riads only"
              className="flex-1 bg-transparent outline-none text-base py-2 placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm font-normal hover:opacity-90 transition-opacity cursor-pointer"
            >
              Let's go
            </button>
          </div>
        </form>

        <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-2xl">
          {chips.map((chip) => (
            <button
              key={chip}
              onClick={() => {
                setPrompt(chip);
                inputRef.current?.focus();
              }}
              className="px-3.5 py-1.5 rounded-full border border-border bg-card text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>
      </section>

      <footer className="px-6 pb-12">
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          {[
            { n: "01", t: "Tell us a vibe", d: "A city, a feeling, or 'no idea, surprise me.'" },
            { n: "02", t: "Pick from a shortlist", d: "We hand back a few real options, no fluff." },
            { n: "03", t: "Get a day-by-day plan", d: "With where to stay, eat, and what to skip." },
          ].map((s) => (
            <div key={s.n} className="px-4">
              <div className="font-serif-italic text-primary text-lg mb-1">{s.n}</div>
              <div className="font-normal text-sm mb-1">{s.t}</div>
              <div className="text-xs text-muted-foreground">{s.d}</div>
            </div>
          ))}
        </div>
      </footer>
    </main>
  );
}
