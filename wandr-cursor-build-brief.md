# Wandr — Cursor Build Brief

_Last updated: July 4, 2026_
_Status: v1 — hand this + the five other docs to Cursor as the actual build instructions_

---

## 0. What you're building

The v1 system from the Architecture doc: one API route that takes a user message, figures out what Wandr should say and do next, and returns it. Everything below is either (a) how to turn the specs into the actual files, or (b) exactly what that one route does on every request.

---

## 1. Read order — which spec feeds which file

Don't paste the specs into prompts. Read them, then write a **distilled** version into the file listed. This mapping is the whole point of this section:

| File to create | Distill from | What to keep, what to cut |
|---|---|---|
| `lib/prompts/system-prompt.md` | Voice & Guardrails spec §2–5 | Keep: the two anchor examples, the do/don't table's core rules, the no-fabrication rule. Cut: all the "why this matters" commentary — that's for humans, not Claude. |
| `lib/prompts/task-intake.md` | Voice & Guardrails spec §4.1–4.3 + State Machine spec §3.2 | Keep: the 5 slots and their names, the "one question, correct next slot" rule, the wait-for-an-answer rule. Cut: the pending-question status enum (v1 uses a single flag, not four states). |
| `lib/prompts/task-shortlist.md` | UX spec §5 (journeys), §8.2 (states) | Instructions for generating destination candidates from a filled brief. |
| `lib/prompts/task-itinerary.md` | UX spec §5.3 (multi-city), §8.3 (states) | Instructions for day-grouped itinerary generation, including the multi-city joined-itinerary case. |
| `lib/trip-brief/schema.ts` | State Machine spec §3.2 (v1 cut only) | The 5 slots as plain values + one `pending_question: string | null` field. Not the full slot object from §3.1. |
| Response validation logic | Eval Framework §2.2 (v1 cut) + Architecture doc §4 | A schema check, not an LLM-judge — does the JSON have the required fields, right types. |

---

## 2. The runtime algorithm

This is what `api/plan/route.ts` does, in order, on every single request. Treat this as close to literal pseudocode:

```
function handlePlanningRequest(request):

  1. trip_id = request.trip_id, or create a new one if absent
  2. brief   = trip_id exists ? load trip_brief from Supabase : empty brief
  3. history = load last ~10 turns for this trip_id (full history if the conversation is short)

  4. ui_state = determine_state(brief)
       — "intake"     if any of the 5 required slots are unfilled
       — "shortlist"  if all 5 required slots are filled and destination is empty
       — "itinerary"  if destination is filled (via shortlist pick OR direct shortcut)
       — note: "refinement" (drag/edit) mostly happens client-side and doesn't
         call this route at all — see §3

  5. task_prompt = select task-*.md file based on ui_state

  6. full_prompt = system-prompt.md + task_prompt + serialize(brief) + history + request.message

  7. response = call Claude API, requesting the structured JSON shape (Architecture doc §4)

  8. valid = validate_response_shape(response)
       if NOT valid:
         retry once with the same prompt
         if still not valid: return the UX spec §11 fallback —
           reply_text = "That didn't land — retry?", next_ui_state = unchanged

  9. merged_brief = merge slot_updates from response into brief
       (only overwrite the specific slots response.slot_updates includes)

  10. brief.pending_question = response.pending_question
       (v1: just trust the latest value — no cross-check against the old one yet,
        see §4 for why)

  11. persist merged_brief, any generated output (shortlist/itinerary), and the
      prompt_version string to Supabase (wandr_trips, wandr_outputs)

  12. return { reply_text, next_ui_state, output } to the Chat UI
```

---

## 3. What does and doesn't hit this route

Not every user interaction calls the Planning API — worth being explicit so Cursor doesn't route everything through Claude unnecessarily:

- **Calls the API:** typing a message, tapping a quick-reply chip, tapping "Plan this," confirming the duration gate.
- **Doesn't call the API:** dragging a stop between days (client-side reorder + commute-pill recalculation, per UX spec §8.3), opening the stop detail modal, tapping a rating thumb (writes directly to `wandr_ratings`, no Claude involved).

If a drag-and-drop edit later needs Wandr to actually regenerate something (not just reorder), that's a deliberate future exception, not the default path.

---

## 4. Error handling and fallback behavior (v1-honest version)

- **Malformed/invalid JSON from Claude:** retry once, then show the existing UX spec §11 error bubble. Don't invent new error copy — reuse what's already spec'd.
- **`pending_question` inconsistency** (e.g., Claude's response seems to drop a question that was open): in v1, just trust the latest response and log it (a simple log line, not a blocking check). This is the same category of thing flagged as an open question in the State Machine spec §8 — don't build validation logic for it now, just make sure it's visible in logs so a pattern can be noticed later.
- **Claude call times out or errors entirely:** same §11 fallback bubble, no silent hang.
- **Supabase write fails after a successful Claude call:** don't lose the response — show it to the user optimistically, retry the write in the background, surface a toast only if the retry also fails (matches UX spec §11's existing optimistic-save pattern for ratings).

---

## 5. Manual test set (run before every prompt change ships)

This is the v1 stand-in for the golden test set (Eval Framework §2.2, deferred). 10–15 prompts covering:

1. Happy path, one slot per turn (Maya's journey, State Machine spec §7)
2. Direct-destination shortcut ("5 days Kyoto in April")
3. Multi-city prompt ("Tokyo and Kyoto, 8 days, food-first")
4. Vague/non-answer to a pending question ("we're not sure about dates yet") — confirms Wandr re-anchors instead of moving on
5. A request for a fact Wandr can't verify (e.g., "what's the visa requirement for X") — confirms it hedges instead of fabricating
6. A family trip requiring child ages, not just a category
7. Two questions asked in the same turn by mistake (deliberately malformed test) — confirms this would be caught if it happened
8. A forced malformed-JSON response (mock it) — confirms the retry-once-then-fallback path actually fires

Run this set by hand against any change to a prompt file. It's not automated in v1 — that's fine, it's cheap enough to do manually at this scale.
