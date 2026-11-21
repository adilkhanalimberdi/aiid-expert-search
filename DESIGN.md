---
name: Sarap
description: Offline expert search for AIID — "Observatory": dark-only graphite layers, one luminous signal (chartreuse) for action and "found", sky blue for place, amber for conditions; the catalogue drawn as a night sky.
colors:
  ground: "#0a0d10"
  sunken: "#0e1216"
  surface: "#12161b"
  raised: "#181d23"
  hover: "#1d232b"
  line: "#232a33"
  line-strong: "#343d48"
  ink: "#eceff3"
  ink-2: "#b0b9c3"
  ink-3: "#8a95a1"
  action: "#d4f35a"
  action-hover: "#e2f88a"
  action-ink: "#121705"
  brand: "#d4f35a"
  brand-deep: "#dcf27e"
  brand-tint: "#1f2610"
  brand-soft: "#56662a"
  medium: "#f5b455"
  medium-bar: "#e09a3c"
  weak: "#97a1ac"
  free: "#7ce0a3"
  partial: "#f5b455"
  busy: "#8a95a1"
  place: "#8db8ff"
  place-tint: "#16213a"
  cond: "#f5b455"
  cond-tint: "#2b2112"
  danger: "#ff8473"
  danger-tint: "#33181a"
fonts:
  sans: "Commissioner Variable (interface, expert names)"
  mono: "Fira Code Variable, ligatures off (labels, ranks, scores in lists, ids, timing, kbd)"
radius:
  control: 6px
  panel: 12px
  query: 16px
---

# Sarap design system

Source of truth for tokens: `web/src/index.css` (`@theme`). This file explains how they are used.

## Idea

"Observatory". The catalogue is a night sky: every expert is a point, the query is a viewfinder that locks onto some of them and explains why. A working tool, not a landing page: no slogans, the screen opens straight on the query.

- One luminous signal (chartreuse `action`), used sparingly: the main button, the active section, focus rings, the mark, the bar of a strong score, "Best match".
- Place (city, industry) is sky blue, conditions and medium scores amber, exclusions and errors red.
- Depth is graphite layers (`ground` → `sunken` → `surface` → `raised` → `hover`), few 1 px lines, no shadows except under the floating palette. Hover lightens, never darkens.
- Dark only (`color-scheme: dark`). Every text pair is WCAG AA or better: weakest is `ink-3` on `hover`, 5.2:1.

All fonts carry the Kazakh letters ә ғ қ ң ө ұ ү һ і (checked with fontTools over the cyrillic and cyrillic-ext subsets; Wix Madefor, JetBrains Mono, Manrope, Martian Mono and Unbounded fail this check).

## Shell (`components/Shell.tsx`)

- **Top bar** (sticky, 56 px): mark + wordmark, a hairline, the sections left-aligned with a signal underline on the active one (keys `1`–`3` work but are not drawn), language switch on the right. On a phone the sections are icons only.
- **Status line** (bottom, fixed, above everything including the phone sheet): only the synthetic-data notice. No technical telemetry (model, counts, timing) in the chrome.
- **Sky** (`components/Sky.tsx`): one canvas behind the content. Points = experts in the catalogue (capped at 140, 55 on phones) float slowly and wrap around the screen; close points link up like a competency graph. The mouse is a flashlight: nearby points brighten, step aside and draw threads to the cursor. While searching the sky pulls towards the query field; when results arrive as many points as results light up in signal and are joined to the field (amber and dim for a weak match). Paused when the tab is hidden, 30 fps on phones, a single static frame under `prefers-reduced-motion`. State comes from `lib/pulse.ts`.

Keys: `/` focuses the query from any section, `1`–`3` switch sections (not while typing or with a dialog open).

## Search (`pages/SearchPage.tsx`)

- **Query card**: search icon, field (combobox), clear cross, "Try an example ▾" trigger, signal button; filters on a lower row.
- **Examples**: a compact dropdown under the field (on focus or via the trigger), groups "Recent" and "Try an example", one line per query with what it demonstrates and the language in grey on the right. ↑↓ choose, Enter searches, Esc closes. Examples live in `EXAMPLE_QUERIES` (`lib/i18n.ts`), all checked on the demo catalogue.
- Idle: one centred column (960 px): query card, "How Sarap reads a query" (skill, city, condition, exclusion underlined in their colours with a small caption), three points, the formula.
- After a search: "Understood:" tags, count and timing, New search; Candidates / Team switch; one list beside the sticky profile pane: group "Recommended" (top 3, engine order) and "More candidates"; a busy row carries a quiet "Free alternative" line. No separate top-3 cards: the reasoning lives in the pane. Weak match: amber notice and only "Closest profiles". Loading: the mark scans, skeletons have the final heights.
- Phone: one column, profile in a sheet above the list (status bar stays visible).

## Score (`components/Score.tsx`)

Colour only from `strengthOf`: ≥70 white number with a signal bar, ≥40 amber, below grey; in the profile also the strength word. Lists: number + 3 px bar. Profile: a large number and a thin bar with ticks at 40 and 70.

## Profile (`components/ExpertPane.tsx`)

Header (initials tile, name, position, label chip, score), facts row, tabs Reasoning / Profile / Similar with a signal underline. `/explain` loads only for the Reasoning tab (or for a profile reached through "Similar", which needs it for the score), `/similar` only when its tab is open. Reasoning: query term → competency (`exact`, `≈ by meaning 0.83`, missing in red), "How N% adds up" (two-tone bar and arithmetic with city chips), conditions, free alternative (dashed), feedback.

## Status, avatars, chips

- Status: dot (available, mint), ring (partial, amber), dash (busy, grey) plus the word.
- Avatars: initials on a neutral round tile.
- Few boxes: panels have no border (graphite layer only), parsed-query terms are words with a coloured icon, skills are plain text or borderless chips; labels are sentence case, never mono caps.

## Logo

`SarapMark`: four viewfinder corners around a filled dot, all in signal. The dot is an expert on the sky, the corners are the query that locked onto it. While searching the corners contract and the dot pulses (`.mark-scan`). Wordmark "Sarap" in Commissioner. No partner logos.

## Motion

`fade-in` for new results, `sheet-in` for the phone sheet, shimmer skeletons, `mark-scan`, the sky. All disabled or frozen under `prefers-reduced-motion`.

## Rules

- The synthetic-data notice stays in the status line on every screen.
- Score colour only from `strengthOf`; pair every colour with a word, shape or number.
- No dark hover states; icons only from `components/Icon.tsx`; no HEX in JSX.
- New text only through `lib/i18n.ts` (three dictionaries of one type).
