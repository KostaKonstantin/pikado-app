# Share Page — Player Stats Panel (win %, form, streak)

**Date:** 2026-06-16
**Status:** Approved design, ready for implementation plan
**Area:** `backend/src/share`, `frontend/src/app/share/[token]/page.tsx`

## Overview

Add per-player insight to the public share page. Tapping a player in any
standings table expands a detail panel showing:

1. **Win percentage** — `won / played`.
2. **Last-4 form** — the player's four most recent match outcomes as colored
   pills, oldest → newest.
3. **Current streak** — e.g. "3 pobede u nizu", shown only when the run is ≥ 2.

The stats are computed on the backend (Approach A) and attached to each
standings row. The frontend only renders an expandable panel.

## Goals

- Reuse the existing share-page visual language (dark slate, orange accent,
  `rounded-2xl`, `tabular-nums`, framer-motion).
- No new database queries — derive everything from data already fetched.
- Stats stay correct against the standings table (single source of truth for
  win/loss/draw logic).
- Works for both regular-season and round-robin phase standings.

## Non-goals

- No new tab or page; this lives inside the existing standings table.
- No sets/legs detail or points-per-match (deferred; can be added to the panel
  later without schema changes).
- No change to freshness plumbing — see "Freshness" below.

## Freshness (already solved)

`backend/src/share/share-cache.subscriber.ts` clears the share cache whenever a
`LeagueMatch` (or other share-relevant entity) changes, and the page fetches
with `cache: 'no-store'`. Any new stat therefore refreshes on the next request
after an admin enters a result. No additional work required.

## Backend — data contract

Extend `ShareService.buildStandings()` so each returned standings row gains:

```ts
winPct: number;                                    // Math.round(won / played * 100); 0 when played === 0
form:   ('W' | 'D' | 'L')[];                       // up to 4 outcomes, oldest → newest
streak: { type: 'W' | 'D' | 'L'; count: number } | null;  // null when no completed matches
```

`buildStandings()` already receives the completed matches and iterates them once
to compute `won/lost/drawn/points`. The same pass builds, per player, a list of
`{ outcome: 'W' | 'D' | 'L'; sortKey }` entries:

- **Outcome** uses the existing win logic: `winnerId === homePlayerId` → home
  `W` / away `L`; `winnerId === awayPlayerId` → away `W` / home `L`; otherwise
  both `D`. Walkover and DNF results carry a `winnerId`, so they map to `W`/`L`
  exactly like the table — form cannot disagree with the standings.
- **sortKey** = `playedAt ?? updatedAt`, tiebroken by `sessionNumber` (or
  `roundNumber` for round-based leagues) then `matchOrder`. The completed-match
  queries are full-entity reads, so these columns are already loaded.

After the pass, for each player:

- Sort entries by `sortKey` ascending. `form` = last 4 outcomes.
- `streak` = walk backward from the newest entry while the outcome repeats; emit
  `{ type, count }`. `null` if the player has no completed matches.
- `winPct` = `played === 0 ? 0 : Math.round(won / played * 100)`, using the same
  `won`/`played` already shown in the row.

This applies in both call sites of `buildStandings()` (regular season and
round-robin phases), so phase tables get the feature for free.

### DNF / no-match players

Players with zero completed matches and DNF players (whose record is
administratively zeroed in the standings) are still returned with
`form: []`, `streak: null`, `winPct: 0`. The frontend treats these rows as
**not expandable** so no misleading panel appears.

## Frontend — types

Extend `StandingRow` in `frontend/src/app/share/[token]/page.tsx`:

```ts
type StandingRow = {
  // …existing fields…
  winPct?: number;
  form?: ('W' | 'D' | 'L')[];
  streak?: { type: 'W' | 'D' | 'L'; count: number } | null;
};
```

Fields are optional so an older payload degrades gracefully (row simply isn't
expandable).

## Frontend — visual design

The panel renders below a tapped row, inside the same row wrapper, separated by
`border-t` on a `bg-slate-900/55` surface with `rounded-b-2xl` — matching the
existing match-filter bar styling.

```
#1  Marko Petrović            8 6 1 1  19   ⌄   ← tappable row + rotating chevron
     L+ 24   L− 9
─────────────────────────────────────────────   ← border-t, bg-slate-900/55
  POBEDE                                          ← label: text-[10px] uppercase tracking, slate-500
  75%                                             ← orange-400, text-2xl font-black, tabular-nums

  FORMA              najstarije → najnovije
  (P) (P) (R) (P)                                 ← colored pills, Serbian initial inside

  ↗ 3 pobede u nizu                               ← streak pill: TrendingUp icon + green text
```

- **Color language** reuses the table exactly: green `#4ade80` = P (pobeda),
  yellow `#facc15` = R (remi), red `#f87171` = G (gubitak).
- **Form pills are not color-only**: each pill shows its Serbian initial
  (`P` / `R` / `G`, matching the table header letters) plus an `aria-label`
  ("Pobeda" / "Remi" / "Poraz"). Satisfies the color-not-only rule.
- **Streak** shows a Lucide `TrendingUp` / `TrendingDown` / `Minus` icon next to
  the text, so meaning isn't carried by color alone. Green for a win run, red
  for a loss run, slate for a draw run. Rendered only when `count >= 2`.
- Streak copy is Serbian and pluralized: `pobeda/pobede/pobeda`,
  `poraz/poraza/poraza`, `remi/remija/remija` (`u nizu`). Helper picks the form
  by `count`.

## Frontend — interaction

- The standings row becomes a tappable `<button>` (already `py-3`, so the touch
  target is ≥ 44px), with `cursor-pointer`, `aria-expanded`, and `aria-controls`
  pointing at the panel's id. A chevron rotates 180° when open.
- Expanded rows tracked in a `Set<string>` of player ids held inside
  `StandingsTable` — same pattern as `expandedGroups` / `expandedPairs`.
  Multiple rows may be open at once.
- Expand/collapse uses framer-motion height + opacity: **200ms ease-out** open,
  **150ms ease-in** close (exit faster than enter). Gated by `useReducedMotion()`
  — when reduced motion is requested, the panel shows/hides instantly.
- Rows that are not expandable (no matches / DNF) render exactly as today: no
  chevron, no button affordance, no `cursor-pointer`.

## Accessibility

- `aria-expanded` / `aria-controls` on the toggle; panel has a matching `id`.
- Each form pill: visible initial + `aria-label` describing the outcome.
- Streak: icon + text, not color alone.
- `prefers-reduced-motion` respected via `useReducedMotion()`.
- Text contrast: orange-400 and white on `slate-900` meet AA; verify the yellow
  `R` pill text/background contrast and darken the glyph if needed.
- Keyboard: the `<button>` row is focusable and toggles on Enter/Space.

## Testing

Backend (`buildStandings`):

- Player with mixed results → correct `winPct`, `form` order (oldest→newest),
  and `streak`.
- Walkover / DNF result → mapped to W/L for the right player.
- Player with < 4 completed matches → `form` length equals matches played.
- Player with 0 matches and DNF player → `form: []`, `streak: null`, `winPct: 0`.
- Streak resets correctly when the latest outcome differs.

Frontend:

- Expandable vs non-expandable rows render correctly.
- Reduced-motion path skips animation.
- Form pills show correct color + initial + aria-label.

## Out of scope / future

- Sets/legs ratio and points-per-match in the same panel.
- Surfacing the same stats in the OG share image.
