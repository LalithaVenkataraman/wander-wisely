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
});

type WandrResponse = {
  reply: string;
  label?: string;
  cards?: DestinationCard[];
  itinerary?: Itinerary;
  brief?: TripBrief;
  intent?: "shortlist" | "itinerary" | "chat";
};

const SYSTEM = `You are Wandr — a witty, warm travel concierge. Personality: a clever friend who's traveled everywhere, drops dry one-liners, never preachy, never corporate. Keep replies short (1–3 sentences). No emojis. Avoid generic chamber-of-commerce prose.

You ALWAYS reply with a single JSON object — no prose, no markdown fences. Output strictly matches the schema for the requested mode.

Modes:
- "shortlist": Recommend exactly 4 destinations matching the prompt + brief. If the prompt names a region, pick 4 cities/areas within or adjacent to it (2-stop nearby hops are fine). Otherwise pick 4 diverse picks worldwide.
  Output: {"reply": "...", "label": "Region or theme name", "cards": [ {"id": "kebab", "country", "city", "tag": "one witty line", "bestMonths": "e.g. Mar–May", "budget": "$|$$|$$$", "flightTime": "e.g. 8h from NYC", "caveats": ["steep"|"lots-of-walking"|"hot"|"long-transfers"], "reels": [{"title", "query"}, ...3] } x4 ] }

- "itinerary": Build a complete day-by-day itinerary for currentCity. Honor brief (pace -> style, who-with -> avoid conflicts, budget). 4 days unless 'days' provided. Style 'mindful' = 2 slower stops/day; 'balanced' = 3 stops/day; 'max' = 4 stops/day.
  Output: {"reply": "...", "itinerary": { "id": "kebab-of-city", "city", "country", "summary": "one witty line", "durationDays": N, "style": "mindful|balanced|max", "days": [ {"day": 1, "title", "stops": [ {"id": "random", "title", "note": "witty specific tip", "durationMin": 60-240, "timeOfDay": "morning|afternoon|evening"} ]} ], "stay": [ {"tier": "Budget|Mid|Splurge", "name", "note"} x3 ], "eat": [string x3], "tips": [string x3], "videos": [{"title", "channel", "query"} x3], "reviews": [{"name", "stars": 1-5, "text"} x3], "reels": [{"title", "query"} x3] }}

- "reply": Free-form chat reply. Decide if the user wants to refine shortlist, refine itinerary, or just chat.
  Output: {"reply": "...", "intent": "shortlist"|"itinerary"|"chat", "brief": {optional updated fields}}
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