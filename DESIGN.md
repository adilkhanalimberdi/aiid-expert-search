---
name: Sarap
description: Offline expert search for AIID — navy top bar, light workspace, list and profile side by side.
colors:
  night: "#0e1a2b"
  night-2: "#182a42"
  night-line: "#263b57"
  night-text: "#dbe4ef"
  night-dim: "#9fb0c6"
  brand: "#1a6fe0"
  brand-hover: "#155bc0"
  brand-deep: "#1452b0"
  brand-tint: "#e8f1fe"
  brand-soft: "#7fb2f5"
  spark: "#f2b33d"
  spark-tint: "#fdf4de"
  spark-text: "#7a5300"
  ground: "#f4f6f9"
  surface: "#ffffff"
  sunken: "#f7f9fc"
  line: "#e3e8ef"
  line-strong: "#cbd3de"
  ink: "#0f172a"
  ink-2: "#475569"
  ink-3: "#5f6e84"
  medium: "#b45309"
  medium-bar: "#f59e0b"
  weak: "#7b879a"
  free: "#15803d"
  partial: "#d97706"
  busy: "#8a94a6"
  place: "#0f6b63"
  place-tint: "#e3f4f2"
  cond: "#8a5300"
  cond-tint: "#fdf2dc"
  danger: "#c0362c"
  danger-tint: "#fdeceb"
fonts:
  sans: "Onest 400/500/600/700 (@fontsource, Cyrillic + Kazakh)"
radius:
  control: 8px
  panel: 12px
  query: 16px
---

# Sarap design system

Source of truth for tokens: `web/src/index.css` (`@theme`). This file explains how they are used.

## Idea

Sarap is a tool, not a landing page: a calm navy-and-white working app with one blue for action and a little gold for identity. After a search the first screen shows the query, the engine's reading of it, the ranked list and the selected expert's profile side by side.

## Layout

- **Shell** (`components/Shell.tsx`). A sticky navy top bar: the Sarap | AIID lock-up on the left, the sections (Search, Data, Analytics) as centred tabs with a gold underline on the active one, the EN/RU/KK switch on the right. On phones the tabs move to a second row of the bar. Directly under the bar a thin dark strip with a gold dot carries the synthetic-data notice, so it is visible on every screen; the phone profile sheet repeats it at its sticky top. Content sits in one centred container (`CONTAINER`, max 1280 px) shared with the bar, so edges line up.
- **Search** (`pages/SearchPage.tsx`). Before the first search: a heading with the catalogue size, the query card (field + button, filters in the card's lower row), example queries as buttons that wrap at their natural width, three "how it works" points in one row (icon + text, no cards) and the formula. After a search the heading hides and the query card moves to the top; below it the readback ("Understood:" tags, count, time), the view switch (Candidates / Team for the query) and two columns: the result list and the profile pane (sticky under the bar). On a phone the profile opens as a full-screen sheet over the list.
- **Data** and **Analytics** use a page header (h1 + one-line purpose) and white panels in the same container.

## Colour roles

| Role | Token |
| --- | --- |
| Top bar, accent metric | `night`, `night-2`, `night-line`, text `night-text` / `night-dim` |
| Primary action, selection, strong match, skill tags | `brand` (fill), `brand-deep` (text), `brand-tint` (background) |
| Active tab underline and icon, mark circle, notice dot | `spark` |
| City and industry tags, industry chips | `place` on `place-tint` |
| Conditions (experience, available only), weak-match notice | `cond` on `cond-tint` |
| Excluded terms, errors | `danger` on `danger-tint`; excluded tags are struck through |
| Workspace | `ground` behind, `surface` panels, `sunken` for inner blocks, `line` hairlines |

## Score

`components/Score.tsx`. In lists a number plus a 6 px meter; in the profile a large number with % , a full-width meter and the strength word under it (no ring). Colour comes only from `strengthOf` (`lib/format.ts`): ≥70 brand, ≥40 amber (`medium`), below grey (`weak`). The profile adds the strength word ("strong / partial / weak match"), so colour is never the only signal and 26% never looks like success. Filter-only queries show years of experience instead of a score.

## Status

`components/Status.tsx`. A mark of different shape plus a word: filled dot (available, `free`), ring (partly available, `partial`), dash (busy, `busy`, and the word is greyed).

## Components

- `ui.tsx`: `Button` (primary / secondary / ghost / positive), `Select`, `Checkbox` (`.check`), `Panel`, `PanelTitle`, `Segmented`, `Skeleton` (`.sk`).
- `Readback.tsx`: parsed query as tags, each with a hidden role label for screen readers.
- `ResultList.tsx`: two groups (Recommended = top 3, More candidates) or one (Closest profiles for a weak match); rows are buttons with `aria-current` on the selected one (tinted, no side stripe); below the top 3 rows are sorted by percent.
- `ExpertPane.tsx`: name, then a tinted badge (Best match / Candidate No. n / Closest profile / Similar profile), hero score, facts, "Why this expert" (or "What matches the profile" for a weak match) with the profile field each reason came from; city, industry and experience count as reasons only when the query asked for them, busy/partly available is marked as a limit, "Why not them?" (confirmed / missing / constraints from `/explain`), skills with matched ones highlighted, bio, languages, email, feedback, similar experts with a back trail.
- `TeamView.tsx`: members as rows, query terms as columns, covered cells as a tinted round check.
- `Formula.tsx`: one-line formula in a white panel, each operator wraps with its number, from `lib/weights.ts`; the explanation opens in a `<details>`.
- `Logo.tsx`: `SarapMark` (a blue tile with two circles on the diagonal, query and expert in gold; the white lens where they overlap is the match and pulses while searching), `AiidLogo` (the original white AIID logo, unchanged, cropped by viewBox), `Brand` lock-up.

## Type

Onest, one family. Headings 600 with negative tracking (−0.025…−0.03 em), names 700, body 400–500. No uppercase eyebrow labels: panel and group titles are sentence-case 15–16 px semibold (`PanelTitle`). Figures are proportional lining (`.tnum`): Onest's tabular "1" is too wide, so numeric columns align by edge instead.

## Shape and depth

Controls 8 px, panels 12 px, the query card 16 px. Panels have a 1 px `line` border and a barely visible shadow (`--shadow-panel`); only the query field gets a brand focus ring. No gradients on surfaces.

## Motion

`fade-in` for new results, `sheet-in` for the phone profile sheet, shimmer for skeletons, the pulsing lens of the mark while loading. All disabled under `prefers-reduced-motion`.

## Rules

- Keep the synthetic-data notice visible on every screen.
- Never alter the AIID logo; place it only on the navy top bar.
- Score colour only from `strengthOf`; pair every colour with a word or number.
- `spark` is decoration for the brand mark and markers, never for meaning.
- New UI goes inside the shell: no full-bleed hero headers.
