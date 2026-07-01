export type TripBrief = {
  when?: string;
  who?: string;
  budget?: string;
  pace?: string;
  duration?: string;
};

export type Caveat = "steep" | "lots-of-walking" | "hot" | "long-transfers";

export type DestinationCard = {
  id: string;
  country: string;
  city: string;
  tag: string;
  bestMonths: string;
  budget: string;
  flightTime: string;
  caveats?: Caveat[];
  reels?: { title: string; query: string }[];
};

export type Stop = {
  id: string;
  title: string;
  note: string;
  durationMin: number;
  timeOfDay: "morning" | "afternoon" | "evening";
};

export type DayPlan = {
  day: number;
  title: string;
  theme?: string;
  stops: Stop[];
};

export type ItineraryStyle = "mindful" | "balanced" | "max";

export type Itinerary = {
  id: string;
  city: string;
  country: string;
  summary: string;
  durationDays: number;
  style: ItineraryStyle;
  days: DayPlan[];
  stay: { tier: string; name: string; note: string }[];
  eat: string[];
  tips: string[];
  videos: { title: string; channel: string; query: string }[];
  reviews: { name: string; stars: number; text: string }[];
  reels: { title: string; query: string }[];
};

const SUGGESTIONS = [
  "A week in Morocco — souks, riads, no rush",
  "Japan in cherry blossom season, slow pace",
  "Bali with kids, beach + culture",
  "Lisbon long weekend, food + tiles",
  "Rome for first-timers, 5 days",
  "Hidden corners of Mexico City",
  "Vietnam street food crawl, 10 days",
  "Petra & Wadi Rum, mid-Oct",
  "Italy coast, no chain hotels",
  "Medellin for digital nomads",
  "Tokyo rainy nights, neon and ramen",
  "Hoi An lanterns + tailors, 4 nights",
  "Ubud yoga + waterfalls, quiet",
  "Kyoto temples without crowds",
];

export function getRandomSuggestions(n = 4): string[] {
  const pool = [...SUGGESTIONS];
  const out: string[] = [];
  while (out.length < n && pool.length) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

const reels = (city: string) => [
  { title: `48 hours in ${city}`, query: `${city} 48 hours` },
  { title: `${city} aesthetic`, query: `${city} aesthetic reel` },
  { title: `Hidden ${city}`, query: `hidden ${city}` },
];

const SETS: Record<string, DestinationCard[]> = {
  morocco: [
    { id: "marrakech", country: "Morocco", city: "Marrakech", tag: "Souks, riads, rooftop sundowns.", bestMonths: "Mar–May · Oct", budget: "$$", flightTime: "7h from NYC", caveats: ["lots-of-walking", "hot"], reels: reels("Marrakech") },
    { id: "fes", country: "Morocco", city: "Fes", tag: "Medieval medina, no cars, real deal.", bestMonths: "Apr–Jun", budget: "$$", flightTime: "8h from NYC", caveats: ["lots-of-walking", "steep"], reels: reels("Fes") },
    { id: "chefchaouen", country: "Morocco", city: "Chefchaouen", tag: "The blue town. Slow it down.", bestMonths: "Mar–May", budget: "$", flightTime: "+3h from Fes", caveats: ["steep"], reels: reels("Chefchaouen") },
    { id: "essaouira", country: "Morocco", city: "Essaouira", tag: "Windy coast, fresh sardines, art.", bestMonths: "Apr–Sep", budget: "$$", flightTime: "+3h from Marrakech", reels: reels("Essaouira") },
  ],
  japan: [
    { id: "kyoto", country: "Japan", city: "Kyoto", tag: "Temples, tea, lacquer-thin mornings.", bestMonths: "Mar–May · Nov", budget: "$$$", flightTime: "13h from NYC", caveats: ["lots-of-walking", "steep"], reels: reels("Kyoto") },
    { id: "tokyo", country: "Japan", city: "Tokyo", tag: "Neon, ramen, somehow also calm.", bestMonths: "Mar–May · Oct", budget: "$$$", flightTime: "13h from NYC", reels: reels("Tokyo") },
    { id: "osaka", country: "Japan", city: "Osaka", tag: "Eat first, ask questions never.", bestMonths: "Mar–May", budget: "$$", flightTime: "+2h Shinkansen", reels: reels("Osaka") },
    { id: "hiroshima", country: "Japan", city: "Hiroshima", tag: "Heavy history, lighter okonomiyaki.", bestMonths: "Mar–May", budget: "$$", flightTime: "+4h Shinkansen", reels: reels("Hiroshima") },
  ],
  bali: [
    { id: "ubud", country: "Indonesia", city: "Ubud", tag: "Rice terraces, yoga, real quiet.", bestMonths: "May–Sep", budget: "$", flightTime: "22h from NYC", reels: reels("Ubud") },
    { id: "canggu", country: "Indonesia", city: "Canggu", tag: "Surf, cafés, laptops on the beach.", bestMonths: "May–Sep", budget: "$$", flightTime: "22h from NYC", reels: reels("Canggu") },
    { id: "seminyak", country: "Indonesia", city: "Seminyak", tag: "Beach clubs without the chaos.", bestMonths: "May–Sep", budget: "$$", flightTime: "22h from NYC", reels: reels("Seminyak") },
    { id: "uluwatu", country: "Indonesia", city: "Uluwatu", tag: "Cliff temples + the bluest water.", bestMonths: "May–Sep", budget: "$$", flightTime: "22h from NYC", caveats: ["steep"], reels: reels("Uluwatu") },
  ],
  italy: [
    { id: "rome", country: "Italy", city: "Rome", tag: "Ruins, espresso, controlled chaos.", bestMonths: "Apr–Jun · Sep", budget: "$$", flightTime: "9h from NYC", caveats: ["lots-of-walking"], reels: reels("Rome") },
    { id: "florence", country: "Italy", city: "Florence", tag: "Renaissance, but the bistecca is the point.", bestMonths: "Apr–Jun", budget: "$$", flightTime: "10h from NYC", caveats: ["lots-of-walking"], reels: reels("Florence") },
    { id: "amalfi", country: "Italy", city: "Amalfi Coast", tag: "Lemons, switchbacks, painfully blue sea.", bestMonths: "May–Jun · Sep", budget: "$$$", flightTime: "10h from NYC", caveats: ["steep", "long-transfers"], reels: reels("Amalfi") },
    { id: "bologna", country: "Italy", city: "Bologna", tag: "Pasta capital. No further questions.", bestMonths: "Apr–Jun", budget: "$$", flightTime: "10h from NYC", reels: reels("Bologna") },
  ],
  default: [
    { id: "lisbon", country: "Portugal", city: "Lisbon", tag: "Tiles, trams, custard tarts, repeat.", bestMonths: "Apr–Jun · Sep", budget: "$$", flightTime: "7h from NYC", caveats: ["steep"], reels: reels("Lisbon") },
    { id: "petra", country: "Jordan", city: "Petra & Wadi Rum", tag: "Carved cities + Mars-red desert.", bestMonths: "Mar–May · Oct–Nov", budget: "$$", flightTime: "12h from NYC", caveats: ["lots-of-walking", "hot"], reels: reels("Petra") },
    { id: "medellin", country: "Colombia", city: "Medellin", tag: "Spring weather, café culture, reborn city.", bestMonths: "Dec–Mar", budget: "$", flightTime: "6h from NYC", reels: reels("Medellin") },
    { id: "hoi-an", country: "Vietnam", city: "Hoi An", tag: "Lanterns, tailors, life on a slow river.", bestMonths: "Feb–Apr", budget: "$", flightTime: "20h from NYC", reels: reels("Hoi An") },
  ],
};

export function getDestinationsForPrompt(prompt: string): { label: string; cards: DestinationCard[] } {
  const p = prompt.toLowerCase();
  if (p.includes("morocco") || p.includes("marrakech") || p.includes("fes")) return { label: "Morocco", cards: SETS.morocco };
  if (p.includes("japan") || p.includes("kyoto") || p.includes("tokyo")) return { label: "Japan", cards: SETS.japan };
  if (p.includes("bali") || p.includes("ubud") || p.includes("indonesia")) return { label: "Bali", cards: SETS.bali };
  if (p.includes("italy") || p.includes("rome") || p.includes("florence") || p.includes("amalfi")) return { label: "Italy", cards: SETS.italy };
  return { label: "A few ideas to start", cards: SETS.default };
}

/** Conflicts between a card's caveats and the trip brief (who-with). */
export function getConflicts(card: DestinationCard, brief: TripBrief): string[] {
  const who = (brief.who ?? "").toLowerCase();
  const out: string[] = [];
  const has = (c: Caveat) => card.caveats?.includes(c);
  const seniors = who.includes("senior") || who.includes("older") || who.includes("parent");
  const kids = who.includes("kid") || who.includes("toddler") || who.includes("baby");
  if (seniors && has("steep")) out.push(`${card.city} has some steep climbs — okay with that for older parents?`);
  if (seniors && has("lots-of-walking")) out.push(`Heads up: ${card.city} is a lot of walking on uneven streets. Worth pacing it.`);
  if (kids && has("long-transfers")) out.push(`${card.city} has long drives between stops — long for little ones.`);
  if (kids && has("hot")) out.push(`${card.city} runs hot. Plan pool breaks.`);
  return out;
}

/* ------------ Itinerary generation ------------ */

type StopSeed = Omit<Stop, "id">;

const STOP_BANK: Record<string, StopSeed[][]> = {
  marrakech: [
    [
      { title: "Land + drop bags at riad", note: "Pick a riad inside the medina walls.", durationMin: 60, timeOfDay: "morning" },
      { title: "Wander Jemaa el-Fnaa", note: "Get lost on purpose. Mint tea, people-watch.", durationMin: 90, timeOfDay: "afternoon" },
      { title: "Rooftop sundowner", note: "Café des Épices or Nomad — pick by the breeze.", durationMin: 90, timeOfDay: "evening" },
    ],
    [
      { title: "Bahia Palace at opening", note: "Before the tour buses. 30 min beats 2 hr.", durationMin: 75, timeOfDay: "morning" },
      { title: "Souks crawl with a guide", note: "Spice, leather, lanterns. Haggle gently.", durationMin: 120, timeOfDay: "afternoon" },
      { title: "Hammam + dinner", note: "Steam, scrub, then tagine. You'll sleep like a stone.", durationMin: 180, timeOfDay: "evening" },
    ],
    [
      { title: "Day trip: Atlas foothills", note: "Berber village + tagine lunch in someone's home.", durationMin: 360, timeOfDay: "morning" },
      { title: "Back to town, pool nap", note: "Earn it.", durationMin: 90, timeOfDay: "afternoon" },
      { title: "Live gnawa music", note: "Tiny venue, ask your riad host.", durationMin: 120, timeOfDay: "evening" },
    ],
    [
      { title: "Last souk run", note: "Buy the lantern you keep thinking about.", durationMin: 60, timeOfDay: "morning" },
      { title: "Long lazy lunch", note: "Le Jardin, in a courtyard with birds.", durationMin: 120, timeOfDay: "afternoon" },
      { title: "Sunset at Koutoubia", note: "Walk the gardens, then home.", durationMin: 75, timeOfDay: "evening" },
    ],
  ],
  kyoto: [
    [
      { title: "Arrive Kyoto Station", note: "Drop bags, eat the first ramen.", durationMin: 60, timeOfDay: "morning" },
      { title: "Walk Gion at dusk", note: "Lantern light, narrow lanes, zero rush.", durationMin: 90, timeOfDay: "afternoon" },
      { title: "Izakaya off Pontocho", note: "Sit at the counter, point at things.", durationMin: 120, timeOfDay: "evening" },
    ],
    [
      { title: "Fushimi Inari at sunrise", note: "Be there by 6:30. You'll thank yourself.", durationMin: 120, timeOfDay: "morning" },
      { title: "Nishiki Market graze", note: "Tamago, pickles, matcha soft-serve.", durationMin: 90, timeOfDay: "afternoon" },
      { title: "Kaiseki dinner", note: "Reserve before you land. Worth every yen.", durationMin: 150, timeOfDay: "evening" },
    ],
    [
      { title: "Arashiyama bamboo + monkey park", note: "Bamboo first, then the climb to the monkeys.", durationMin: 240, timeOfDay: "morning" },
      { title: "Tea at Saihō-ji's neighbor", note: "Moss garden vibes without the reservation hell.", durationMin: 90, timeOfDay: "afternoon" },
      { title: "Quiet ryokan dinner", note: "Yukata on, tatami, slow.", durationMin: 120, timeOfDay: "evening" },
    ],
    [
      { title: "Philosopher's Path walk", note: "Easy stroll, temples on tap.", durationMin: 90, timeOfDay: "morning" },
      { title: "Ginkaku-ji (Silver Pavilion)", note: "Less crowded than its golden cousin.", durationMin: 75, timeOfDay: "afternoon" },
      { title: "Last dinner: yakitori counter", note: "12 seats, smoke, perfection.", durationMin: 120, timeOfDay: "evening" },
    ],
  ],
};

function genericDays(city: string): StopSeed[][] {
  const base: StopSeed[][] = [
    [
      { title: `Arrive + walk ${city}`, note: "No plans. Just wander the closest neighborhood.", durationMin: 90, timeOfDay: "morning" },
      { title: "First real meal", note: "Wherever locals are queuing.", durationMin: 90, timeOfDay: "afternoon" },
      { title: "Early rooftop drink", note: "Beat the jet-lag with a soft landing.", durationMin: 75, timeOfDay: "evening" },
    ],
    [
      { title: "The one icon, at opening", note: "Skip the line by being inconvenient.", durationMin: 120, timeOfDay: "morning" },
      { title: "Slow lunch + market", note: "Eat with the workers.", durationMin: 120, timeOfDay: "afternoon" },
      { title: "Sunset viewpoint", note: "Dinner around the corner.", durationMin: 90, timeOfDay: "evening" },
    ],
    [
      { title: "Go a bit further", note: "Day trip or under-touristed neighborhood.", durationMin: 240, timeOfDay: "morning" },
      { title: "Linger and people-watch", note: "This is the trip.", durationMin: 120, timeOfDay: "afternoon" },
      { title: "Live music or long dinner", note: "Whichever lasts longer.", durationMin: 150, timeOfDay: "evening" },
    ],
    [
      { title: "Repeat what you loved", note: "Free morning.", durationMin: 90, timeOfDay: "morning" },
      { title: "Last view / last swim", note: "Pack later.", durationMin: 120, timeOfDay: "afternoon" },
      { title: "The dinner you'll talk about", note: "Order one extra thing.", durationMin: 150, timeOfDay: "evening" },
    ],
  ];
  return base;
}

const SUMMARY: Record<string, string> = {
  marrakech: "4 days of riads, rooftops, and getting beautifully lost in the medina.",
  kyoto: "4 days of temples at dawn, kaiseki at dusk, and zero rushing.",
};

const STAY: Record<string, Itinerary["stay"]> = {
  marrakech: [
    { tier: "Budget", name: "Riad Dar Najat", note: "Charming, walkable, kind owners." },
    { tier: "Mid", name: "El Fenn", note: "Marrakech's coolest hotel, basically." },
    { tier: "Splurge", name: "Royal Mansour", note: "Your own riad. Yes, really." },
  ],
  kyoto: [
    { tier: "Budget", name: "Piece Hostel Sanjo", note: "Design hostel, great location." },
    { tier: "Mid", name: "Node Kyoto", note: "Quiet, art-filled, near Nijo Castle." },
    { tier: "Splurge", name: "Tawaraya Ryokan", note: "300+ years old. A pilgrimage." },
  ],
};

const EAT: Record<string, string[]> = {
  marrakech: ["Café Clock — camel burger, don't fight it", "Nomad — rooftop, modern Moroccan", "Mechoui Alley — slow-roasted lamb at lunch"],
  kyoto: ["Nishiki Market — graze your way through", "Issen Yoshoku — Gion's quirky okonomiyaki", "Any kaiseki dinner you can book"],
};

const TIPS: Record<string, string[]> = {
  marrakech: ["Cash is king in the medina.", "Agree on taxi prices first.", "Friday afternoon = quietest souks."],
  kyoto: ["Fushimi Inari at sunrise, not sunset.", "Bus passes beat trains inside Kyoto.", "Reserve dinner before you land."],
};

function rid() {
  return Math.random().toString(36).slice(2, 9);
}

function shapeForStyle(stops: StopSeed[], style: ItineraryStyle): StopSeed[] {
  if (style === "mindful") {
    // 2 slower stops/day, longer durations
    return stops.slice(0, 2).map((s) => ({ ...s, durationMin: Math.round(s.durationMin * 1.4) }));
  }
  if (style === "max") {
    // add a bonus stop
    return [
      ...stops,
      { title: "Bonus: hidden alley walk", note: "Wandr knows a spot. Always one more.", durationMin: 60, timeOfDay: "evening" },
    ];
  }
  return stops;
}

export function getItinerary(
  card: DestinationCard,
  opts: { days?: number; style?: ItineraryStyle } = {}
): Itinerary {
  const style = opts.style ?? "balanced";
  const days = opts.days ?? 4;
  const seed = STOP_BANK[card.id] ?? genericDays(card.city);
  const dayPlans: DayPlan[] = Array.from({ length: days }).map((_, i) => {
    const base = seed[i % seed.length];
    const shaped = shapeForStyle(base, style);
    return {
      day: i + 1,
      title:
        i === 0 ? "Arrive & wander" :
        i === 1 ? "The classics, intentionally" :
        i === 2 ? "Go a little further" : "Yours",
      theme:
        i === 0 ? "All within walking distance of where you'll sleep — gentle on the jet-lag." :
        i === 1 ? "Clustered in the historic core so you're not burning hours in transit." :
        i === 2 ? "One short ride out, then back to base by sundown." :
                  "Looped near your hotel — easy to swap, easy to skip.",
      stops: shaped.map((s) => ({ ...s, id: rid() })),
    };
  });
  return {
    id: card.id,
    city: card.city,
    country: card.country,
    summary: SUMMARY[card.id] ?? `A ${days}-day take on ${card.city} — refine it with Wandr.`,
    durationDays: days,
    style,
    days: dayPlans,
    stay: STAY[card.id] ?? [
      { tier: "Budget", name: "A well-reviewed guesthouse", note: "Central, kind hosts." },
      { tier: "Mid", name: "A boutique hotel locals love", note: "Design-forward, walkable." },
      { tier: "Splurge", name: "The icon", note: "You only do this once." },
    ],
    eat: EAT[card.id] ?? ["The dish this place is famous for", "A spot with no English menu", "Whatever your hotel whispers"],
    tips: TIPS[card.id] ?? ["Walk the first morning, no plans.", "Eat where the line is local.", "Leave one afternoon unplanned."],
    videos: [
      { title: `${card.city} in 4K — a cinematic walk`, channel: "ProWalks", query: `${card.city} walking tour 4k` },
      { title: `What to eat in ${card.city}`, channel: "Mark Wiens", query: `${card.city} street food` },
      { title: `${card.city} — first-timer's guide`, channel: "Kara and Nate", query: `${card.city} travel guide` },
    ],
    reviews: [
      { name: "Anya, 32", stars: 5, text: `Honestly the best week. ${card.city} surprised me — way calmer than I expected.` },
      { name: "Jordan, 41", stars: 4, text: "Wish we'd stayed two more days. The food alone is worth it." },
      { name: "Priya, 28", stars: 5, text: "Solo-female-friendly, easy to navigate. Will be back." },
    ],
    reels: card.reels ?? reels(card.city),
  };
}

/* ------------ Local save/share ------------ */

const SAVE_KEY = "wandr:saved";

export type SavedTrip = {
  id: string;
  city: string;
  country: string;
  savedAt: number;
  itinerary: Itinerary;
  brief: TripBrief;
};

export function saveTrip(it: Itinerary, brief: TripBrief): SavedTrip {
  const id = rid();
  const trip: SavedTrip = { id, city: it.city, country: it.country, savedAt: Date.now(), itinerary: it, brief };
  if (typeof window === "undefined") return trip;
  const all = listSaved();
  all.unshift(trip);
  localStorage.setItem(SAVE_KEY, JSON.stringify(all.slice(0, 20)));
  return trip;
}

export function listSaved(): SavedTrip[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function getSaved(id: string): SavedTrip | undefined {
  return listSaved().find((t) => t.id === id);
}