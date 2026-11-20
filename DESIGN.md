---
name: Sarap
description: Offline expert search for AIID, built as a working app — night sidebar, light workspace, list and profile side by side.
colors:
  night: "#17122b"
  night-2: "#221c3b"
  night-line: "#322a55"
  night-text: "#d4d0e6"
  night-dim: "#a29cc0"
  brand: "#5b3df5"
  brand-hover: "#4a2de6"
  brand-deep: "#4327d4"
  brand-tint: "#eeeaff"
  brand-soft: "#a594ff"
  spark: "#ff8a4c"
  ground: "#f4f3f8"
  surface: "#ffffff"
  sunken: "#f8f7fb"
  line: "#e4e2ec"
  line-strong: "#cfccdb"
  ink: "#17151f"
  ink-2: "#4a4759"
  ink-3: "#67637a"
  medium: "#a86400"
  medium-bar: "#e09a2b"
  weak: "#8a8797"
  free: "#138a5e"
  partial: "#c98a12"
  busy: "#8a8797"
  place: "#1d5a78"
  place-tint: "#e2f0f7"
  cond: "#7d4e00"
  cond-tint: "#fbf0da"
  danger: "#c2381e"
  danger-tint: "#fce7e2"
fonts:
  sans: "Commissioner 400/500/600/700/800 (@fontsource, Cyrillic + Kazakh)"
radius:
  control: 8px
  panel: 12px
---

# Sarap design system

Source of truth for tokens: `web/src/index.css` (`@theme`). This file explains how they are used.

## Idea

Sarap is a tool, not a landing page. The first screen is already the workspace: a query bar, the engine's reading of the query, the ranked list and the selected expert's profile next to it. The jury sees the mechanism working without scrolling.

## Layout

- **Shell** (`components/Shell.tsx`). Desktop (≥1024 px): a 248 px night sidebar with the Sarap | AIID lock-up, the sections (Search, Data, Analytics), the EN/RU/KK switch and the synthetic-data notice. Phone and tablet: a night top bar (lock-up, language, notice) and a bottom tab bar with the sections. The notice is visible on every screen at every width.
- **Search** (`pages/SearchPage.tsx`). A sticky query bar with the industry filter, "hide busy" and quick examples. Below it the readback ("Understood:" tags with result count and time), the view switch (Candidates / Team for the query), then two columns: the result list and the profile pane (sticky). On a phone the profile opens as a full-screen sheet over the list.
- **Idle** state is inside the app: an intro panel (title, catalogue size, three "how it works" points, recent queries) and an examples panel with the formula.
- **Data** and **Analytics** use a page header (h1 + one-line purpose) and white panels on the ground.

## Colour roles

| Role | Token |
| --- | --- |
| Shell (sidebar, mobile bars, accent metric) | `night`, `night-2`, `night-line`, text `night-text` / `night-dim` |
| Primary action, selection, strong match, skill tags | `brand` (fill), `brand-deep` (text), `brand-tint` (background) |
| Logo spark, active-section dot, notice dot | `spark` only; never on text or controls |
| City and industry tags, industry chips | `place` on `place-tint` |
| Conditions (experience, available only), weak-match notice | `cond` on `cond-tint` |
| Excluded terms, errors | `danger` on `danger-tint`; excluded tags are struck through |
| Workspace | `ground` behind, `surface` panels, `sunken` for inner blocks, `line` hairlines |

## Score

`components/Score.tsx`. A number plus a 4 px meter. Colour comes only from `strengthOf` (`lib/format.ts`): ≥70 brand, ≥40 amber (`medium`), below grey (`weak`). The hero size in the profile adds the strength word ("strong / partial / weak match"), so colour is never the only signal and 26% never looks like success. Filter-only queries show years of experience instead of a score.

## Status

`components/Status.tsx`. A mark of different shape plus a word: filled dot (available, `free`), ring (partly available, `partial`), dash (busy, `busy`, and the word is greyed).

## Components

- `ui.tsx`: `Button` (primary / secondary / ghost / positive), `Select`, `Checkbox` (`.check`), `Panel`, `Eyebrow`, `Segmented`, `Skeleton` (`.sk`).
- `Readback.tsx`: parsed query as tags, each with a hidden role label for screen readers.
- `ResultList.tsx`: two groups (Recommended = top 3, More candidates) or one (Closest profiles for a weak match); rows are buttons with `aria-current` on the selected one.
- `ExpertPane.tsx`: label (Best match / Candidate No. n / Closest profile / Similar profile), name, hero score, facts, "Why this expert" with the profile field each reason came from, "Why not them?" (confirmed / missing / constraints from `/explain`), skills with matched ones highlighted, bio, languages, email, feedback, similar experts with a back trail.
- `TeamView.tsx`: members as rows, query terms as columns, covered cells as a tinted round check.
- `Formula.tsx`: one-line formula from `lib/weights.ts`; the explanation opens in a `<details>`.
- `Logo.tsx`: `SarapMark` (an S of two arcs on a brand square with a spark dot; the arcs redraw while searching), `AiidLogo` (the original white AIID logo, unchanged, cropped by viewBox), `Brand` lock-up.

## Type

Commissioner, one family. Headlines 800 with negative tracking (−0.03 em), body 400–500, labels 700 uppercase 12 px with +0.08 em tracking. Every number uses `.tnum`.

## Shape and depth

Controls 8 px radius, panels 12 px. Panels have a 1 px `line` border and a barely visible shadow (`--shadow-panel`); only the query field gets a brand focus ring. No gradients on surfaces.

## Motion

`fade-in` for new results, `sheet-in` for the phone profile sheet, shimmer for skeletons, the mark redraw while loading. All disabled under `prefers-reduced-motion`.

## Rules

- Keep the synthetic-data notice visible on every screen.
- Never alter the AIID logo; place it only on the night shell.
- Score colour only from `strengthOf`; pair every colour with a word or number.
- `spark` is decoration for the brand mark and markers, never for meaning.
- New UI goes inside the shell: no full-bleed hero headers.
