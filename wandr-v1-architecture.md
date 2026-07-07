# Wandr — v1 AI Architecture

_Last updated: July 4, 2026_
_Status: v1 build spec — implements the v1-scoped versions of the Voice & Guardrails spec, Eval Framework, and State Machine spec_

---

## 1. Purpose

The other four docs describe product intent and eventual sophistication. This one is different in kind: it's meant to be handed to Cursor as the actual thing to build. Everything here is scoped to the v1 cuts already agreed — simple slots, one open-question flag, a hardcoded system prompt, the existing ratings table. No layered prompt architecture, no confidence tagging, no formal eval pipeline.

---

## 2. Request/response flow

One round trip per user message. No persistent connection, no background jobs in v1.

1. **Chat UI** sends the user's message + `trip_id` (or none, for a new session) to the Planning API.
2. **Planning API** loads the current trip brief (slot state) from Supabase if `trip_id` exists, otherwise starts a fresh brief.
3. **Planning API** assembles the prompt: system prompt (voice + guardrails, hardcoded) + current slot state + conversation history + the new user message.
4. **Planning API** calls the **Claude API** with that assembled prompt, requesting structured JSON output (see §4).
5. **Planning API** parses the response, updates slot state, and writes the trip brief + any generated output (shortlist/itinerary) to **Supabase**.
6. **Planning API** returns the chat reply + current UI state (which screen/state to render) to the **Chat UI**.
7. **Chat UI** renders accordingly (chat bubble, shortlist postcards, itinerary, etc. — per the existing v2 UX spec's component set).

This is the same request/response shape already implicit in the Lovable prototype — this doc formalizes it, not replaces it.

---

## 3. File/module structure (suggested, for Cursor)

```
/lib
  /prompts
    system-prompt.md         ← the hardcoded voice + guardrails prompt (Voice spec §2–5, v1 cut)
    task-intake.md            ← task instructions for the chat/intake step
    task-shortlist.md         ← task instructions for shortlist generation
    task-itinerary.md         ← task instructions for itinerary generation
  /trip-brief
    schema.ts                 ← the simple slot object (State Machine spec §3.2, v1 cut — no status/source/confidence fields, just value + filled boolean)
    extract.ts                 ← calls Claude, parses structured output into slot updates
  /claude
    client.ts                 ← thin wrapper around the Claude API call
/api
  /plan
    route.ts                  ← the Planning API endpoint described in §2
/components  (existing — from the v2 UX spec's component inventory)
```

The point of splitting `system-prompt.md` from the per-task files: the voice/guardrails text doesn't change per screen, so it shouldn't be copy-pasted into three prompt files — even in v1, one shared file is worth the discipline. This is the one piece of "layering" worth keeping from the deferred Layer 1–4 architecture, because it costs nothing and prevents drift across screens.

---

## 4. Output contract (structured JSON)

Every Claude API call in this system requests the same shape back, regardless of which task prompt is active:

```json
{
  "reply_text": "Couple, 7 days — got it. What's the vibe: relaxed, food-first, adventure?",
  "slot_updates": {
    "who": "couple",
    "duration": 7
  },
  "pending_question": "vibe",
  "next_ui_state": "intake",
  "output": null
}
```

- `reply_text` — the chat bubble content (Voice spec rules apply directly here).
- `slot_updates` — only the slots that changed this turn, not the full brief (the API layer merges this into the stored trip brief).
- `pending_question` — the v1 single-flag version from the State Machine spec's scope cut. `null` when there's no open question.
- `next_ui_state` — one of `intake` / `shortlist` / `itinerary` / `refinement`, telling the Chat UI which screen/state to render (State Machine spec §2).
- `output` — populated only when `next_ui_state` is `shortlist` or `itinerary`; holds the actual postcards/day-plan data, `null` otherwise.

Validating this shape on every response (even just a basic schema check, not a full eval pipeline) is the cheapest possible version of Eval Framework category 2 — worth building from day one since it's a few lines of code, not a project.

---

## 5. Data model additions

The existing Supabase tables (`wandr_trips`, `wandr_trip_ratings`, `wandr_outputs`, `wandr_ratings`) mostly already fit. One addition:

```sql
-- extends wandr_trips
alter table wandr_trips add column trip_brief jsonb;
-- shape: { when, who, budget_pace, vibe, duration, destination, pending_question }
-- (the v1-simple slot shape from State Machine spec §3.2, not the full slot object from §3.1)
```

Storing the brief as one `jsonb` column rather than five separate columns keeps this from becoming a migration every time a slot is added or changed shape — reasonable even at v1 scale, since the brief is read/written as a whole object every turn anyway (§2, steps 2 and 5), never queried slot-by-slot.

---

## 6. Prompt versioning (the one piece of "eval infrastructure" worth keeping)

Even though the full eval pipeline is deferred, tag every Claude API call with which prompt files (and which version/commit) produced it:

```json
{
  "prompt_version": "system-prompt@2026-07-04, task-intake@2026-07-04"
}
```

Store this alongside the output in `wandr_outputs`. This costs almost nothing to add now and is the one thing that's expensive to reconstruct retroactively — if a voice regression shows up in the ratings data three months from now, you want to know which prompt version produced the bad output, and you can't back that out of a system that didn't log it.

---

## 7. What Cursor needs to build (checklist)

- [ ] `lib/prompts/system-prompt.md` — voice pillars + guardrails, v1 cut, as static text
- [ ] `lib/prompts/task-*.md` — three task prompts (intake, shortlist, itinerary)
- [ ] `lib/trip-brief/schema.ts` — the simple slot type
- [ ] `lib/claude/client.ts` — API wrapper requesting the §4 JSON shape
- [ ] `api/plan/route.ts` — the request/response flow in §2
- [ ] Supabase migration — `trip_brief jsonb` column on `wandr_trips`
- [ ] Basic response-shape validation (cheap category-2 eval, §4)
- [ ] Prompt version string attached to every `wandr_outputs` row (§6)

Everything else — the four-state pending-question enum, confidence tagging, Tier 1/2 eval pipelines, multi-city flagging as a distinct field — stays in the other specs as the target to extend toward, not something Cursor needs to scaffold now.

---

## 8. Open questions / next steps

- Where does the Planning API actually run — a Supabase Edge Function (keeping everything in one platform, matching the existing Lovable/Supabase setup) or a separate Next.js API route? Worth deciding based on where the rest of the app ends up being hosted post-Lovable.
- Conversation history: full transcript passed every turn, or just the trip brief + last N turns? Full transcript is simpler to build correctly (matches §2 as written) but costs more tokens per call — worth revisiting once real conversations show how long they typically run.
