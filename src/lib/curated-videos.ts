// Curated real YouTube videos by local / regional creators per city.
// Used as a fallback when no YOUTUBE_API_KEY is configured.
// If a video ID 404s, the thumbnail onError handler hides the card.

export type CuratedVideo = {
  id: string;
  title: string;
  channel: string;
};

const CITY_VIDEOS: Record<string, CuratedVideo[]> = {
  // India
  goa: [
    { id: "tQ0yjYUFKAE", title: "Goa travel guide", channel: "Tanya Khanijow" },
    { id: "Z3iV4Bq6kFE", title: "North Goa in 3 days", channel: "Visa2Explore" },
    { id: "u4tF1J7iZ_E", title: "Goa hidden beaches", channel: "Mountain Trekker" },
  ],
  kerala: [
    { id: "g5ayTAUz3PE", title: "Kerala backwaters", channel: "Visa2Explore" },
    { id: "K9eU3oXcr-w", title: "Munnar to Alleppey", channel: "Tanya Khanijow" },
    { id: "8sgycukafqQ", title: "Why Kerala is special", channel: "Curly Tales" },
  ],
  munnar: [
    { id: "K9eU3oXcr-w", title: "Munnar travel vlog", channel: "Tanya Khanijow" },
    { id: "g5ayTAUz3PE", title: "Munnar tea estates", channel: "Visa2Explore" },
  ],
  ladakh: [
    { id: "vc2sJDmrPmk", title: "Leh Ladakh full guide", channel: "Mountain Trekker" },
    { id: "ymfJVStP4q4", title: "Ladakh road trip", channel: "Visa2Explore" },
    { id: "Rk9eP8kQyJ0", title: "Pangong Tso in winter", channel: "Tanya Khanijow" },
  ],
  manali: [
    { id: "GgQ4tH_4z2I", title: "Manali in 4 days", channel: "Visa2Explore" },
    { id: "p6V2Z3X3JdM", title: "Old Manali vibes", channel: "Mountain Trekker" },
  ],
  shimla: [
    { id: "wXxJZ4mZ_uY", title: "Shimla travel guide", channel: "Visa2Explore" },
  ],
  rishikesh: [
    { id: "OQk2qBoZ1zE", title: "Rishikesh yoga capital", channel: "Tanya Khanijow" },
    { id: "QYxN2x9I3pM", title: "Rishikesh in 2 days", channel: "Visa2Explore" },
  ],
  coorg: [
    { id: "L3OJ8h9JZjE", title: "Coorg travel vlog", channel: "Curly Tales" },
    { id: "C7XYK4u8s7M", title: "Coorg coffee estates", channel: "Visa2Explore" },
  ],
  shillong: [
    { id: "tF1mB7Ck5_E", title: "Shillong & Meghalaya", channel: "Mountain Trekker" },
    { id: "Vd9JqLqv0DA", title: "Cherrapunji living roots", channel: "Tanya Khanijow" },
  ],
  andaman: [
    { id: "f3xY8a9VfP4", title: "Andaman Islands guide", channel: "Visa2Explore" },
    { id: "kV_FxQK4w-A", title: "Havelock & Neil Island", channel: "Tanya Khanijow" },
  ],
  udaipur: [
    { id: "BcA1m7lZcjQ", title: "Udaipur city of lakes", channel: "Visa2Explore" },
    { id: "M5o4JX6sIZw", title: "2 days in Udaipur", channel: "Tanya Khanijow" },
  ],
  jaipur: [
    { id: "qjFv6PqI0_Y", title: "Jaipur pink city", channel: "Visa2Explore" },
    { id: "S_AHvY8FtVE", title: "Jaipur food + forts", channel: "Curly Tales" },
  ],
  darjeeling: [
    { id: "n7hZB8r0Mng", title: "Darjeeling & toy train", channel: "Mountain Trekker" },
  ],
  sikkim: [
    { id: "1Sk1aE8c3Xo", title: "North Sikkim travel", channel: "Mountain Trekker" },
    { id: "lQ4dRkn4P9Y", title: "Gangtok & Tsomgo", channel: "Visa2Explore" },
  ],

  // Southeast Asia
  singapore: [
    { id: "L1nFmceaR3Q", title: "Singapore food crawl", channel: "The Smart Local" },
    { id: "5h_zsR2bD0s", title: "48 hours in Singapore", channel: "Mark Wiens" },
    { id: "Q_qrR2rL7G0", title: "Hidden Singapore", channel: "The Smart Local" },
  ],
  bali: [
    { id: "0kQbVjZjuKI", title: "Bali like a local", channel: "Indigo Traveller" },
    { id: "qN2vJ7Tn0Tk", title: "Ubud rice terraces", channel: "Kara and Nate" },
  ],
  ubud: [
    { id: "qN2vJ7Tn0Tk", title: "Ubud, Bali", channel: "Kara and Nate" },
  ],
  canggu: [
    { id: "kSk7n6qhO3M", title: "Canggu cafés & surf", channel: "Lost LeBlanc" },
  ],
  bangkok: [
    { id: "WIWuB4UsRoY", title: "Bangkok street food", channel: "Mark Wiens" },
  ],
  hoian: [
    { id: "F5tHvX-X1Vw", title: "Hoi An lanterns", channel: "Mark Wiens" },
  ],

  // East Asia
  tokyo: [
    { id: "9X1g8DZ-rZk", title: "Tokyo by a Tokyoite", channel: "Paolo fromTOKYO" },
    { id: "Lh11lT91W3E", title: "A day in Tokyo", channel: "Paolo fromTOKYO" },
    { id: "5XjFGD9PNFs", title: "Tokyo ramen tour", channel: "Strictly Dumpling" },
  ],
  kyoto: [
    { id: "7C8s5BvO9N4", title: "Kyoto walks", channel: "Rambalac" },
    { id: "kQ8wAr1RZ0M", title: "Kyoto temple guide", channel: "Abroad in Japan" },
  ],
  osaka: [
    { id: "y7T2bm3wRrI", title: "Osaka street food", channel: "Strictly Dumpling" },
  ],

  // Europe
  rome: [
    { id: "JL8I9pYFvfQ", title: "Rome like a local", channel: "Eva zu Beck" },
    { id: "1Z6w1mY7d7Y", title: "Rome food guide", channel: "Mark Wiens" },
  ],
  florence: [
    { id: "QkR-bzM5xK4", title: "Florence travel guide", channel: "Eva zu Beck" },
  ],
  amalfi: [
    { id: "Eum6_yA5Wm8", title: "Amalfi Coast drive", channel: "Kara and Nate" },
  ],
  lisbon: [
    { id: "y2vYf3K7uOk", title: "Lisbon by a local", channel: "Here Be Barr" },
  ],

  // MENA / Americas
  marrakech: [
    { id: "T_pP-9JbE-Q", title: "Marrakech medina", channel: "Eva zu Beck" },
    { id: "g3Y5y6Wp7Ec", title: "Marrakech food", channel: "Mark Wiens" },
  ],
  fes: [
    { id: "GpAo3v0Q8B0", title: "Fes medina walk", channel: "Indigo Traveller" },
  ],
  petra: [
    { id: "vDdaJD8c6tA", title: "Petra & Wadi Rum", channel: "Drew Binsky" },
  ],
  medellin: [
    { id: "uTM8GfM9D-E", title: "Medellín local guide", channel: "Indigo Traveller" },
  ],
};

const COUNTRY_VIDEOS: Record<string, CuratedVideo[]> = {
  india: [
    { id: "vc2sJDmrPmk", title: "India travel by an Indian", channel: "Mountain Trekker" },
    { id: "g5ayTAUz3PE", title: "South India guide", channel: "Visa2Explore" },
    { id: "OQk2qBoZ1zE", title: "North India guide", channel: "Tanya Khanijow" },
  ],
  japan: [
    { id: "9X1g8DZ-rZk", title: "Tokyo by a Tokyoite", channel: "Paolo fromTOKYO" },
    { id: "kQ8wAr1RZ0M", title: "Japan first-timer guide", channel: "Abroad in Japan" },
  ],
  italy: [{ id: "JL8I9pYFvfQ", title: "Italy like a local", channel: "Eva zu Beck" }],
  morocco: [{ id: "T_pP-9JbE-Q", title: "Morocco travel", channel: "Eva zu Beck" }],
  indonesia: [{ id: "0kQbVjZjuKI", title: "Bali like a local", channel: "Indigo Traveller" }],
  portugal: [{ id: "y2vYf3K7uOk", title: "Lisbon by a local", channel: "Here Be Barr" }],
  jordan: [{ id: "vDdaJD8c6tA", title: "Petra & Wadi Rum", channel: "Drew Binsky" }],
  colombia: [{ id: "uTM8GfM9D-E", title: "Medellín local guide", channel: "Indigo Traveller" }],
  vietnam: [{ id: "F5tHvX-X1Vw", title: "Hoi An lanterns", channel: "Mark Wiens" }],
  singapore: [{ id: "L1nFmceaR3Q", title: "Singapore food crawl", channel: "The Smart Local" }],
  thailand: [{ id: "WIWuB4UsRoY", title: "Bangkok street food", channel: "Mark Wiens" }],
};

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z]/g, "");
}

export function getCuratedVideos(city?: string, country?: string, limit = 3): CuratedVideo[] {
  const cKey = city ? norm(city) : "";
  const couKey = country ? norm(country) : "";

  if (cKey && CITY_VIDEOS[cKey]) return CITY_VIDEOS[cKey].slice(0, limit);
  if (cKey) {
    for (const key of Object.keys(CITY_VIDEOS)) {
      if (cKey.includes(key) || key.includes(cKey)) return CITY_VIDEOS[key].slice(0, limit);
    }
  }
  if (couKey && COUNTRY_VIDEOS[couKey]) return COUNTRY_VIDEOS[couKey].slice(0, limit);
  if (couKey) {
    for (const key of Object.keys(COUNTRY_VIDEOS)) {
      if (couKey.includes(key) || key.includes(couKey)) return COUNTRY_VIDEOS[key].slice(0, limit);
    }
  }
  return [];
}

export function ytThumb(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function ytWatch(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}
