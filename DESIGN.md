---
name: Sarap
description: Offline expert search for AIID — petrol top bar, coral action, teal for strong matches, indigo for place.
colors:
  night: "#0d2b31"
  night-2: "#153b43"
  night-line: "#24525b"
  night-text: "#d5e5e7"
  night-dim: "#9dbcc1"
  action: "#ff6a4d"
  action-hover: "#ff8166"
  action-ink: "#1c0c08"
  brand: "#0e8079"
  brand-hover: "#0b6a64"
  brand-deep: "#0a5f59"
  brand-tint: "#e0f1ef"
  brand-soft: "#7cc8c0"
  ground: "#eef2f2"
  surface: "#ffffff"
  sunken: "#f5f8f8"
  line: "#d9e2e3"
  line-strong: "#bfcccf"
  ink: "#0f1a1d"
  ink-2: "#3f4f54"
  ink-3: "#5c6c71"
  medium: "#a95c00"
  medium-bar: "#f0a020"
  weak: "#73848a"
  free: "#15804f"
  partial: "#c98000"
  busy: "#8c989b"
  place: "#353b99"
  place-tint: "#e8e9f8"
  cond: "#8a5300"
  cond-tint: "#fdf0d8"
  danger: "#b3261e"
  danger-tint: "#fbe7e4"
fonts:
  sans: "Rubik 400/500/600/700 (@fontsource, Cyrillic + Kazakh), tabular figures"
radius:
  control: 8px
  panel: 12px
  query: 16px
---

# Sarap design system

Source of truth for tokens: `web/src/index.css` (`@theme`). This file explains how they are used.

## Idea

Sarap is a working tool with its own voice: a deep petrol shell, one coral for every action, teal for what matched, indigo for place. Two poles (cool petrol, warm coral) carry the contrast; everything else is neutral tinted from petrol. Depth comes from 1 px borders, not shadows. Icons are drawn SVG from one set (`components/Icon.tsx`), never Unicode glyphs.

## Layout

- **Shell** (`components/Shell.tsx`). A sticky navy top bar: the Sarap | AIID lock-up on the left, the sections (Search, Data, Analytics) as centred tabs with a gold underline on the active one, the EN/RU/KK switch on the right. On phones the tabs move to a second row of the bar. Directly under the bar a petrol strip carries the synthetic-data notice with a coral outlined “Demo data” tag, so it is visible on every screen; the phone profile sheet repeats it at its sticky top. Content sits in one centred container (`CONTAINER`, max 1280 px) shared with the bar, so edges line up.
- **Search** (`pages/SearchPage.tsx`). Before the first search: a heading with the catalogue size, the query card (field + button, filters in the card's lower row), example queries as buttons that wrap at their natural width, each with its language tag (RU / KK / EN) — the trilingual claim shown, not told; on hover the button turns petrol with a coral arrow, three "how it works" points in one row (petrol icon tile + text, no cards) and the formula. After a search the heading hides and the query card moves to the top; below it the readback (each tag with an icon: star skill, pin city, factory industry, clock experience, check available, ban excluded) with “New search” on the right, which clears the field and returns to the start screen; the field itself has a clear button ("Understood:" tags, count, time), the view switch (Candidates / Team for the query) and two columns: the result list and the profile pane (sticky under the bar). On a phone the profile opens as a full-screen sheet over the list.
- **Data** and **Analytics** use a page header (h1 + one-line purpose) and white panels in the same container.

## Colour roles

| Role | Token |
| --- | --- |
| Top bar, active segment, icon tiles, example hover | `night`, `night-2`, `night-line`, text `night-text` / `night-dim` |
| Primary action (dark text on coral), active tab underline, logo tile, “Demo data” tag, text selection | `action` / `action-hover`, text `action-ink` |
| Selection, strong match, skill tags, links | `brand` (fill), `brand-deep` (text), `brand-tint` (background) |
| City and industry tags | `place` on `place-tint` |
| Conditions (experience, available only), weak-match notice | `cond` on `cond-tint` |
| Excluded terms, errors, busy as a limit | `danger` on `danger-tint`; excluded tags are struck through |
| Workspace | `ground` behind, `surface` panels, `sunken` inner blocks, `line` borders |
| Avatars | initials on one of five tints, picked by a hash of the name |

## Score

`components/Score.tsx`. In lists a number plus a 6 px meter (a bar compares well down a column; rings do not). In the profile a large number with %, a full-width meter with tick marks at 40 and 70 and the strength word — the scale explains the colour. Colour comes only from `strengthOf` (`lib/format.ts`): ≥70 brand, ≥40 amber (`medium`), below grey (`weak`). The profile adds the strength word ("strong / partial / weak match"), so colour is never the only signal and 26% never looks like success. Filter-only queries show years of experience instead of a score.

## Status

`components/Status.tsx`. A mark of different shape plus a word: filled dot (available, `free`), ring (partly available, `partial`), dash (busy, `busy`, and the word is greyed).

## Components

- `ui.tsx`: `Button` (primary / secondary / ghost / positive), `Select`, `Checkbox` (`.check`), `Panel`, `PanelTitle`, `Segmented`, `Skeleton` (`.sk`).
- `Readback.tsx`: parsed query as tags, each with a hidden role label for screen readers.
- `ResultList.tsx`: two groups (Recommended = top 3, More candidates) or one (Closest profiles for a weak match); rows are buttons with `aria-current` on the selected one (tinted, no side stripe); below the top 3 rows are sorted by percent.
- `ExpertPane.tsx`: name, then a tinted badge (Best match / Candidate No. n / Closest profile / Similar profile), hero score, facts, "Why this expert" (or "What matches the profile" for a weak match) with the profile field each reason came from; city, industry and experience count as reasons only when the query asked for them, busy/partly available is marked as a limit, "Why not them?" (confirmed / missing / constraints from `/explain`), skills with matched ones highlighted, bio, languages, email, feedback, similar experts with a back trail.
- `TeamView.tsx`: members as rows, query terms as columns, covered cells as a tinted round check.
- `Formula.tsx`: one-line formula in a white panel, each operator wraps with its number, from `lib/weights.ts`; the explanation opens in a `<details>`.
- `Avatar.tsx`: initials circle for experts in the list (wide screens) and the profile.
- `Icon.tsx`: the one icon set, 2 px stroke.
- `Logo.tsx`: `SarapMark` (a coral tile with an S of two half-rounds with flat ends — query and expert joined into one line; the line redraws while searching), `AiidLogo` (the original white AIID logo, unchanged, cropped by viewBox), `Brand` lock-up.

## Type

Rubik, one family: its softened corners give the tool a voice without a display face. Headings 600 with −0.02…−0.03 em tracking, names 600, body 400–500. No uppercase eyebrow labels: panel and group titles are sentence-case 15–16 px semibold (`PanelTitle`). Figures are tabular (`.tnum`).

## Shape and depth

Controls 8 px, panels 12 px, the query card 16 px. Panels are separated by 1 px `line` borders, no shadows; the query card gets a teal focus ring.

## Motion

`fade-in` for new results, `sheet-in` for the phone profile sheet, shimmer for skeletons, the S of the mark redrawing while loading. All disabled under `prefers-reduced-motion`.

## Rules

- Keep the synthetic-data notice visible on every screen.
- Never alter the AIID logo; place it only on the petrol top bar.
- Score colour only from `strengthOf`; pair every colour with a word or number.
- `spark` is decoration for the brand mark and markers, never for meaning.
- New UI goes inside the shell: no full-bleed hero headers.
