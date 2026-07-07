# Wandr — Eval Framework

_Last updated: July 2, 2026_
_Status: v1 draft — companion to the Product Charter and the Voice & Guardrails spec_

---

## 1. Purpose

The Voice & Guardrails spec's Section 7 rubric only covers whether Wandr *sounds* right. That's necessary but nowhere near sufficient — a response can be perfectly on-voice and still be functionally broken (wrong itinerary logic), structurally broken (violates the UX state machine), inaccessible, or silently failing in a way no one notices until a user hits it.

This doc defines eval as a **product-wide discipline**, not a conversational one — every layer of the v2 UX spec (screens, states, errors, accessibility) gets a corresponding eval category, the same way Goodcall's eval work covers routing correctness *and* call-quality sentiment, not just one or the other.

This is also the concrete mechanism behind Charter Principle 5 (continuous improvement loop) and Principle 2 (autonomous by design) — you can't run with no human employees in the loop unless the system can tell *itself* when something's wrong.

---

## 2. Eval categories

Six categories, each with a different failure mode and a different measurement method. None of these substitute for another — a product can pass five and fail one.

| # | Category | What it catches | Primary method |
|---|---|---|---|
| 1 | Voice & conversational guardrails | Off-tone, stacked/abandoned questions, fabricated facts | LLM-as-judge, spec: Voice & Guardrails doc §7 |
| 2 | Task & schema correctness | Malformed output, wrong slot extraction, itinerary logic errors | Automated / schema validation |
| 3 | UX state fidelity | Wrong state rendered (e.g., loaded state shown mid-fetch), broken empty/error/loading states | Automated + scripted UI checks |
| 4 | Accessibility | Missing aria-live, keyboard traps, color-only signaling | Automated (axe-core class tools) + manual audit |
| 5 | Reliability & autonomy | Unhandled failures, silent data loss, retry storms, missing escalation | Automated monitoring / synthetic failure injection |
| 6 | Outcome quality | Did the user actually get a usable, well-fit trip plan | Human rating (existing `wandr_ratings`) + LLM-as-judge on outcomes |

### 2.1 Voice & conversational guardrails
Already fully specified in the Voice & Guardrails doc (§7): voice match, question sequence, pending-question handling, known/unknown/uncertain honesty, response format. No changes here — this eval framework treats that rubric as category 1's implementation.

### 2.2 Task & schema correctness
Does the system do what it's supposed to do, independent of tone. This is the category most amenable to pure automation because it's checkable against a schema or a ground truth, not a judgment call.

**What's checked:**
- Output JSON conforms to the Layer 4 schema (Voice spec §6.1) — every response, not sampled.
- Slot extraction accuracy — given a known test input ("7 days, couple, food-first, Tokyo"), are `duration`, `who`, `vibe`, `destination` all correctly populated?
- Duration-gate logic fires correctly (proposes N days, honors "shorter/longer" chip responses).
- Multi-city detection and joined-itinerary logic (per the Priya journey in the UX spec) triggers correctly on multi-destination prompts.
- Direct-destination shortcut correctly skips shortlist when a specific place + date is named.
- Commute-pill recalculation is correct after a drag-and-drop day change.

**Method:** golden test set of representative prompts (the same idea as the Kitt phonetic-confusion / edge-case test suite) run against every prompt version before release. Fully automated — pass/fail against expected schema and expected slot values, no human or LLM judgment needed for most of these.

### 2.3 UX state fidelity
The v2 spec defines an explicit state machine per screen (§8: idle / composing / thinking / live-refresh / loading / loaded / empty / dragging / modal-open, etc.) and explicit error states (§11). This category checks the *actual* rendered state matches the *spec'd* state for a given condition — not a voice or content question at all.

**What's checked (sample, not exhaustive — full list should mirror UX spec §8/§9/§11):**
- Shortlist zero-match condition renders the spec'd empty state, not a blank screen or a stale skeleton.
- AI-call failure renders the "That didn't land — retry?" bubble, not a silent hang.
- Malformed LLM JSON triggers the silent-retry-once-then-error pattern (§11), not an unhandled crash.
- Optimistic rating updates correctly revert on save failure.
- Dashboard row expand/collapse and per-item rating state persist correctly across the interaction.

**Method:** scripted UI test suite (can reuse standard frontend E2E tooling) run against real network/failure conditions, not just happy path. Every error/empty/loading state in UX spec §8, §9, §11 should have at least one corresponding test.

### 2.4 Accessibility
The UX spec's own §13 "Gaps to address" list is effectively an existing eval backlog — worth treating literally as such rather than a separate to-do list.

**What's checked:**
- Automated: axe-core (or equivalent) pass on every screen, checking contrast, aria-labels, focus order.
- Manual: keyboard-only pass through the full happy path (currently known-broken: PolaroidStack has no keyboard equivalent — this should be a tracked FAIL until fixed, not silently accepted).
- Screen-reader spot check on the chat typing indicator (`aria-live` gap, currently known).

**Method:** automated tooling in CI for the mechanical checks; scheduled manual audits for anything requiring human judgment (screen reader flow, keyboard-only usability). This category has the most currently-known failures of any category — it should start the eval program already "red" rather than assumed green, since the UX spec documents the gaps explicitly.

### 2.5 Reliability & autonomy
This is the category that makes Principle 2 (autonomous by design) real rather than aspirational. It's not about whether a single response is good — it's about whether the *system* notices and handles things going wrong without a human watching in real time.

**What's checked:**
- Every failure mode in UX spec §11 has a defined automatic recovery path (retry, fallback, user-facing error) — none should silently swallow an error.
- No unbounded retry loops (a known-gap: "Live-preview toast is non-dismissible" — worth checking this doesn't mask a stuck retry state).
- Rate/cost anomaly detection — a spike in LLM calls per session or malformed-output rate should alert, not just get silently retried forever.
- Data integrity: the Zod `.nullish()` bug (UX spec §11, "past bug") is exactly the class of issue this category exists to catch *before* it reaches production, via schema/contract tests between the LLM output and the DB layer.

**Method:** synthetic failure injection (deliberately feed malformed LLM output, simulate network failures, kill mid-write) run in a staging environment, plus production monitoring/alerting on error rates and retry counts. This is the category closest to traditional SRE practice, applied to an AI-native pipeline instead of a conventional backend.

### 2.6 Outcome quality
The other five categories check "did it work correctly." This one checks "was it actually good" — the fuzzier, most important question, and the one the existing `wandr_ratings` / `wandr_trip_ratings` tables already partially capture.

**What's checked:**
- Did the final itinerary actually match the stated constraints (budget, pace, vibe) — an LLM-as-judge check comparing the trip brief to the delivered itinerary, not just a schema check.
- User-facing thumbs-down tags (already collected) — `too touristy`, `wrong pace`, etc. — aggregated as a leading indicator, not just individual feedback.
- Time-to-usable-plan — how many turns / how long from first prompt to a "Plan this" tap. Ties directly to Charter Principle 4 (simple, usable, fast).

**Method:** primarily the existing human rating/tag system, supplemented by LLM-as-judge scoring the itinerary against the captured brief (an automated proxy that can run on every trip, not just the ones a user bothers to rate).

---

## 3. Eval pipeline

Three tiers, each running at a different cadence — mirrors the structure implied by Charter Principle 5 (feedback → eval → prompt versioning).

### Tier 1 — Pre-release regression (blocking)
Runs against every prompt or schema change before it ships. Covers categories 2 (task/schema correctness) and the automatable parts of 1 (voice rubric via LLM-as-judge on the golden test set) and 4 (axe-core). **A regression here blocks release** — same as a failing test suite blocking a code merge.

### Tier 2 — Continuous production sampling (monitoring)
A rolling sample of real production conversations/trips is scored against the full rubric set (all 6 categories) on an ongoing basis, not just at release time. This is what catches drift — a prompt that passed the golden set but degrades on real, messier user input over time. Category 5 (reliability) runs continuously here, not just on a sample, since it's monitoring system health rather than individual outputs.

### Tier 3 — User feedback loop (ground truth)
The existing `wandr_ratings` / `wandr_trip_ratings` tag system. This is the slowest but highest-trust signal — real users, real trips. Used to (a) validate that Tier 1/2 automated scoring is actually correlated with what users think is good, and (b) surface failure modes the automated categories didn't anticipate. Every new recurring tag in the feedback data is a candidate for a new Tier 1 regression test.

**The loop closes like this:** Tier 3 finds a real problem → root-cause it against categories 1–6 → write a Tier 1 regression test so it can never silently regress again → track it in Tier 2 to confirm the fix holds in production.

---

## 4. Prompt/schema version attribution

Every eval result (all three tiers) is logged against the prompt/schema version that produced it (Voice spec §6.3 already establishes this versioning discipline). Without this, Tier 2 drift detection is useless — you can see quality dropped but not correlate it to *which* change caused it.

---

## 5. Severity policy

| Severity | Definition | Handling |
|---|---|---|
| Blocking | Fails Tier 1, or Tier 2 catches a category-5 (reliability) or category-2 (schema) failure in production | Blocks release / triggers immediate alert |
| Tracked | Fails category 4 (accessibility) or category 6 (outcome quality) below threshold | Logged, prioritized, not release-blocking by default (accessibility gaps should move to blocking once the current known backlog is cleared) |
| Informational | Single low-confidence Tier 3 tag, or a category-1 voice miss below the aggregate threshold | Aggregated for trend-watching, not actioned individually |

---

## 6. Open questions / next steps

- Accessibility (category 4) currently has known, documented failures (UX spec §13). Worth deciding: does this eval program launch treating those as "tracked" (accepted debt) or "blocking" (must-fix-first)? Recommend tracked-with-a-deadline rather than blocking the whole eval program on pre-existing gaps.
- LLM-as-judge prompts for categories 1 and 6 need to be written and, ideally, validated against a human-labeled sample before being trusted — same caution as the Kitt rubric being refined against real transcripts before rollout.
- Golden test set (category 2) doesn't exist yet — first concrete build item. Should seed it from the journeys already in the UX spec (§5: Maya, Rahul, Priya) plus edge cases (ambiguous input, contradictory answers, mid-conversation destination changes).
- Where does synthetic failure injection (category 5) run — dedicated staging environment, or a feature-flagged shadow path in production? Worth deciding before this category's tooling gets built.
