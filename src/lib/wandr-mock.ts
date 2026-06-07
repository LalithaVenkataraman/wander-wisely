export type DestinationCard = {
  id: string;
  country: string;
  city: string;
  tag: string;
  bestMonths: string;
  budget: string;
  flightTime: string;
};

export type DayPlan = {
  day: number;
  title: string;
  morning: string;
  afternoon: string;
  evening: string;
};

export type Itinerary = {
  id: string;
  city: string;
  country: string;
  summary: string;
  durationDays: number;
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

const SETS: Record<string, DestinationCard[]> = {
  morocco: [
    { id: "marrakech", country: "Morocco", city: "Marrakech", tag: "Souks, riads, rooftop sundowns.", bestMonths: "Mar–May · Oct", budget: "$$", flightTime: "7h from NYC" },
    { id: "fes", country: "Morocco", city: "Fes", tag: "Medieval medina, no cars, real deal.", bestMonths: "Apr–Jun", budget: "$$", flightTime: "8h from NYC" },
    { id: "chefchaouen", country: "Morocco", city: "Chefchaouen", tag: "The blue town. Slow it down.", bestMonths: "Mar–May", budget: "$", flightTime: "+3h from Fes" },
    { id: "essaouira", country: "Morocco", city: "Essaouira", tag: "Windy coast, fresh sardines, art.", bestMonths: "Apr–Sep", budget: "$$", flightTime: "+3h from Marrakech" },
  ],
  japan: [
    { id: "kyoto", country: "Japan", city: "Kyoto", tag: "Temples, tea, lacquer-thin mornings.", bestMonths: "Mar–May · Nov", budget: "$$$", flightTime: "13h from NYC" },
    { id: "tokyo", country: "Japan", city: "Tokyo", tag: "Neon, ramen, somehow also calm.", bestMonths: "Mar–May · Oct", budget: "$$$", flightTime: "13h from NYC" },
    { id: "osaka", country: "Japan", city: "Osaka", tag: "Eat first, ask questions never.", bestMonths: "Mar–May", budget: "$$", flightTime: "+2h Shinkansen from Tokyo" },
    { id: "hiroshima", country: "Japan", city: "Hiroshima", tag: "Heavy history, lighter okonomiyaki.", bestMonths: "Mar–May", budget: "$$", flightTime: "+4h Shinkansen from Tokyo" },
  ],
  bali: [
    { id: "ubud", country: "Indonesia", city: "Ubud", tag: "Rice terraces, yoga, real quiet.", bestMonths: "May–Sep", budget: "$", flightTime: "22h from NYC" },
    { id: "canggu", country: "Indonesia", city: "Canggu", tag: "Surf, cafés, laptops on the beach.", bestMonths: "May–Sep", budget: "$$", flightTime: "22h from NYC" },
    { id: "seminyak", country: "Indonesia", city: "Seminyak", tag: "Beach clubs without the chaos.", bestMonths: "May–Sep", budget: "$$", flightTime: "22h from NYC" },
    { id: "uluwatu", country: "Indonesia", city: "Uluwatu", tag: "Cliff temples + the bluest water.", bestMonths: "May–Sep", budget: "$$", flightTime: "22h from NYC" },
  ],
  italy: [
    { id: "rome", country: "Italy", city: "Rome", tag: "Ruins, espresso, controlled chaos.", bestMonths: "Apr–Jun · Sep", budget: "$$", flightTime: "9h from NYC" },
    { id: "florence", country: "Italy", city: "Florence", tag: "Renaissance, but the bistecca is the point.", bestMonths: "Apr–Jun", budget: "$$", flightTime: "10h from NYC" },
    { id: "amalfi", country: "Italy", city: "Amalfi Coast", tag: "Lemons, switchbacks, painfully blue sea.", bestMonths: "May–Jun · Sep", budget: "$$$", flightTime: "10h from NYC" },
    { id: "bologna", country: "Italy", city: "Bologna", tag: "Pasta capital. No further questions.", bestMonths: "Apr–Jun", budget: "$$", flightTime: "10h from NYC" },
  ],
  default: [
    { id: "lisbon", country: "Portugal", city: "Lisbon", tag: "Tiles, trams, custard tarts, repeat.", bestMonths: "Apr–Jun · Sep", budget: "$$", flightTime: "7h from NYC" },
    { id: "petra", country: "Jordan", city: "Petra & Wadi Rum", tag: "Carved cities + Mars-red desert.", bestMonths: "Mar–May · Oct–Nov", budget: "$$", flightTime: "12h from NYC" },
    { id: "medellin", country: "Colombia", city: "Medellin", tag: "Spring weather, café culture, reborn city.", bestMonths: "Dec–Mar", budget: "$", flightTime: "6h from NYC" },
    { id: "hoi-an", country: "Vietnam", city: "Hoi An", tag: "Lanterns, tailors, life on a slow river.", bestMonths: "Feb–Apr", budget: "$", flightTime: "20h from NYC" },
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

const baseDays = (city: string): DayPlan[] => [
  { day: 1, title: "Arrive & wander", morning: "Land, drop bags, walk the closest neighborhood with no plan.", afternoon: `First proper meal in ${city} — somewhere locals queue.`, evening: "Early rooftop / riverside drink. Sleep before jet-lag wins." },
  { day: 2, title: "The classics, intentionally", morning: "The one icon you'd regret missing — but at opening time.", afternoon: "Slow lunch, then a museum or craft workshop.", evening: "Sunset viewpoint. Dinner around the corner from it." },
  { day: 3, title: "Go a little further", morning: "Day trip or under-touristed neighborhood.", afternoon: "Linger. Coffee. People-watch. This is the trip.", evening: "Live music or a long, leisurely dinner." },
  { day: 4, title: "Yours", morning: "Free morning — repeat anything you loved.", afternoon: "Last shopping / last swim / last view.", evening: "The dinner you'll talk about back home." },
];

const ITIN: Record<string, Partial<Itinerary>> = {
  marrakech: { summary: "4 days of riads, rooftops, and getting beautifully lost in the medina.", days: baseDays("Marrakech"), eat: ["Café Clock — camel burger, don't fight it", "Nomad — rooftop, modern Moroccan", "Mechoui Alley — slow-roasted lamb at lunch"], stay: [{ tier: "Budget", name: "Riad Dar Najat", note: "Charming, walkable, kind owners." }, { tier: "Mid", name: "El Fenn", note: "Marrakech's coolest hotel, basically." }, { tier: "Splurge", name: "Royal Mansour", note: "Your own riad. Yes, really." }], tips: ["Cash is king in the medina.", "Agree on taxi prices before getting in.", "Friday afternoon = quietest souks."] },
  kyoto: { summary: "5 days of temples at dawn, kaiseki at dusk, and zero rushing.", days: baseDays("Kyoto"), eat: ["Nishiki Market — graze your way through", "Issen Yoshoku — Gion's quirky okonomiyaki spot", "Any kaiseki dinner you can book"], stay: [{ tier: "Budget", name: "Piece Hostel Sanjo", note: "Design hostel, great location." }, { tier: "Mid", name: "Node Kyoto", note: "Quiet, art-filled, near Nijo Castle." }, { tier: "Splurge", name: "Tawaraya Ryokan", note: "300+ years old. A pilgrimage." }], tips: ["Fushimi Inari at sunrise, not sunset.", "Bus passes beat trains inside Kyoto.", "Reserve dinner before you land."] },
  default: { summary: "A first taste — refine it together with Wandr.", days: baseDays("there"), eat: ["The dish this place is famous for", "A neighborhood spot with no English menu", "Whatever your hotel concierge whispers"], stay: [{ tier: "Budget", name: "A well-reviewed guesthouse", note: "Central, kind hosts." }, { tier: "Mid", name: "A boutique hotel locals love", note: "Design-forward, walkable." }, { tier: "Splurge", name: "The icon", note: "You only do this once." }], tips: ["Walk the first morning, no plans.", "Eat where the line is local.", "Leave one afternoon completely unplanned."] },
};

export function getItinerary(card: DestinationCard, days = 4): Itinerary {
  const base = ITIN[card.id] ?? ITIN.default;
  return {
    id: card.id,
    city: card.city,
    country: card.country,
    summary: base.summary!,
    durationDays: days,
    days: base.days!,
    stay: base.stay!,
    eat: base.eat!,
    tips: base.tips!,
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
    reels: [
      { title: `48 hours in ${card.city}`, query: `${card.city} 48 hours` },
      { title: `${card.city} aesthetic`, query: `${card.city} aesthetic reel` },
      { title: `Hidden ${card.city}`, query: `hidden ${card.city}` },
    ],
  };
}