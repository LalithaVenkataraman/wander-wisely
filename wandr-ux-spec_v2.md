# Wandr — UX Specification (v2)

_Last updated: July 2, 2026_

---

## 1. Product overview

**Wandr** is a structured, conversational travel planner. Users describe a vague travel wish in one sentence; Wandr guides them through a chat funnel to a rateable, shareable itinerary. AI is the engine, not the interface — every step has a click-to-answer path in addition to free text.

- **Primary user:** consumer traveller planning a leisure trip solo/couple/family.
- **Problem solved:** raw LLMs (ChatGPT, Gemini) hand back walls of text. Wandr converts the same intelligence into a guided flow with visual postcards, drag-and-drop day plans, and a persistent trip history the user can rate.
- **Business goal:** collect high-signal, tag-based human feedback on every AI output to fuel an eval loop / LLM-as-judge pipeline.
- **Differentiation vs raw chat LLMs:** guided intake, conflict nudges, visual itinerary builder, embedded media placeholders, persistent + rateable outputs.

---

## 2. Information architecture

```
/                           Landing — "Ready to Wandr" hero + prompt
/plan                       Planner (single route, 3 progressive states)
/auth                       Google OAuth sign-in
/_authenticated/            Route-guarded layout
   └── dashboard            My trips — feedback + eval surface
```

**Global chrome** (all authed pages): Logo (terracotta), "My trips" / "Sign in" / "Sign out", "New trip" link.

**Data domains** (Supabase, RLS-scoped per user):
- `wandr_trips` — prompt + captured brief.
- `wandr_trip_ratings` — top-level 👍/👎 + tags.
- `wandr_outputs` — every LLM output (`shortlist` | `itinerary`).
- `wandr_ratings` — per-output 👍/👎 + tags.

---

## 3. Screen inventory

| # | Screen | Route | Auth | Purpose |
|---|---|---|---|---|
| 1 | Landing | `/` | public | Convert a wish into a `/plan` session |
| 2 | Planner — Chat/Brief | `/plan` (state A) | public* | Capture when / who / budget / pace / vibe / duration |
| 3 | Planner — Shortlist | `/plan` (state B) | public* | Present destination postcards |
| 4 | Planner — Itinerary | `/plan` (state C) | public* | Day-grouped drag-and-drop plan |
| 5 | Stop detail modal | overlay on #4 | public* | Gallery + Shorts + notes for one stop |
| 6 | Auth | `/auth` | public | Google OAuth sign-in |
| 7 | Dashboard | `/dashboard` | required | Trip history + granular rating |

*Planner is usable signed-out; trip + outputs only persist when the user is authenticated.

---

## 4. Navigation flows

### 4.1 Primary flow (happy path)
```text
Landing ─ prompt ─▶ /plan (Chat)
                        │
                        ├─ answers chips ─▶ Live shortlist refresh (silent)
                        │
                        └─ duration confirmed ─▶ Shortlist ─ "Plan this" ─▶ Itinerary
                                                                          │
                                                                          └─ card tap ─▶ Stop modal
```

### 4.2 Direct-destination shortcut
```text
Landing ─ "5 days Kyoto in April" ─▶ /plan ─ intake fast-forwards ─▶ Itinerary
```

### 4.3 Auth flow
```text
Any auth-gated action ─▶ /auth (Google) ─▶ intended route (or /dashboard)
```

### 4.4 Feedback flow
```text
/dashboard ─ collapsed row ─ 👍/👎 ─▶ tags render ─ + add tag ─ Enter/comma
                │
                └─ expand (+) ─▶ line items (Wandr recs / Refined recs / Itineraries)
                                        │
                                        └─ per-item 👍/👎 ─▶ per-item tags
```

---

## 5. User journeys

### 5.1 Maya — "surprise me" traveller (first-time, signed-out)
1. Lands on `/`, types "somewhere warm in December, budget-ish".
2. Wandr replies with 2 clarifiers as chips: `Solo / Couple / Family`, `5 days / 7 days / 10+`.
3. Taps `Couple` + `7 days`. Shortlist appears with 4 postcards.
4. Taps the polaroid stack on "Goa" — cycles through 5 photos.
5. Hits "Plan this" → itinerary with day themes and commute pills.
6. Drags a stop from Day 3 to Day 2; commute pill recalculates.
7. Prompted to sign in to save.

### 5.2 Rahul — repeat user, eval-minded (signed-in)
1. Signs in with Google, lands on `/dashboard`.
2. Sees 6 collapsed trip rows.
3. Adds tag `too touristy` to a Bali trip — auto-marks 👎.
4. Expands the row, thumbs-down "Refined recommendations v3" with `wrong pace`.
5. Data flows to `wandr_ratings.tags[]` for eval.

### 5.3 Priya — multi-city planner
1. "Tokyo and Kyoto, 8 days, food-first".
2. Wandr proposes a joined 8-day plan ("Tokyo → Kyoto") rather than two separate trips.
3. Confirms duration gate; itinerary spans both cities with a transit day marked.

---

## 6. Components

### Shared UI (shadcn/ui, customised)
- `Button`, `Card`, `Tabs`, `Collapsible`, `Dialog`, `Input`, `Textarea`, `Avatar`, `Toast/Sonner`.

### Wandr-specific
| Component | Purpose |
|---|---|
| `Logo` / `LogoWordmark` | Terracotta wordmark, italic *Wandr* accent. |
| `LogoAvatar` | Chat message avatar (36px, no circle chrome). |
| `ChatBubble` | Alternating `You` / *Wandr* bubbles. |
| `QuickReplyChips` | Tap-to-answer chips beneath Wandr's questions. |
| `PolaroidStack` | 5-photo cycling stack, permanent "👆 tap to flip" hint at 60% opacity. |
| `PostcardsGallery` | Single-column shortlist grid. |
| `DestinationCard` | Cover image + vibe copy + "Plan this" CTA. |
| `DayGroup` | Day header + theme label + commute pill overlay. |
| `StopCard` | Draggable stop with witty flavour bullets. |
| `CommuteHop` | Small pill between stops (time + mode). |
| `StopDetailModal` | Gallery + Shorts feed + notes. |
| `TripRow` (dashboard) | Collapsed summary + expandable line items. |
| `LineItemGroup` | Grouping for Wandr recs / Refined / Itineraries. |
| `InlineThumbs` | 👍/👎 that also selects the row. |
| `TagChips` | Preset + custom tags, `+ add tag` input. |

---

## 7. Design system

### Palette (OKLCH tokens in `src/styles.css`)
| Token | Role | Hex reference |
|---|---|---|
| `--primary` (sage) | primary CTAs, thumbs-up | `#7d9b76` |
| `--accent` (blush) | italic *Wandr*, custom-tag chips | `#e8a4a4` |
| `--brand` (terracotta) | logo only | `#c4521a` |
| `--background` / `--card` | warm off-white | — |
| `--muted` / `--muted-foreground` | secondary text, borders | — |
| `--destructive` | thumbs-down active | — |

### Typography
- **Headings:** Syne, `font-normal` weight (deliberately soft, not bold).
- **Body:** Plus Jakarta Sans.
- **Accent:** `.font-serif-italic` for the *Wandr* wordmark inline in copy.

### Shape, spacing, motion
- Radius: `rounded-2xl` for cards/rows, `rounded-full` for chips + thumbs.
- Borders: `border/70` for scannable, non-enterprise density.
- Motion: framer-motion for postcard cycling, day-card drag, modal transitions.
- Emoji use: functional only (👍 👎 👆). No decorative sprays.

---

## 8. States (per screen)

### 8.1 Planner — Chat
- **Idle intake:** Wandr prompt + 2–4 chips.
- **User composing:** input focused, chips still tappable.
- **AI thinking:** typing indicator (three dots in an avatar-less bubble).
- **Live preview refreshing:** subtle "updating shortlist…" toast in corner while user keeps chatting.
- **Duration gate:** Wandr proposes N days, chips: `Sounds right / Shorter / Longer`.

### 8.2 Planner — Shortlist
- **Loading:** 4 skeleton postcards with shimmer.
- **Loaded:** single-column postcards; polaroid hint pulsing at 60%.
- **Empty (no matches):** "Nothing quite fits — tell me one more thing" + chip to refine.

### 8.3 Planner — Itinerary
- **Loading:** day headers with skeleton stop cards.
- **Loaded:** day-grouped cards, drag handles visible on hover / long-press.
- **Dragging:** ghost card + drop indicator; day pill recalculates on drop.
- **Modal open:** background dim, focus trap, ESC/backdrop closes.

### 8.4 Dashboard
- **Loading:** "Loading your trips…" text.
- **Empty:** dashed panel — "You haven't planned anything yet." + `Start a trip` CTA.
- **Populated collapsed:** rows show prompt, meta, thumbs, user tags only.
- **Row expanded:** three grouped sections; each item independently rateable.
- **Rated row:** thumbs button filled (primary for 👍, destructive for 👎).

---

## 9. Empty states

| Surface | Copy | CTA |
|---|---|---|
| Dashboard, no trips | "You haven't planned anything yet." | `Start a trip` → `/` |
| Expanded row, no outputs | "No recommendations saved for this trip yet." | — |
| Shortlist, zero matches | "Nothing quite fits — tell me one more thing" | Chip refine |
| Trip row, no user tags | Tag chip strip renders nothing (no placeholder text) | `+ add tag` inline |
| Stop modal, no photos | Single fallback postcard | — |

---

## 10. Loading states

| Surface | Treatment |
|---|---|
| Wandr AI reply | Three-dot typing bubble. |
| Shortlist first paint | 4 skeleton postcards. |
| Itinerary first paint | Skeleton day + stop cards. |
| Silent live preview | "updating shortlist…" corner toast (non-blocking). |
| Dashboard list | Plain "Loading your trips…" text (upgrade candidate → skeleton rows). |
| Auth callback | Redirect spinner (browser-native). |
| Rating save | Optimistic — UI updates instantly; failure toasts and reverts. |

---

## 11. Error states

| Surface | Trigger | UX |
|---|---|---|
| AI call fails | Gateway timeout / 5xx | Wandr bubble: "That didn't land — retry?" + `Retry` chip. |
| Schema validation | LLM returns malformed JSON | Silent retry once; then same error bubble as above. |
| Auth failure | Google OAuth cancelled / denied | `/auth` shows "Couldn't sign you in — try again". |
| Route not found | Any unknown path | Router `notFoundComponent` → "Nothing here" + link home. |
| Route error boundary | Loader throws | `errorComponent` with `Retry` (invalidates + resets). |
| Save output/rating fails | Supabase RLS or network | Sonner toast: "Couldn't save — retry?". Ratings stay in optimistic state until confirmed. |
| Persisted brief has nulls | Zod v.s. DB mismatch (past bug) | Fixed by `.nullish()` on brief fields. |

---

## 12. Mobile behavior

- Planner switches from side-by-side to stacked: chat on top, current output below.
- Chat input dock pins to the bottom (safe-area padding).
- Quick-reply chips wrap into 2 rows before scrolling horizontally.
- PolaroidStack sized to 82vw with tap-only interaction (no hover hint state — hint is always visible at 60%).
- Itinerary day groups collapse by default on <640px; tap to expand.
- Stop modal: Shorts feed switches from horizontal (desktop) to **vertical snap** on mobile.
- Dashboard rows: brief meta strip wraps; `+ add tag` input widens to remaining row width.
- Header condenses to logo + hamburger; email hidden `sm:` and up.

---

## 13. Accessibility observations

**Working today**
- Semantic route heads on every page (title, description, og:*).
- Buttons carry `aria-label` for icon-only controls (expand/collapse, thumbs).
- Focus rings preserved via shadcn `focus-visible:ring`.
- Colour tokens defined in OKLCH → consistent contrast in the sage/blush palette.
- Drag-and-drop stops have keyboard grab handles via the underlying dnd primitives.

**Gaps to address**
- Chat typing indicator has no `aria-live` region — screen readers miss AI replies.
- PolaroidStack cycle is tap-only; no keyboard equivalent (`Enter`/`Space`) or arrow-key navigation.
- Colour-only signal on thumbs (primary vs destructive) — needs textual `aria-pressed` state.
- Modal focus trap relies on Radix defaults; needs manual QA on Shorts feed scroll containment.
- Custom tag chips use `✕` glyph only; needs `aria-label="Remove tag {name}"`.
- Duration gate chips lack `aria-describedby` linking back to Wandr's proposed length.
- No skip-to-content link on the planner shell.

---

## 14. Known gaps

- YouTube playback is link-out; in-frame player pending.
- No shortlist→itinerary "committed" transition animation.
- Dashboard has no filter, sort, search, or pagination.
- No bulk rating or keyboard shortcuts on dashboard rows.
- No mobile-optimised drag affordance beyond long-press.
- Loading state on dashboard is text-only, not skeleton.
- No offline / retry queue for saved outputs.
- Live-preview toast is non-dismissible.
- No dark mode (tokens defined but not toggled).

---

## 15. Features implemented

- Conversation-first planner with quick-reply chips.
- Intent detection for direct destination mentions (skips shortlist).
- Duration gate before itinerary lock.
- Multi-city planning as a single joined itinerary.
- Live silent shortlist refresh while user chats.
- Single-column shortlist with `PolaroidStack` (5-photo cycle, ambient hint).
- Day-themed itinerary with drag-and-drop across days.
- Commute hops + total daily commute pill overlay.
- Stop detail modal with photo gallery + vertical-snap Shorts feed on mobile.
- Sage & blush design system with Syne + Plus Jakarta Sans.
- Terracotta wordmark logo; italicised *Wandr* accent.
- Google OAuth via Lovable Cloud.
- Route-guarded `/dashboard`.
- Auto-save of trip + outputs for signed-in users.
- Dashboard collapsible row layout with:
  - Trip-level inline 👍/👎.
  - Per-line-item inline 👍/👎.
  - Preset + custom tag chips (Enter/comma commit, click to remove).
  - Auto-👍 when user adds a tag before rating.
  - User-selected tags rendered inline in the collapsed row.
- Zod `.nullish()` brief schema tolerating persisted nulls.

---

## 16. Features implied but not yet implemented

- **In-frame YouTube Shorts playback** (currently link-out).
- **Shareable trip URLs / read-only public links.**
- **Collaboration:** invite a co-traveller to co-rate or co-edit.
- **Conflict nudges surfaced in UI** (accessibility warnings, opening-hours clashes) — modelled in spec, not yet in the itinerary component.
- **Booking / affiliate rails** (stays, activities, transport).
- **Notifications / reminders** as trip date approaches.
- **Dashboard eval surface for app owner:** filters, aggregate charts, LLM-as-judge scores. Data is stored; UI is not built.
- **Skeleton loading on dashboard.**
- **Dark mode toggle** (tokens defined).
- **Keyboard-first dashboard shortcuts** (`j/k` to move, `y/n` to rate, `t` to tag).
- **Offline queue** for ratings written while disconnected.
- **Trip search / filter / sort** on dashboard.
- **Notes tab content** on itinerary (tab exists, content minimal).
- **Free-form note** attached to a rating (schema supports `note`; UI is tag-only per user preference).
- **Bulk export** of ratings + outputs for offline eval pipelines.
