// Instagram-style "postcards" — real photos by keyword, no API key needed.
// Uses loremflickr which serves real Flickr photos by tag.
// `lock` makes the same URL return the same photo every time.

const CITY_TAGS: Record<string, string[]> = {
  goa: ["goa", "beach", "palmtrees", "sunset"],
  kerala: ["kerala", "backwaters", "houseboat", "palms"],
  munnar: ["munnar", "teaestate", "hills", "mist"],
  ladakh: ["ladakh", "himalaya", "monastery", "lake"],
  manali: ["manali", "himalaya", "snow", "pine"],
  shimla: ["shimla", "hillstation", "colonial"],
  rishikesh: ["rishikesh", "ganges", "yoga", "bridge"],
  coorg: ["coorg", "coffee", "estate", "hills"],
  shillong: ["shillong", "meghalaya", "waterfall", "forest"],
  andaman: ["andaman", "havelock", "beach", "snorkel"],
  udaipur: ["udaipur", "palace", "lake", "rajasthan"],
  jaipur: ["jaipur", "fort", "pinkcity", "rajasthan"],
  darjeeling: ["darjeeling", "tea", "himalaya"],
  sikkim: ["sikkim", "mountains", "monastery"],
  singapore: ["singapore", "marinabay", "gardens", "skyline"],
  bali: ["bali", "rice", "temple", "beach"],
  ubud: ["ubud", "rice", "temple", "jungle"],
  canggu: ["canggu", "surf", "cafe"],
  bangkok: ["bangkok", "templethailand", "streetfood"],
  hoian: ["hoian", "lanterns", "river"],
  tokyo: ["tokyo", "shibuya", "neon", "ramen"],
  kyoto: ["kyoto", "torii", "geisha", "temple"],
  osaka: ["osaka", "dotonbori", "streetfood"],
  rome: ["rome", "colosseum", "piazza"],
  florence: ["florence", "duomo", "tuscany"],
  amalfi: ["amalficoast", "positano", "lemons"],
  lisbon: ["lisbon", "tram", "tiles", "alfama"],
  marrakech: ["marrakech", "medina", "souk", "riad"],
  fes: ["fes", "medina", "morocco"],
  petra: ["petra", "wadirum", "desert"],
  medellin: ["medellin", "colombia", "comuna13"],
};

const COUNTRY_TAGS: Record<string, string[]> = {
  india: ["india", "travel", "temple", "street"],
  japan: ["japan", "torii", "streetfood"],
  italy: ["italy", "piazza", "duomo"],
  morocco: ["morocco", "medina", "souk"],
  indonesia: ["bali", "temple", "rice"],
  portugal: ["portugal", "tiles", "tram"],
  jordan: ["jordan", "desert"],
  colombia: ["colombia", "street", "mountains"],
  vietnam: ["vietnam", "lanterns", "rice"],
  singapore: ["singapore", "skyline"],
  thailand: ["thailand", "temple", "beach"],
};

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z]/g, "");
}

function pickTags(city?: string, country?: string): string[] {
  const cKey = city ? norm(city) : "";
  const couKey = country ? norm(country) : "";
  if (cKey && CITY_TAGS[cKey]) return CITY_TAGS[cKey];
  if (cKey) {
    for (const key of Object.keys(CITY_TAGS)) {
      if (cKey.includes(key) || key.includes(cKey)) return CITY_TAGS[key];
    }
  }
  if (couKey && COUNTRY_TAGS[couKey]) return COUNTRY_TAGS[couKey];
  if (couKey) {
    for (const key of Object.keys(COUNTRY_TAGS)) {
      if (couKey.includes(key) || key.includes(couKey)) return COUNTRY_TAGS[key];
    }
  }
  return city ? [norm(city) || "travel"] : ["travel"];
}

export function getPostcards(city?: string, country?: string, n = 6): string[] {
  const tags = pickTags(city, country);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const tag = tags[i % tags.length];
    // lock=<n> returns a deterministic but distinct photo per seed
    out.push(`https://loremflickr.com/640/800/${encodeURIComponent(tag)}?lock=${i + 1}`);
  }
  return out;
}
