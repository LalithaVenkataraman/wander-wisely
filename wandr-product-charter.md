# Wandr — Product Charter

_Last updated: July 2, 2026_

---

## Vision

Build the world's simplest AI travel planner that transforms vacation planning from fragmented research into a single, conversational planning experience.

## Purpose

Help people spend less time planning and more time traveling by orchestrating every stage of trip planning — from inspiration to itinerary to booking recommendations — in one place.

## The problem

Planning a vacation today is fragmented. People bounce between Google Search, ChatGPT, blogs, YouTube, Reddit, Booking, Airbnb, Google Maps, and airline sites. Every tool answers one question; none orchestrates the entire journey.

## The opportunity

AI shouldn't be another place to ask questions. It should be the planner that understands your constraints, asks the right questions, and produces a complete, personalized trip — end to end.

---

## Product Philosophy

_How Wandr behaves in any given conversation._

- Start with the travel outcome, not the AI.
- Ask only the questions needed to personalize the trip.
- Every conversation should feel like planning with an experienced travel advisor.
- Recommendations should be actionable, explainable, and easy to refine.
- Learn from every interaction through structured feedback and evaluations.

---

## Core Operating Principles

_How Wandr is built and run — the non-negotiables that sit above any single screen or feature._

### 1. AI-native, not AI-bolted-on
Wandr is not an existing booking pipeline with an AI feature sprinkled in. The AI *is* the product — it drives intake, reasoning, recommendation, and refinement. Every feature decision starts with "what should the AI own here?" before "what UI do we need?" If a capability could just as easily be a static form or a rules engine, it's not earning its place in Wandr.

### 2. Autonomous by design
Wandr is built to run with zero human employees in the operating loop — a 100% agent-driven, autonomous app with founder oversight, not founder operation. This shapes engineering choices directly: workflows must be self-monitoring, self-correcting where possible, and escalate to a human only on genuine exceptions (not routine operation). Oversight means reviewing evals, dashboards, and edge cases — not manually handling requests.

### 3. Consistent experience, guarded flexibility
The user experience — tone, vibe, sequence of questions, and how Wandr responds when it knows something vs. doesn't — must be consistent across every conversation. This isn't achieved by rigid scripting; it's achieved by guardrails: a defined voice, a bounded set of behaviors for known/unknown/uncertain states, and a consistent question order that still adapts to what the user has already told Wandr. Flexibility lives *within* the guardrails, not outside them.

### 4. Simple, usable, fast
Every added step, question, or screen has to earn its place against a simplicity bar. If it doesn't get the user closer to a usable trip plan faster, it's a candidate for removal. Time-to-first-useful-output is a first-class metric, not an afterthought.

### 5. Continuous improvement loop
Every interaction is a training signal. Feedback (ratings, tags, corrections) feeds a structured eval loop that informs prompt versioning and workflow changes — mirroring the spec-driven development, logging, and evaluation discipline used at Goodcall. Nothing ships as "final"; everything ships as a version with a feedback path back into the system.

---

## Why this matters together

These five principles aren't independent — they reinforce each other:
- **Autonomy (2)** only works if the experience is **consistent (3)**, because a human isn't in the loop to catch drift.
- **Consistency (3)** is what makes the **feedback loop (5)** trustworthy — you're evaluating the same system behaving the same way, not noise.
- **AI-native (1)** is what makes true **autonomy (2)** possible at all — a bolted-on AI feature can't run the whole journey without a human backstopping the gaps.
- **Simplicity (4)** is the constraint that keeps 1, 2, and 3 honest — it's easy to add guardrails and workflows that quietly make the product slower or more complex; simplicity is the check on that.

---

## Where the current prototype already reflects this

Looking at the v2 UX spec, a few things are already built in the direction of these principles, worth naming explicitly so they don't get re-litigated later:

- **Principle 5 (continuous improvement)** is furthest along: `wandr_ratings` / `wandr_trip_ratings` with tag-based feedback on every output (shortlist, itinerary) is a real eval data pipeline, not a placeholder.
- **Principle 3 (consistency)** has a voice defined (the witty, advisor-like Wandr tone in copy like the visa strip line) but the guardrails aren't yet written down as a spec — there's no explicit rulebook for tone, question sequence, or known/unknown response behavior. That's a gap worth closing next.
- **Principle 1 (AI-native)** shows up in intake (freeform prompt → conversational clarifiers) but the eval/dashboard surface for the app owner ("Dashboard eval surface" in known gaps) isn't built yet — that's part of principle 2 and 5 both.
- **Principle 2 (autonomous by design)** is the least represented in the current spec — there's no monitoring, self-correction, or escalation logic described yet. Worth flagging as the next architectural layer to spec out, likely alongside the eval dashboard.

---

## Long-term platform vision — "One place for all travel"

Today's spec covers one loop: **inspiration → planning → itinerary.** "One place for all travel" means closing the *full* loop:

```
Inspiration ──▶ Planning ──▶ Booking ──▶ Experience ──▶ Sharing ──┐
     ▲                                                             │
     └─────────────────────────────────────────────────────────────┘
```

Three new capability layers extend the current product toward that loop. Each is a real platform commitment, not a feature checkbox — worth naming what each actually requires before committing to it.

### A. Social discovery layer
Pull in social content (Instagram, TikTok, YouTube) relevant to the specific trip being planned — not generic destination content, but content matched to *this* itinerary's stops, pace, and vibe.

- **What it needs:** a content-matching layer that goes beyond keyword search — the AI has to judge relevance to the actual plan, not just the destination name. The Shorts feed already in the stop detail modal is the seed of this; it's currently link-out, not curated-in.
- **Tension to flag:** most social platforms restrict API access, rate-limit hard, or require content-partner deals — this is as much a business-development problem as an engineering one. Budget for that separately from the AI work.
- **Autonomy risk (Principle 2):** relevance judgment at scale needs to run without a human curating feeds per trip — this is a genuine AI capability, not just an integration.

### B. Booking integration layer
Move from link-out recommendations to actual booking APIs (flights, stays, activities) — the "recommendations" become "reservations."

- **What it needs:** partner integrations (GDS/OTA APIs, hotel channel managers, activity marketplaces), plus a transaction layer: payments, cancellations, confirmations, customer-facing support for booking failures.
- **Tension to flag:** this is the biggest departure from Principle 2 (autonomous by design). Money moving means real liability — failed bookings, refund disputes, fraud — which is exactly the kind of "genuine exception" that principle 2 says should escalate to a human. Autonomy here means excellent failure-handling, not zero human touch.
- **Sequencing note:** booking is usually the *last* layer to build, not the first — it's the most expensive to get wrong and the least differentiated (Booking.com and Expedia already do this well). The differentiation is everything upstream of it.

### C. Experience & community layer
Let users log their actual trip (photos, notes, "what I'd change") after traveling, and surface that as feedback — both back into Wandr's own eval loop and outward to other users planning similar trips.

- **What it needs:** a post-trip capture flow, moderation/quality-filtering for anything shown to *other* users (this is different from the existing ratings system, which is private feedback — this is public content), and a way to connect "people like you who went here" without it turning into generic UGC noise.
- **Tension to flag:** this is where Principle 3 (consistent, guardrailed experience) gets hardest. User-generated content is inherently inconsistent in tone and quality — Wandr's voice has to wrap around it (summarizing, contextualizing) rather than showing it raw, or the "well-traveled friend" consistency breaks.
- **Flywheel value:** this is the layer that actually makes the eval loop (Principle 5) compound — real post-trip outcomes are a much stronger signal than in-planning thumbs-up/down.

### Suggested sequencing

Given Principle 4 (simplicity) as the standing check on scope creep, these don't need to build in parallel:

1. **Now:** finish the core planning loop + the Voice & Guardrails spec (below) — the foundation everything else sits on.
2. **Next:** deepen social discovery *inside* planning (A) — it's the most natural extension of what's already built (Shorts feed, stop detail modal) and reinforces the AI-native principle without new liability.
3. **Later:** experience/community layer (C) — this is what turns Wandr from a single-player tool into a platform with network effects, and it feeds the eval loop directly.
4. **Last:** booking integration (B) — highest cost, highest liability, lowest differentiation. Worth revisiting once A and C have proven the planning experience is meaningfully better than a raw LLM chat.

---

## Suggested next artifact

A **Wandr Voice & Guardrails spec** — the concrete rulebook behind Principle 3 — would turn "consistent tone and guardrails" from a stated value into something you can actually eval against (e.g., does this response match the defined tone? did it ask questions in the right sequence? did it handle "I don't know" the approved way?). This would also give the eval loop (Principle 5) something specific to score beyond just thumbs up/down.

It's also the right foundation to build *before* layer C above — you can't wrap inconsistent user-generated content in a consistent Wandr voice if that voice isn't specified yet.
