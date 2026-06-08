import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import type { DestinationCard, Itinerary, TripBrief } from "./wandr-mock";

const MessageSchema = z.object({
  who: z.enum(["you", "wandr"]),
  text: z.string(),
});

const BriefSchema = z
  .object({
    when: z.string().optional(),
    who: z.string().optional(),
    budget: z.string().optional(),
    pace: z.string().optional(),
  })
  .partial();

const Input = z.object({
  mode: z.enum(["shortlist", "itinerary", "reply"]),
  prompt: z.string().optional(),
  brief: BriefSchema,
  history: z.array(MessageSchema).default([]),
  refinement: z.string().optional(),
  currentCity: z.string().optional(),
  currentCountry: z.string().optional(),
  currentItinerary: z.any().optional(),
  days: z.number().int().min(2).max(10).optional(),
  style: z.enum(["mindful", "balanced", "max"]).optional(),
  paneShown: z.boolean().optional(),
});

type WandrResponse = {
  reply: string;
  label?: string;
  cards?: DestinationCard[];
  itinerary?: Itinerary;
  brief?: TripBrief;
  intent?: "shortlist" | "itinerary" | "chat";
  destination?: { city: string; country: string };
  quickReplies?: string[];
};

const SYSTEM = `You are Wandr — a witty, warm travel concierge. Personality: a clever friend who's traveled everywhere, drops dry one-liners, never preachy, never corporate. Keep replies short (1–3 sentences). No emojis. Avoid generic chamber-of-commerce prose.

You ALWAYS reply with a single JSON object — no prose, no markdown fences. Output strictly matches the schema for the requested mode.

Modes:
- "shortlist": Recommend exactly 4 destinations matching the prompt + brief. If the prompt names a region, pick 4 cities/areas within or adjacent to it (2-stop nearby hops are fine). Otherwise pick 4 diverse picks worldwide.
  Output: {"reply": "...", "label": "Region or theme name", "cards": [ {"id": "kebab", "country", "city", "tag": "one witty line", "bestMonths": "e.g. Mar–May", "budget": "$|$$|$$$", "flightTime": "e.g. 8h from NYC", "caveats": ["steep"|"lots-of-walking"|"hot"|"long-transfers"], "reels": [{"title", "query"}, ...3] } x4 ] }

- "itinerary": Build a complete day-by-day itinerary for currentCity. Honor brief (pace -> style, who-with -> avoid conflicts, budget). 4 days unless 'days' provided. Style 'mindful' = 2 slower stops/day; 'balanced' = 3 stops/day; 'max' = 4 stops/day. CRITICAL: each day's stops must be geographically and thematically COHERENT (same neighborhood or a logical route) so they aren't randomly scattered across the city. Every day MUST include a "theme" — one short sentence explaining WHY these stops belong together (e.g. "All within the old medina walls — walk between everything." or "A south-coast loop: one drive out, beach lunch, sunset back in town.").
  Output: {"reply": "...", "itinerary": { "id": "kebab-of-city", "city", "country", "summary": "one witty line", "durationDays": N, "style": "mindful|balanced|max", "days": [ {"day": 1, "title", "theme": "one-line reason these stops are grouped", "stops": [ {"id": "random", "title", "note": "witty specific tip", "durationMin": 60-240, "timeOfDay": "morning|afternoon|evening"} ]} ], "stay": [ {"tier": "Budget|Mid|Splurge", "name", "note"} x3 ], "eat": [string x3], "tips": [string x3], "videos": [{"title", "channel", "query"} x3], "reviews": [{"name", "stars": 1-5, "text"} x3], "reels": [{"title", "query"} x3] }}

- "reply": Conversational turn. ALWAYS extract any brief fields you can infer from what the user just said (when, who, budget, pace) and return them in "brief". Then decide intent:
    * If the user names a specific city/region they want to plan (e.g. "let's do Kyoto", "Marrakech please", "I want Lisbon"), set intent="itinerary" and "destination": {"city": "...", "country": "..."}. Lock it in warmly.
    * If essential info is still missing (you need at least: when AND who-with; budget and pace are nice-to-have) AND no shortlist has been shown yet (paneShown=false), set intent="chat" and ask ONE short, warm clarifying question for the most important missing field. Do not list options — just ask like a friend. No shortlist yet.
    * If the brief is sufficient (have when AND who-with) OR the user explicitly asks to see options ("show me", "give me ideas") AND no shortlist shown yet, set intent="shortlist".
    * If a shortlist is already shown and the user is refining ("cheaper", "less hot", "closer"), set intent="shortlist".
    * If an itinerary is already shown and the user is refining it, set intent="itinerary" (no destination needed).
    * Otherwise intent="chat".
  ALWAYS include "quickReplies": an array of 3–5 ultra-short tap-to-answer options (each 1–4 words) that directly answer the question you just asked. Examples: for "when?" → ["Next month","In 3 months","This summer","Flexible"]; for "who with?" → ["Solo","With partner","With kids","With older parents"]; for "budget?" → ["$ shoestring","$$ comfortable","$$$ treat","Open"]; for "pace?" → ["Mindful","Balanced","Pack it in"]. For refinements use contextual ones like ["Cheaper","Less hot","Closer","More chill"]. Omit only if no sensible quick answers exist.
  Output: {"reply": "...", "intent": "shortlist"|"itinerary"|"chat", "brief": {optional updated fields}, "destination": {optional}, "quickReplies": ["..."]}
`;

function stripFences(s: string): string {
  return s.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

export const wandrAct = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<WandrResponse> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const ctx: string[] = [`MODE: ${data.mode}`, `BRIEF: ${JSON.stringify(data.brief)}`];
    if (data.prompt) ctx.push(`PROMPT: ${data.prompt}`);
    if (data.refinement) ctx.push(`USER_REFINEMENT: ${data.refinement}`);
    if (typeof data.paneShown === "boolean") ctx.push(`PANE_SHOWN: ${data.paneShown}`);
    if (data.currentCity) ctx.push(`CITY: ${data.currentCity}${data.currentCountry ? ", " + data.currentCountry : ""}`);
    if (data.days) ctx.push(`DAYS: ${data.days}`);
    if (data.style) ctx.push(`STYLE: ${data.style}`);
    if (data.currentItinerary && data.mode === "itinerary") {
      ctx.push(`CURRENT_ITINERARY: ${JSON.stringify(data.currentItinerary).slice(0, 4000)}`);
    }
    if (data.history.length) {
      const tail = data.history.slice(-10).map((m) => `${m.who}: ${m.text}`).join("\n");
      ctx.push(`RECENT_CHAT:\n${tail}`);
    }

    const { text } = await generateText({
      model,
      system: SYSTEM,
      prompt: ctx.join("\n\n") + "\n\nReturn JSON now.",
    });

    let parsed: WandrResponse;
    try {
      parsed = JSON.parse(stripFences(text));
    } catch {
      // Try to find a JSON object in the text
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("LLM did not return JSON: " + text.slice(0, 200));
      parsed = JSON.parse(m[0]);
    }
    return parsed;
  });