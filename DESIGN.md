---
name: Sarap
description: Offline expert search for AIID — "card index": dark leather top bar, saffron action, steppe green for matches, warm paper.
colors:
  night: "#221c17"
  night-2: "#2e2620"
  night-line: "#47392e"
  night-text: "#efe6da"
  night-dim: "#bba993"
  action: "#f2a93b"
  action-hover: "#f6bb5e"
  action-ink: "#241600"
  brand: "#1e6b4c"
  brand-hover: "#185a40"
  brand-deep: "#155238"
  brand-tint: "#e3efe6"
  brand-soft: "#8fc3a8"
  ground: "#f3efe7"
  surface: "#fffdf9"
  sunken: "#f7f3ec"
  hover: "#f9f4e9"
  line: "#e4dccf"
  line-strong: "#cbbfad"
  ink: "#1f1a15"
  ink-2: "#4c4339"
  ink-3: "#6f6355"
  medium: "#955600"
  medium-bar: "#dc9a2c"
  weak: "#776c5f"
  free: "#2b7a4b"
  partial: "#bf8300"
  busy: "#9a8f80"
  place: "#33508a"
  place-tint: "#e7ecf5"
  cond: "#875100"
  cond-tint: "#fbefd9"
  danger: "#b3261e"
  danger-tint: "#fae6e1"
fonts:
  serif: "Literata Variable (headings, expert names, hero score)"
  sans: "IBM Plex Sans 400–700 (interface text)"
  mono: "IBM Plex Mono 400/500 (ranks, scores in lists, counts, ids, timing)"
radius:
  control: 8px
  panel: 12px
  query: 16px
---

# Sarap design system

Source of truth for tokens: `web/src/index.css` (`@theme`). This file explains how they are used.

## Idea

Sarap is a card index of people. The shell is dark leather, the workspace warm paper, names are set in a book serif like entries in a register, and everything countable (rank, score, ids, timing) is in a monospace like a typed index card. One saffron colour for every action; steppe green for what matched; slate blue for place. Depth comes from 1 px borders, not shadows. Hover lights an element up (warm `hover` tint, green text or border); nothing turns dark on hover.

All fonts carry the Kazakh letters (checked with fontTools: Cyrillic + Cyrillic-ext subsets together cover ә ғ қ ң ө ұ ү һ і).

## Layout

- **Shell** (`components/Shell.tsx`). A sticky dark top bar: the Sarap | AIID lock-up on the left (saffron mark, serif wordmark), the sections as centred tabs with a saffron underline on the active one, the EN/RU/KK switch on the right. On phones the tabs move to a second row. Under the bar a thin strip carries the synthetic-data notice (info icon + text, nothing else). Content sits in one centred container (`CONTAINER`, max 1280 px).
- **Search** (`pages/SearchPage.tsx`). Before the first search: a large serif question, the catalogue size in mono with a saffron rule, the query card (field, `/` shortcut hint, button; filters on a dashed lower row), example queries as index cards in a 3-column grid with a mono language tag, "How Sarap reads a query" (one sample sentence in serif with skill, city, condition and exclusion highlighted in their readback colours and labelled underneath; an illustration, not an engine call), three numbered "how it works" points (saffron mono numerals 01–03) and the formula. `/` anywhere focuses the query. After a search: query card on top, the readback ("Understood:" in serif italic, tags with icons, result count and timing in mono), underline tabs Candidates / Team, then the top 3 as large cards (rank, score, name, status, matched skills solid and related dashed, the first three server reasons with checks; the best one carries a saffron 01 and "Best match"), and below them "More candidates" as a list beside the sticky profile pane. A weak match shows no cards, only the "Closest profiles" list. On a phone the profile opens as a sheet.
- **Data** and **Analytics**: serif page header and paper panels in the same container.

## Colour roles

| Role | Token |
| --- | --- |
| Top bar | `night`, `night-2`, `night-line`, text `night-text` / `night-dim` |
| Primary action (dark text on saffron), active tab underline, logo tile, numerals of "how it works", text selection | `action` / `action-hover`, text `action-ink` |
| Selection (tint + 3 px green edge), strong match, skill tags, links, active view tab | `brand`, `brand-deep`, `brand-tint`, `brand-soft` |
| Hover | `hover` background, `brand-soft` border, `brand-deep` text |
| City and industry | `place` on `place-tint` |
| Conditions, weak-match notice | `cond` on `cond-tint` |
| Excluded, errors, busy as a limit | `danger` on `danger-tint` |
| Workspace | `ground` paper, `surface` panels, `sunken` inner blocks, `line` borders |

## Score

`components/Score.tsx`. In lists a mono number plus a 4 px meter. In the profile a large serif number, a meter with ticks at 40 and 70, and the strength word. Colour only from `strengthOf`: ≥70 green, ≥40 amber, below grey.

## Details

- Rank numerals 01, 02… in mono in front of every row.
- Profile badge in mono caps with a green dot; section titles small caps with a hairline rule.
- "Why not them?" blocks carry a 3 px left edge: green confirmed, red missing, amber constraints.
- Similar experts show similarity as a tiny bar.
- Email has a copy button that says "Copied" for 1.4 s.
- The mark animates while searching: the person in the bubble fades in and out.

## Logo

`SarapMark`: saffron tile with a dark speech bubble and a person cut out of it: you say in plain words who you need and get a specific person. While searching the person fades in and out. Wordmark "Sarap" in Literata. `AiidLogo` is the original white AIID logo, unchanged, only on the dark bar.

## Motion

`fade-in` for new results, `sheet-in` for the phone sheet, shimmer for skeletons, `reveal` for the mark while loading. All disabled under `prefers-reduced-motion`.

## Rules

- Keep the synthetic-data notice visible on every screen.
- Never alter the AIID logo; place it only on the dark top bar.
- Score colour only from `strengthOf`; pair every colour with a word or number.
- No dark hover states; no shadows; icons only from `components/Icon.tsx`.
